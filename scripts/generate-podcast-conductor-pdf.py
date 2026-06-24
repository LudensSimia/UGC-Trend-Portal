#!/usr/bin/env python3
import argparse
import json
import re
import unicodedata
from datetime import datetime, timezone
from urllib.request import urlopen

from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import inch
from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
    PageBreak,
)


API_URL = "http://localhost:3000/api/dashboard/data"


def clean(value):
    text = str(value or "")
    text = unicodedata.normalize("NFKD", text)
    text = text.encode("latin-1", "ignore").decode("latin-1")
    text = re.sub(r"\s+", " ", text).strip()
    return text or "N/A"


def format_number(value):
    try:
        number = float(value or 0)
    except (TypeError, ValueError):
        number = 0
    sign = "-" if number < 0 else ""
    absolute = abs(number)
    if absolute >= 1_000_000:
        return f"{sign}{absolute / 1_000_000:.1f}M"
    if absolute >= 1_000:
        return f"{sign}{absolute / 1_000:.1f}K"
    return f"{int(number)}"


def snapshot_date_key(value):
    return str(value or "")[:10]


def get_daily_roblox_snapshots(snapshots):
    by_date = {}
    for snapshot in snapshots or []:
        date_key = snapshot_date_key(snapshot.get("snapshot_date") or snapshot.get("created_at"))
        if not date_key:
            continue
        existing = by_date.get(date_key)
        current_players = snapshot.get("current_players") or 0
        existing_players = (existing or {}).get("current_players") or -1
        is_better_player_sample = current_players > existing_players
        is_newer_sample = (
            current_players == existing_players
            and str(snapshot.get("created_at") or "") > str((existing or {}).get("created_at") or "")
        )
        if existing is None or is_better_player_sample or is_newer_sample:
            normalized = dict(snapshot)
            normalized["snapshot_date"] = snapshot.get("snapshot_date") or date_key
            by_date[date_key] = normalized
    return sorted(
        by_date.values(),
        key=lambda row: str(row.get("snapshot_date") or row.get("created_at") or ""),
    )


def latest_roblox_players(game):
    snapshots = get_daily_roblox_snapshots(game.get("roblox_chart_snapshots") or [])
    latest_snapshot = next(
        (
            snapshot
            for snapshot in reversed(snapshots)
            if isinstance(snapshot.get("current_players"), (int, float))
        ),
        None,
    )
    if latest_snapshot:
        return latest_snapshot["current_players"]

    metrics = sorted(
        game.get("game_metrics") or [],
        key=lambda row: str(row.get("date") or ""),
    )
    latest_metric = next(
        (
            metric
            for metric in reversed(metrics)
            if isinstance(metric.get("current_players"), (int, float))
        ),
        None,
    )
    return latest_metric["current_players"] if latest_metric else 0


def roblox_gain_percent(game):
    snapshots = get_daily_roblox_snapshots(game.get("roblox_chart_snapshots") or [])
    values = [
        row.get("current_players")
        for row in snapshots
        if isinstance(row.get("current_players"), (int, float))
    ]
    if len(values) < 2 or values[0] == 0:
        return 0
    return round(((values[-1] - values[0]) / values[0]) * 100)


def roblox_rank_gain(game):
    snapshots = get_daily_roblox_snapshots(game.get("roblox_chart_snapshots") or [])
    earliest_ranked = next(
        (snapshot for snapshot in snapshots if isinstance(snapshot.get("chart_rank"), (int, float))),
        None,
    )
    latest = snapshots[-1] if snapshots else None
    if not earliest_ranked or not latest or not isinstance(latest.get("chart_rank"), (int, float)):
        return 0
    return int(earliest_ranked["chart_rank"] - latest["chart_rank"])


def build_genre_scoreboard(games):
    totals = {}
    for game in games:
        genre = clean(game.get("inferred_genre") or game.get("genre") or "Unclassified")
        totals[genre] = totals.get(genre, 0) + latest_roblox_players(game)
    total = sum(totals.values()) or 1
    return [
        {"genre": genre, "players": players, "share": round((players / total) * 100)}
        for genre, players in sorted(totals.items(), key=lambda item: item[1], reverse=True)[:3]
    ]


def latest_nonempty_snapshot_coverage(platform, items):
    counts = {}
    for index, item in enumerate(items):
        item_key = clean(
            item.get("id")
            or item.get("game_id")
            or item.get("universe_id")
            or item.get("island_code")
            or index
        )
        snapshots = (
            item.get("roblox_chart_snapshots")
            if platform == "roblox"
            else item.get("snapshots")
        ) or []
        for snapshot in snapshots:
            date_key = snapshot_date_key(
                snapshot.get("snapshot_date") or snapshot.get("created_at")
            )
            if not date_key:
                continue
            counts.setdefault(date_key, set()).add(item_key)
    if not counts:
        return {"date": "", "count": len(items)}
    latest_date = sorted(counts.keys())[-1]
    return {"date": latest_date, "count": len(counts[latest_date])}


def first_label(island):
    tags = island.get("extracted_tags") or island.get("raw_latest", {}).get("tags") or []
    return clean(tags[0]) if tags else "Unlabeled"


def normalize_fortnite_islands(islands):
    normalized = []
    for island in islands:
        snapshots = sorted(
            island.get("fortnite_island_snapshots") or island.get("snapshots") or [],
            key=lambda row: str(row.get("created_at") or ""),
        )
        row = dict(island)
        row["snapshots"] = snapshots
        row["raw"] = island.get("raw_latest") or (snapshots[-1].get("raw_payload") if snapshots else {}) or {}
        normalized.append(row)
    return normalized


def available_fortnite_date_keys(islands):
    keys = {
        snapshot_date_key(snapshot.get("created_at"))
        for island in islands
        for snapshot in island.get("snapshots", [])
        if snapshot_date_key(snapshot.get("created_at"))
    }
    return sorted(keys)


def fortnite_snapshot_date_counts(islands):
    return [
        (
            date_key,
            sum(
                1
                for island in islands
                if any(
                    str(snapshot.get("created_at") or "").startswith(date_key)
                    for snapshot in island.get("snapshots", [])
                )
            ),
        )
        for date_key in available_fortnite_date_keys(islands)
    ]


def fortnite_substantial_date_keys(islands):
    counts = fortnite_snapshot_date_counts(islands)
    substantial = [date_key for date_key, count in counts if count >= 25]
    if substantial:
        return substantial
    fallback = sorted(counts, key=lambda row: row[1], reverse=True)
    return [fallback[0][0]] if fallback else []


def fortnite_islands_for_latest_label_widget(islands):
    latest_date = (fortnite_substantial_date_keys(islands) or [""])[-1]
    if not latest_date:
        return islands
    return [
        island
        for island in islands
        if any(
            str(snapshot.get("created_at") or "").startswith(latest_date)
            for snapshot in island.get("snapshots", [])
        )
    ]


def fortnite_islands_for_snapshot_window(islands, days=7):
    date_keys = fortnite_substantial_date_keys(islands) or available_fortnite_date_keys(islands)
    latest_key = date_keys[-1] if date_keys else ""
    if not latest_key:
        return fortnite_islands_for_latest_label_widget(islands)
    latest_date = datetime.strptime(latest_key, "%Y-%m-%d").date()
    start_date = latest_date.toordinal() - days + 1
    filtered = []
    for island in islands:
        for snapshot in island.get("snapshots", []):
            date_key = snapshot_date_key(snapshot.get("created_at"))
            if not date_key:
                continue
            snapshot_day = datetime.strptime(date_key, "%Y-%m-%d").date().toordinal()
            if start_date <= snapshot_day <= latest_date.toordinal():
                filtered.append(island)
                break
    return filtered or fortnite_islands_for_latest_label_widget(islands)


IP_PATTERNS = [
    ("Star Wars", re.compile(r"star\s*wars", re.I)),
    ("Marvel", re.compile(r"marvel", re.I)),
    ("Disney", re.compile(r"disney", re.I)),
    ("TMNT", re.compile(r"tmnt|teenage mutant ninja", re.I)),
    ("LEGO", re.compile(r"lego", re.I)),
    ("Dragon Ball", re.compile(r"dragon\s*ball", re.I)),
    ("Naruto", re.compile(r"naruto", re.I)),
    ("One Piece", re.compile(r"one\s*piece", re.I)),
    ("Sports IP", re.compile(r"nfl|nba|fifa|ufc", re.I)),
]


def fortnite_ip_signals(islands):
    counts = {}
    examples = {}
    for island in islands:
        text = " ".join(
            [
                str(island.get("title") or ""),
                str(island.get("description") or ""),
                " ".join(island.get("extracted_tags") or []),
            ]
        )
        island_key = clean(island.get("island_code") or island.get("title") or island.get("id"))
        for label, pattern in IP_PATTERNS:
            if pattern.search(text):
                counts.setdefault(label, set()).add(island_key)
                examples.setdefault(label, clean(island.get("title")))
    return [
        {"label": label, "count": len(keys), "example": examples.get(label, "N/A")}
        for label, keys in sorted(counts.items(), key=lambda item: len(item[1]), reverse=True)[:3]
    ]


def format_list(items):
    if not items:
        return "no clear entries"
    if len(items) == 1:
        return items[0]
    if len(items) == 2:
        return f"{items[0]} and {items[1]}"
    return f"{', '.join(items[:-1])}, and {items[-1]}"


def build_complete_transcript(
    episode_date,
    top_game,
    top_roblox,
    genre_rows,
    movers,
    rank_movers,
    losses,
    fortnite_labels,
    ip_rows,
    strongest_genre,
    roblox_coverage,
    fortnite_coverage,
    quality,
):
    top_game_name = clean(top_game.get("title")) if top_game else "the leading captured experience"
    top_game_players = format_number(latest_roblox_players(top_game)) if top_game else "N/A"
    top_five_spoken = format_list(
        [
            f"number {index + 1}, {clean(game.get('title'))}, at "
            f"{format_number(latest_roblox_players(game))} captured players"
            for index, game in enumerate(top_roblox)
        ]
    )
    genre_spoken = format_list(
        [
            f"{row['genre']}, representing about {row['share']}% of tracked players"
            for row in genre_rows[:3]
        ]
    )
    label_spoken = format_list(
        [
            f"{label}, appearing on {format_number(count)} islands"
            for label, count in fortnite_labels
        ]
    )
    ip_spoken = (
        format_list(
            [
                f"{row['label']}, detected across {format_number(row['count'])} unique islands"
                for row in ip_rows[:3]
            ]
        )
        if ip_rows
        else "no clear collaboration pattern in the current imported window"
    )
    player_gain = clean(movers[0].get("title")) if movers else "not clear enough to call"
    position_gain = (
        clean(rank_movers[0].get("title"))
        if rank_movers and roblox_rank_gain(rank_movers[0]) > 0
        else "not clear enough to call"
    )
    player_loss = clean(losses[0].get("title")) if losses else "not clear enough to call"
    latest_quality = clean(quality[0].get("created_at")) if quality else "not available"

    sections = [
        (
            "Opening",
            f"""Welcome all, we are {episode_date}. Let's review the Snoutboard.

[Pause. Keep the Roblox overview visible.]

Today, we are going to take a calm walk through the dashboard and look at what the current signals may be telling us. This is not a magic answer machine, and it is not a guarantee that one particular idea will succeed. What it can do is help us slow down, look at the market with more structure, and ask better questions before a creator commits months of work to a project.

The first thing I am noticing on the Roblox side is {top_game_name}. In the current dashboard view, it is showing {top_game_players} captured players. That is our largest visible Roblox player signal at this moment. The tempting reaction is to ask how to make something exactly like it. The more useful question is what promise this experience makes to a player, and why that promise is so easy to understand.

[Pause and look at the Top 5 Most Played Games card.]

That distinction will guide the episode. We are not searching for a title to copy. We are searching for useful patterns: recognizable fantasies, clear loops, strong presentation, and reasons for players to return. Attention shows that something is connecting. It does not prove that the same idea will work for somebody else.""",
        ),
        (
            "Roblox market pulse",
            f"""[Scroll through the Top 5 Most Played Games.]

Let us start with the visible market pulse. The current five entries are {top_five_spoken}.

Even when these experiences share a large audience, they do not necessarily make the same promise. Some may offer identity and social play. Others may offer progression, competition, collection, mastery, or a direct fantasy that can be understood from a thumbnail and a few words.

When I read this card, I imagine that I am a player seeing each experience for the first time. What do I understand in two seconds? Do I know what I am going to do? Do I know what I might earn, become, collect, or prove? Do I have a reason to believe another player will be there with me?

[Scroll to Most Played Genre Mix Estimated.]

The three largest current genre signals are {genre_spoken}. These are estimated groupings where source taxonomy is incomplete, so the percentages should not be treated as perfect borders around the market. They are a way of organizing captured activity.

If one genre carries a large share of tracked players, it tells us where attention is concentrated in this snapshot. It does not tell us that the genre is easy to enter. A large category can be attractive and crowded at the same time. The useful question is whether the audience is responding to the broad genre or to a more specific mechanic inside it. A creator may not need another broad version of the leading category. They may need one familiar mechanic combined with a different fantasy, pace, or social structure.""",
        ),
        (
            "Average format and movement",
            f"""[Scroll to the Fictional Roblox Experience Archetypes.]

The fictional archetypes give us reference points rather than recommendations. Remember that an average and a median are not the same thing. The average mixes values together and describes a center of gravity. The median is closer to the middle observed entry. An average profile may not exist as a real experience, but it can reveal what the current dataset tends to emphasize.

If {strongest_genre} is the strongest visible genre direction, the creator question becomes: what should remain familiar so the concept is understandable, and what should change so it does not disappear into the crowd?

[Scroll back to Trending Games.]

Now let us separate size from movement. The current player-gain prompt is {player_gain}. The position-gain prompt is {position_gain}. The player-loss prompt is {player_loss}.

[Pause.]

A large experience and a fast-moving experience are not necessarily the same thing. One signal describes scale. The other describes change. A sudden gain may reflect an update, promotion, social moment, collaboration, or snapshot timing. A loss can be temporary for many of the same reasons.

I would not call these predictions. I would call them investigation leads. If a title moves sharply, look at what changed. Look at its thumbnail, update language, game loop, social conversation, and timing. The number tells us where to look. It does not tell us the whole story.""",
        ),
        (
            "Activity over time",
            """[Open Most Played Games Over Time, then Player Activity Landscape.]

The over-time view helps us avoid becoming trapped by one snapshot. A captured moment is useful, but it can also be noisy. The better question is whether a signal persists across several captures.

I watch for durability, acceleration, and separation. Does an experience remain visible over multiple days? Is its captured player count moving consistently, or is this one spike? Is the leading group pulling away from the rest, or is the field becoming more competitive?

The Player Activity Landscape gives us another view. Rectangle size represents captured activity for the selected window, while color shows stored gain or loss. Today, seven days, and month are different lenses, not interchangeable answers.

[Switch between Today, 7D, and Month. Pause briefly on each.]

Today gives immediacy. Seven days gives a short pattern. A month gives broader context, although the available history may be shorter than the requested window. These are point-in-time snapshots, so we are not observing every player who came and went between captures.

That limitation changes the claim we can make. We can say the stored snapshots show a pattern. We should not say that we captured every fluctuation in the market.""",
        ),
        (
            "Fortnite metadata signals",
            f"""[Switch to the Fortnite page and open Primary Label Usage Over Time.]

The Fortnite side needs a different reading style. We do not treat imported source order as a reliable popularity ranking. The useful material is metadata: labels, descriptions, formats, collaboration references, and how islands position themselves.

The most repeated captured labels are {label_spoken}. I see these as packaging signals. They tell us which words and format descriptions appear repeatedly in the imported set. They do not prove which island has the strongest retention or largest audience.

Packaging and performance are related, but they are not identical. A label can help a player understand an island. It cannot tell us by itself whether that player stayed, returned, or recommended it.

[Scroll to IP / Collaboration Signals.]

The current IP and collaboration watch shows {ip_spoken}. This view deduplicates islands within the selected window, so the same island appearing on several days should not become a new collaboration example every day.

Large intellectual properties create recognition, but recognition is not a durable game loop. The creator question is how an island translates a recognizable world into an action the player wants to repeat. Look at the first promise in the description. Is the core action clear? Does the language lead with fantasy, competition, progression, or social identity? Those are useful lessons even without using somebody else's intellectual property.""",
        ),
        (
            "Turning research into a concept",
            f"""[Return to Roblox and scroll to My Game Idea Is.]

Now we reach the practical part. The goal is not to press a button and receive a guaranteed winning game. The goal is to compare a concept with the captured dataset and make the idea more specific.

If {strongest_genre} carries the strongest current genre signal, do not stop at that broad label. Look one level deeper. Which subgenre mechanics are represented? Which are crowded? Which have activity but fewer visible examples? Which mechanics fit the strengths of the team that would actually build the game?

[Select a genre and subgenre, then look at Design Cues, Research Signal, and Warnings.]

The Design Cues translate a category into practical questions. What does the player do repeatedly? What creates progress? What gives status? What makes a short session satisfying?

The Warnings are just as important. Low representation can mean an underexplored space, but it can also mean weak demand, difficult production, poor discoverability, or incomplete classification. A sparse category is not automatically an opportunity.

[Open the Game Template Generator.]

The template generator should come after the research. It is a creative prompt built from visible patterns. Use it to start a brief, then challenge every part of that brief. Is the title understandable? Is the fantasy distinct? Is the loop realistic to produce? Does the concept have one strong visual promise? Can the reason to return be described in one sentence?

The strongest use of this dashboard is not certainty. It is discipline. It moves the conversation from a vague idea to an audience signal, a familiar mechanic, a creative difference, and a risk that still needs testing.""",
        ),
        (
            "Transparency and close",
            f"""[Return briefly to Data Source & Health.]

Before we finish, I want to pause on transparency. The current Roblox source coverage is {format_number(roblox_coverage['count'])} records in the latest non-empty loaded view, and Fortnite coverage is {format_number(fortnite_coverage['count'])} records. The latest data-quality snapshot available to this dashboard is {latest_quality}.

Some fields come directly from captured source responses. Other fields are processed, normalized, or estimated when source data is partial. That is why the dashboard uses words such as captured, stored, processed, and estimated.

[Pause.]

Those qualifications do not weaken the research. They make it more honest. Good analysis tells us what the data suggests and what it cannot prove.

My takeaway today is this: study the player promise behind {top_game_name}, use {strongest_genre} as a starting point rather than a command, watch movement separately from total size, and treat Fortnite labels and collaboration references as positioning clues rather than popularity scores.

Then reduce one concept to three things: one recognizable format, one mechanic worth repeating, and one visual promise a player understands immediately. That gives you something concrete to research, prototype, and test.

Thanks you all for the support. As always, if you want to book a meeting with us, go to our website and schedule a review session.""",
        ),
    ]
    transcript_text = "\n\n".join(text for _, text in sections)
    spoken_text = re.sub(r"\[[^\]]+\]", "", transcript_text)
    word_count = len(re.findall(r"\b[\w'-]+\b", spoken_text))
    return {
        "sections": [{"title": title, "text": text} for title, text in sections],
        "word_count": word_count,
        "estimated_minutes": max(1, round(word_count / 128)),
    }


def build_conductor(data):
    roblox = data.get("roblox") or []
    fortnite = normalize_fortnite_islands(data.get("fortnite") or [])
    quality = sorted(
        data.get("dataQualitySnapshots") or [],
        key=lambda row: str(row.get("created_at") or ""),
        reverse=True,
    )
    sorted_roblox = sorted(roblox, key=latest_roblox_players, reverse=True)
    top_roblox = sorted_roblox[:5]
    genre_rows = build_genre_scoreboard(sorted_roblox[:25])
    movers = sorted(roblox, key=roblox_gain_percent, reverse=True)
    rank_movers = sorted(roblox, key=roblox_rank_gain, reverse=True)
    losses = sorted(roblox, key=roblox_gain_percent)
    label_counts = {}
    latest_fortnite_islands = fortnite_islands_for_latest_label_widget(fortnite)
    ip_window_fortnite_islands = fortnite_islands_for_snapshot_window(fortnite, 7)
    for island in latest_fortnite_islands:
        label = first_label(island)
        label_counts[label] = label_counts.get(label, 0) + 1
    fortnite_labels = sorted(label_counts.items(), key=lambda item: item[1], reverse=True)[:5]
    ip_rows = fortnite_ip_signals(ip_window_fortnite_islands)

    top_game = top_roblox[0] if top_roblox else {}
    strongest_genre = genre_rows[0]["genre"] if genre_rows else "the strongest visible genre"
    strongest_label = fortnite_labels[0][0] if fortnite_labels else "not clear enough to call"
    roblox_coverage = latest_nonempty_snapshot_coverage("roblox", roblox)
    fortnite_coverage = latest_nonempty_snapshot_coverage("fortnite", fortnite)
    top_game_line = f"{clean(top_game.get('title'))}, with {format_number(latest_roblox_players(top_game))} captured players"
    top_roblox_list = format_list(
        [
            f"{index + 1}. {clean(game.get('title'))}, with {format_number(latest_roblox_players(game))} players"
            for index, game in enumerate(top_roblox)
        ]
    )
    generated_at = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
    strongest_roblox_clip = (
        f"Clip A - Market pulse: open with {clean(top_game.get('title'))} at "
        f"{format_number(latest_roblox_players(top_game))} captured players, then pivot to "
        '"attention is not opportunity."'
    )
    creator_takeaway_clip = (
        f"Clip B - Creator takeaway: {strongest_genre} is the strongest genre signal, "
        "but the useful lesson is to study subgenre mechanics instead of copying the surface theme."
    )
    transparency_clip = (
        "Clip C - Trust beat: explain that the dashboard uses stored snapshots and processed fields, "
        "so it is a research tool, not a guarantee of success."
    )
    episode_date = datetime.now().strftime("%B %-d, %Y")
    transcript = build_complete_transcript(
        episode_date,
        top_game,
        top_roblox,
        genre_rows,
        movers,
        rank_movers,
        losses,
        fortnite_labels,
        ip_rows,
        strongest_genre,
        roblox_coverage,
        fortnite_coverage,
        quality,
    )

    return {
        "generated_at": generated_at,
        "transcript": transcript,
        "summary": [
            ("Episode length", "15 min", "Structured as a host conductor, not a word-for-word legal or business script."),
            (
                "Roblox source set",
                format_number(roblox_coverage["count"]),
                f"Latest non-empty snapshot coverage: {roblox_coverage['date'] or 'N/A'}.",
            ),
            (
                "Fortnite source set",
                format_number(fortnite_coverage["count"]),
                f"Latest non-empty snapshot coverage: {fortnite_coverage['date'] or 'N/A'}.",
            ),
        ],
        "sections": [
            {
                "time": "0:00 - 1:00",
                "title": "Cold open",
                "role": "Hook",
                "tools": "Top 5 Most Played Games, Data Source & Health, Player Activity Landscape",
                "copy": f"[Start on the Roblox page. Keep the Top 5 Most Played Games visible.] Today I want to look at the market from the creator's side: not as a promise of what will work, but as a way to ask better questions before building. The biggest captured Roblox signal right now is {top_game_line}. The question for this episode is simple: what does today's data suggest creators should study before they commit to a new idea?",
                "clip": strongest_roblox_clip,
                "notes": [
                    "[Glance at Data Source & Health before you start reading numbers.]",
                    f"If you want a quick thesis line, say: {strongest_genre} is the genre signal I want to keep testing today.",
                    "Say once, early: this is independent creative research, not official platform guidance or a success guarantee.",
                ],
                "reflection": "Something to reflect on is the difference between attention and opportunity: a large audience signal shows where players are gathering, but it does not automatically reveal what a new creator should build.",
            },
            {
                "time": "1:00 - 4:00",
                "title": "Roblox market pulse",
                "role": "Data tour",
                "tools": "Top 5 Most Played Games, Most Played Genre Mix Estimated, Fictional Roblox Experience Archetypes",
                "copy": f"[Stay on Roblox. Start with Top 5 Most Played Games, then scroll to Most Played Genre Mix Estimated.] The first pass is the market pulse: where are players visibly concentrated right now? The top captured experiences are {top_roblox_list}. I do not want to treat this as a list of games to copy. I want to treat it as a list of player promises to study: what is the fantasy, what is the loop, and how quickly does the player understand why they should click?",
                "clip": "Good secondary clip if the top-five list has a surprising mix: frame it as 'study the player promise, not the game title.'",
                "notes": [
                    "[Scroll down to Most Played Genre Mix Estimated.]",
                    "Largest genre signals: " + format_list([f"{row['genre']} at {row['share']}% of tracked players" for row in genre_rows]) + ".",
                    "[Scroll down to the Fictional Roblox Experience Archetypes row.]",
                ],
                "reflection": "Remember that a median profile is different from an average profile: the median shows a middle example, while the average blends the dataset into a composite that may not exist as a real game.",
            },
            {
                "time": "4:00 - 7:00",
                "title": "Movement watch",
                "role": "Momentum",
                "tools": "Trending Games, Most Played Games Over Time, Player Activity Landscape",
                "copy": f"[Scroll back to Trending Games, then open Most Played Games Over Time.] Now I want to separate size from movement. A game can be huge and slowing down, or smaller and moving quickly. The movement panel gives me three useful prompts today: {clean(movers[0].get('title')) if movers else 'no clear entry'} for player gain, {clean(rank_movers[0].get('title')) if rank_movers and roblox_rank_gain(rank_movers[0]) > 0 else 'no clear entry'} for position gain, and {clean(losses[0].get('title')) if losses else 'no clear entry'} for player loss. I would present these as research leads, not forecasts. The job is to ask why the audience is moving, not to pretend we already know where they will go next.",
                "clip": "Strong short-form candidate when there is a clear mover: contrast a large game with a fast-moving game and say, 'size and momentum are not the same signal.'",
                "notes": [
                    f"Player gain: {clean(movers[0].get('title')) if movers else 'N/A'} ({roblox_gain_percent(movers[0]) if movers else 0}%).",
                    f"Position gain: {clean(rank_movers[0].get('title')) if rank_movers and roblox_rank_gain(rank_movers[0]) > 0 else 'N/A'} (+{roblox_rank_gain(rank_movers[0]) if rank_movers and roblox_rank_gain(rank_movers[0]) > 0 else 0} spots).",
                    f"Player loss: {clean(losses[0].get('title')) if losses else 'N/A'} ({roblox_gain_percent(losses[0]) if losses else 0}%).",
                    "[Open Player Activity Landscape and switch between Today, 7D, and Month if you want a visual beat.]",
                ],
                "reflection": "Something to reflect on is momentum versus durability: a spike can reveal curiosity, but sustained activity is what usually deserves deeper design study.",
            },
            {
                "time": "7:00 - 10:00",
                "title": "Fortnite creator signals",
                "role": "Metadata read",
                "tools": "Primary Label Usage Over Time, IP / Collaboration Signals, Latest Imported Fortnite Islands",
                "copy": f"[Switch to the Fortnite page. Start on Primary Label Usage Over Time.] The Fortnite side needs a different tone. I am not reading this as a popularity chart; I am reading it as metadata, packaging, and positioning. The strongest captured label signal right now is {strongest_label}, and that tells me what kind of language or format is showing up repeatedly in the imported island set. [Scroll down to IP / Collaboration Signals.] If an IP or collaboration signal appears, I would treat it as a theme watchlist, not as proof of demand.",
                "clip": f"Potential Fortnite clip: {strongest_label} is a packaging signal to watch, not proof of popularity.",
                "notes": [
                    "Most repeated captured labels: " + format_list([f"{label} ({format_number(count)} islands)" for label, count in fortnite_labels]) + ".",
                    "[Scroll down to Latest Imported Fortnite Islands if you want one concrete example to mention.]",
                    "IP and collaboration watch: " + format_list([f"{row['label']} appears across {format_number(row['count'])} unique islands" for row in ip_rows]) + ".",
                ],
                "reflection": "Remember that labels describe how an island is packaged, not necessarily why players stay. A strong label can suggest positioning, but it should be paired with design and retention questions.",
            },
            {
                "time": "10:00 - 12:30",
                "title": "Creator takeaway",
                "role": "Synthesis",
                "tools": "My Game Idea Is, Game Template Generator, Research Signal / Design Cues / Warnings",
                "copy": f"[Scroll down to My Game Idea Is. Then move to the Design Cues card on the right.] This is the practical part of the episode. If I were a creator using this dashboard, I would not ask, 'What should I copy?' I would ask, 'What format is already familiar to players, and what twist could make it feel worth clicking?' For today, {strongest_genre} is the biggest genre signal I would keep in mind, but I would use the subgenre and design cues to avoid staying too broad. [Scroll down to the Example Card or suggested games if you want a concrete reference point.]",
                "clip": creator_takeaway_clip,
                "notes": [
                    f"If a creator wants to play near demand, start by studying {strongest_genre}, then look one level deeper at subgenre mechanics rather than copying the surface theme.",
                    f"On Fortnite, {strongest_label} is the label to watch because it is the most repeated captured primary label.",
                    "[Open Game Template Generator only after you have explained the signal. Let it feel like an application of the readout, not the source of truth.]",
                ],
                "reflection": "Something to reflect on is that a good creative brief should combine familiar structure with a fresh promise. Familiarity helps players understand the game quickly; novelty gives them a reason to care.",
            },
            {
                "time": "12:30 - 14:00",
                "title": "Data transparency note",
                "role": "Trust",
                "tools": "Data Source & Health, Glossary, Terms of Service",
                "copy": "[Return briefly to Data Source & Health.] Before wrapping, I want to be clear about the limits. This dashboard is based on stored snapshots and processed fields. Some information comes directly from source responses, and some classification is estimated when the source data is incomplete. That does not make the dashboard useless; it makes it a research tool. The value is in using the signals to ask better questions, then validating before building.",
                "clip": transparency_clip,
                "notes": [
                    f"Latest data quality snapshot available in the app: {clean(quality[0].get('created_at')) if quality else 'not available'}.",
                    "[If the Glossary is needed, open it only for one definition. Do not let the show become a product manual.]",
                    "Say this plainly: useful signal, not official data advice, and not a guarantee of success.",
                ],
                "reflection": "Remember that transparency increases trust: saying what the data can and cannot prove makes the analysis more credible, not weaker.",
            },
            {
                "time": "14:00 - 15:00",
                "title": "Patreon episode close",
                "role": "Close + clips",
                "tools": "Podcast Conductor, Dashboard Readouts, Clip Candidates",
                "copy": "[Close the dashboard or leave the main readout visible.] This episode is the Patreon product: a guided research walkthrough designed to save creators time and help them think with more structure. I am not selling raw data, and I am not publishing the full analysis outside Patreon. The only public-facing pieces I plan to pull from this episode are three short clips: one market pulse, one creator takeaway, and one data transparency reminder. My closing prompt for members is simple: choose one format, one mechanic, and one visual promise, then research those before you build.",
                "clip": "Do not clip this as a standalone ad unless needed. Use it as the internal checklist for selecting the three public excerpts.",
                "notes": [
                    "Clip candidate 1: the strongest current Roblox signal.",
                    "Clip candidate 2: the difference between median and average.",
                    "Clip candidate 3: transparency, limits, and why this is not a guarantee of success.",
                    "[Do not frame this as a public podcast with a paid upgrade.]",
                ],
                "reflection": "Something to reflect on is the paid product itself: the value is guided interpretation and research discipline, while clips are short excerpts that point people toward the full Patreon episode.",
            },
        ],
    }


def add_footer(canvas, doc):
    canvas.saveState()
    canvas.setFont("Helvetica", 8)
    canvas.setFillColor(colors.HexColor("#94a3b8"))
    canvas.drawString(inch, 0.45 * inch, "Snoutboard Podcast Conductor - internal production notes")
    canvas.drawRightString(7.5 * inch, 0.45 * inch, f"Page {doc.page}")
    canvas.restoreState()


def build_pdf(conductor, output_path):
    doc = SimpleDocTemplate(
        output_path,
        pagesize=letter,
        rightMargin=0.65 * inch,
        leftMargin=0.65 * inch,
        topMargin=0.65 * inch,
        bottomMargin=0.65 * inch,
    )
    styles = getSampleStyleSheet()
    styles.add(ParagraphStyle(name="TitleBlue", parent=styles["Title"], textColor=colors.HexColor("#0d69ac"), fontSize=24, leading=30, spaceAfter=10))
    styles.add(ParagraphStyle(name="SectionTitle", parent=styles["Heading2"], fontSize=15, leading=19, textColor=colors.HexColor("#111827"), spaceBefore=10, spaceAfter=4))
    styles.add(ParagraphStyle(name="Meta", parent=styles["BodyText"], fontSize=8, leading=11, textColor=colors.HexColor("#64748b")))
    styles.add(ParagraphStyle(name="Copy", parent=styles["BodyText"], fontSize=10.5, leading=15, textColor=colors.HexColor("#1f2937"), spaceAfter=8))
    styles.add(ParagraphStyle(name="Clip", parent=styles["BodyText"], fontSize=9.8, leading=13.5, textColor=colors.HexColor("#78350f"), backColor=colors.HexColor("#fef3c7"), borderColor=colors.HexColor("#fbbf24"), borderWidth=1, borderPadding=6, spaceBefore=4, spaceAfter=7))
    styles.add(ParagraphStyle(name="Note", parent=styles["BodyText"], fontSize=9.5, leading=13, textColor=colors.HexColor("#713f12"), backColor=colors.HexColor("#fef3c7"), borderPadding=5, spaceAfter=5))
    styles.add(ParagraphStyle(name="Reflection", parent=styles["BodyText"], fontSize=9.5, leading=13, textColor=colors.HexColor("#713f12"), backColor=colors.HexColor("#fffbeb"), borderColor=colors.HexColor("#fde68a"), borderWidth=1, borderPadding=6, spaceBefore=6, spaceAfter=6))
    styles.add(ParagraphStyle(name="TranscriptTitle", parent=styles["Heading1"], fontSize=20, leading=25, textColor=colors.HexColor("#0d69ac"), spaceAfter=8))
    styles.add(ParagraphStyle(name="TranscriptBody", parent=styles["BodyText"], fontSize=10.5, leading=16, textColor=colors.HexColor("#1f2937"), spaceAfter=8))
    styles.add(ParagraphStyle(name="TranscriptCue", parent=styles["BodyText"], fontSize=9.5, leading=13, textColor=colors.HexColor("#713f12"), backColor=colors.HexColor("#fef3c7"), borderPadding=5, spaceBefore=3, spaceAfter=6))

    story = [
        Paragraph("Snoutboard Podcast Conductor", styles["TitleBlue"]),
        Paragraph("Internal production notes for a paid 15-minute Patreon research episode.", styles["Copy"]),
        Paragraph(f"Generated: {conductor['generated_at']}", styles["Meta"]),
        Spacer(1, 0.18 * inch),
    ]

    summary_table = Table(
        [[Paragraph(f"<b>{clean(label)}</b><br/>{clean(value)}<br/><font size='7'>{clean(detail)}</font>", styles["BodyText"]) for label, value, detail in conductor["summary"]]],
        colWidths=[2.35 * inch, 2.35 * inch, 2.35 * inch],
    )
    summary_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#f8fafc")),
        ("BOX", (0, 0), (-1, -1), 0.5, colors.HexColor("#e2e8f0")),
        ("INNERGRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#e2e8f0")),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("PADDING", (0, 0), (-1, -1), 8),
    ]))
    story.extend([summary_table, Spacer(1, 0.2 * inch)])

    for index, section in enumerate(conductor["sections"]):
        if index == 4:
            story.append(PageBreak())
        story.append(Paragraph(f"{section['time']} - {clean(section['title'])}", styles["SectionTitle"]))
        story.append(Paragraph(f"<b>Role:</b> {clean(section['role'])}", styles["Meta"]))
        story.append(Paragraph(f"<b>Cards/tools:</b> {clean(section['tools'])}", styles["Meta"]))
        story.append(Spacer(1, 0.06 * inch))
        story.append(Paragraph("<b>On-air copy:</b>", styles["Meta"]))
        story.append(Paragraph(clean(section["copy"]), styles["Copy"]))
        if section.get("clip"):
            story.append(Paragraph(f"<b>Clip potential:</b> {clean(section['clip'])}", styles["Clip"]))
        story.append(Paragraph("<b>Producer notes:</b>", styles["Meta"]))
        for note in section["notes"]:
            story.append(Paragraph(clean(note), styles["Note"]))
        story.append(Paragraph(f"<b>Reflection prompt:</b> {clean(section['reflection'])}", styles["Reflection"]))
        story.append(Spacer(1, 0.08 * inch))

    transcript = conductor["transcript"]
    story.extend(
        [
            PageBreak(),
            Paragraph("Complete Host Transcript", styles["TranscriptTitle"]),
            Paragraph(
                f"Estimated runtime: {transcript['estimated_minutes']} minutes "
                f"at a conversational pace. Word count: {transcript['word_count']}.",
                styles["Meta"],
            ),
            Paragraph(
                "Generated from the same current dashboard outputs used in the conductor. "
                "Review the figures before recording and keep bracketed directions off-air.",
                styles["Copy"],
            ),
            Spacer(1, 0.1 * inch),
        ]
    )
    for section in transcript["sections"]:
        story.append(Paragraph(clean(section["title"]), styles["SectionTitle"]))
        for block in re.split(r"\n\s*\n", section["text"].strip()):
            if block.strip().startswith("[") and block.strip().endswith("]"):
                story.append(Paragraph(clean(block), styles["TranscriptCue"]))
            else:
                story.append(Paragraph(clean(block), styles["TranscriptBody"]))

    story.append(Spacer(1, 0.12 * inch))
    story.append(Paragraph("Host reminder: frame everything as independent creative research and interpreted signals, not official platform guidance or guaranteed business advice.", styles["Meta"]))
    doc.build(story, onFirstPage=add_footer, onLaterPages=add_footer)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", required=True)
    args = parser.parse_args()
    with urlopen(API_URL, timeout=45) as response:
        data = json.loads(response.read().decode("utf-8"))
    conductor = build_conductor(data)
    build_pdf(conductor, args.output)
    print(args.output)


if __name__ == "__main__":
    main()
