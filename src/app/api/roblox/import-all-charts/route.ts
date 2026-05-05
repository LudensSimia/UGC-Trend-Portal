import { NextResponse } from 'next/server'
import { requireCronSecret } from '@/lib/serverAuth'
import { createSupabaseServerClient } from '@/lib/supabaseServer'

/* =========================================================
   SUPABASE CLIENT
   ---------------------------------------------------------
   This route writes Roblox discovery data into Supabase.
   It updates the games table and appends chart snapshots.
   ========================================================= */

const supabase = createSupabaseServerClient()

/* =========================================================
   ROBLOX API CONFIG
   ---------------------------------------------------------
   These parameters mimic a Roblox Discover request.
   ========================================================= */

const SESSION_ID = '11111111-1111-1111-1111-111111111111'
const DEVICE = 'computer'
const COUNTRY = 'us'

/* =========================================================
   EXTRA SORTS
   ---------------------------------------------------------
   These are important chart buckets for UGC Intel.
   We force-add them because they are valuable for trend,
   popularity, and monetization proxy analysis.
   ========================================================= */

const EXTRA_SORTS = [
  { sortId: 'top-trending', sortDisplayName: 'Top Trending' },
  { sortId: 'top-playing', sortDisplayName: 'Top Playing' },
  { sortId: 'top-earning', sortDisplayName: 'Top Earning' },
  { sortId: 'top-paid-access', sortDisplayName: 'Top Paid Access' }
]

/* =========================================================
   TEXT HELPERS
   ========================================================= */

function has(text: string, pattern: RegExp) {
  return pattern.test(text)
}

/* =========================================================
   CLASSIFICATION LAYER
   ---------------------------------------------------------
   Goal:
   Convert raw Roblox title + description + chart context into
   broad creator-facing categories.

   This is intentionally heuristic for now:
   - fast
   - explainable
   - easy to audit
   - no black-box scoring
   ========================================================= */

function classifyGame(game: any, category: string) {
  const text = `${game?.title || ''} ${game?.description || ''} ${category || ''}`.toLowerCase()

  let inferred_genre = 'Other'
  let inferred_subgenre = 'General'
  let core_loop = 'Unknown'
  let session_type = 'Unknown'
  let monetization_style = 'Unknown'
  let multiplayer_type = 'Unknown'
  let build_complexity = 'Medium'

  /* -------------------------
     GENRE + SUBGENRE
     ------------------------- */

  if (
    has(text, /anime|manga|naruto|one piece|dragon ball|dragon|titan|demon slayer|jujutsu|bleach|pokemon|pokémon|roria|shinobi|ninja|saiyan|hero academy|blox fruit|fruit battleground/)
  ) {
    inferred_genre = 'Anime / Fandom'
    inferred_subgenre = 'Anime RPG / Combat'
  } else if (
    has(text, /simulator|clicker|idle|incremental|upgrade|rebirth|re-birth|prestige|earn|cash|money|coins|gems|profit|sell|farm|grind|level up|leveling|xp|boost|multiplier|pets|pet simulator/)
  ) {
    inferred_genre = 'Simulator'
    inferred_subgenre = 'Progression Loop'
  } else if (
    has(text, /tycoon|factory|build|builder|base|empire|business|store|shop|restaurant|cafe|hotel|city builder|tower|colony|manage|management/)
  ) {
    inferred_genre = 'Tycoon / Builder'
    inferred_subgenre = 'Builder Economy'
  } else if (
    has(text, /obby|parkour|obstacle|tower of|climb|jump|platformer|escape room|lava|floor is lava/)
  ) {
    inferred_genre = 'Obby'
    inferred_subgenre = 'Obstacle Course'
  } else if (
    has(text, /roleplay|role play|\brp\b|life|city|town|brookhaven|bloxburg|family|school|hospital|police|jobs?|house|home|apartment|hangout|social|vibe/)
  ) {
    inferred_genre = 'Roleplay / Social'
    inferred_subgenre = 'Life RP'
  } else if (
    has(text, /fight|fighting|battle|battleground|pvp|duel|arena|rivals|weapon|weapons|sword|gun|guns|shooter|shoot|laser|combat|war|military|boxing|slap|super power|power|boss fight/)
  ) {
    inferred_genre = 'Combat'
    inferred_subgenre = 'Arena PvP'
  } else if (
    has(text, /survive|survival|hide|killer|escape|hunt|horror|scary|monster|zombie|ghost|nightmare|doors|murder|mystery|infected|infection/)
  ) {
    inferred_genre = 'Survival / Horror'
    inferred_subgenre = 'Hide / Survival'
  } else if (
    has(text, /race|racing|drive|driving|car|cars|vehicle|bike|motorcycle|drift|speed|kart|obby race|runner/)
  ) {
    inferred_genre = 'Racing / Vehicle'
    inferred_subgenre = 'Driving / Racing'
  } else if (
    has(text, /guess|quiz|trivia|puzzle|word|tiles|mahjong|memory|answer|brain|logic/)
  ) {
    inferred_genre = 'Puzzle / Guessing'
    inferred_subgenre = 'Guessing / Logic'
  } else if (
    has(text, /rng|spin|roll|luck|random|crate|case opening|gacha|summon|draw/)
  ) {
    inferred_genre = 'RNG / Gacha'
    inferred_subgenre = 'Spin / Roll'
  } else if (
    has(text, /party|minigame|mini game|mini-game|rounds|round-based|quick game|challenge|challenges|race against|obby but|friends/)
  ) {
    inferred_genre = 'Mini-game / Party'
    inferred_subgenre = 'Short-session Party'
  } else if (
    has(text, /food|cook|cooking|restaurant|cafe|bakery|pizza|burger|sushi|korean|convenience store|store|asmr|cozy|cute/)
  ) {
    inferred_genre = 'Cozy / Food'
    inferred_subgenre = 'Food / Cozy Roleplay'
  } else if (
    has(text, /soccer|football|basketball|baseball|tennis|golf|sports|volleyball|hockey/)
  ) {
    inferred_genre = 'Sports'
    inferred_subgenre = 'Sports Competition'
  }

  /* -------------------------
     CORE LOOP
     ------------------------- */

  if (
    has(text, /upgrade|rebirth|prestige|earn|cash|coins|money|sell|farm|grind|level up|xp|boost|multiplier/)
  ) {
    core_loop = 'Grind + Upgrade'
  } else if (
    has(text, /fight|battle|pvp|duel|arena|shoot|weapon|boss/)
  ) {
    core_loop = 'Fight → Earn → Improve'
  } else if (
    has(text, /collect|catch|fish|pets|items|inventory|complete collection/)
  ) {
    core_loop = 'Collect + Sell'
  } else if (
    has(text, /survive|hide|killer|escape|hunt|murder/)
  ) {
    core_loop = 'Hide / Survive'
  } else if (
    has(text, /build|factory|base|tycoon|expand|manage/)
  ) {
    core_loop = 'Build → Expand → Earn'
  } else if (
    has(text, /guess|quiz|puzzle|tiles|answer/)
  ) {
    core_loop = 'Guess → Reveal → Repeat'
  } else if (
    has(text, /spin|roll|rng|luck|crate|gacha|summon/)
  ) {
    core_loop = 'Spin → Reveal → Upgrade'
  } else if (
    has(text, /race|drive|drift|speed/)
  ) {
    core_loop = 'Race → Improve → Compete'
  } else if (
    has(text, /roleplay|hangout|city|life|house/)
  ) {
    core_loop = 'Social Roleplay'
  }

  /* -------------------------
     SESSION TYPE
     ------------------------- */

  if (
    has(text, /round|rounds|duel|battle|pvp|race|minigame|quick game|party/)
  ) {
    session_type = 'Short session'
  } else if (
    has(text, /simulator|upgrade|rebirth|tycoon|build|grind|farm|collect|roleplay/)
  ) {
    session_type = 'Long session'
  }

  /* -------------------------
     MONETIZATION STYLE
     ------------------------- */

  if (
    category.toLowerCase().includes('earning') ||
    has(text, /gamepass|game pass|pass|boost|vip|premium|shop|store|crate|case|spin|roll|gacha|summon|cosmetic|skin/)
  ) {
    monetization_style = 'Gamepasses / Boosts'
  } else if (inferred_genre === 'Simulator') {
    monetization_style = 'Progression boosts'
  } else if (inferred_genre === 'Combat') {
    monetization_style = 'Cosmetics / Weapons'
  } else if (inferred_genre === 'Roleplay / Social') {
    monetization_style = 'Cosmetics / Roleplay Items'
  }

  /* -------------------------
     MULTIPLAYER TYPE
     ------------------------- */

  if (
    has(text, /pvp|duel|ranked|leaderboard|arena|rivals|competitive/)
  ) {
    multiplayer_type = 'Competitive'
  } else if (
    has(text, /roleplay|hangout|friends|social|city|family/)
  ) {
    multiplayer_type = 'Social'
  } else if (
    has(text, /co-op|coop|team|squad|party/)
  ) {
    multiplayer_type = 'Co-op'
  } else if (
    has(text, /killer|hide|survive|murder|infection/)
  ) {
    multiplayer_type = 'Asymmetric / Survival'
  }

  /* -------------------------
     BUILD COMPLEXITY
     ------------------------- */

  if (
    inferred_genre === 'Obby' ||
    inferred_genre === 'Puzzle / Guessing' ||
    inferred_genre === 'Mini-game / Party'
  ) {
    build_complexity = 'Low to Medium'
  } else if (
    inferred_genre === 'Simulator' ||
    inferred_genre === 'Tycoon / Builder' ||
    inferred_genre === 'Cozy / Food'
  ) {
    build_complexity = 'Medium'
  } else if (
    inferred_genre === 'Combat' ||
    inferred_genre === 'Anime / Fandom' ||
    inferred_genre === 'Survival / Horror' ||
    inferred_genre === 'Racing / Vehicle'
  ) {
    build_complexity = 'Medium to High'
  }

  return {
    inferred_genre,
    inferred_subgenre,
    core_loop,
    session_type,
    monetization_style,
    multiplayer_type,
    build_complexity
  }
}

/* =========================================================
   INTELLIGENCE LAYER
   ---------------------------------------------------------
   Goal:
   Extract creator-facing pattern signals from descriptions.

   These fields power:
   - pie charts
   - design cues
   - opportunity explanations
   - future AI classification
   - recommendation logic

   Important:
   We always return fallback values to avoid NULL/empty outputs.
   ========================================================= */

function analyzeDescription(description: string) {
  const text = (description || '').toLowerCase()

  const tags: string[] = []
  const keywords: string[] = []

  /* -------------------------
     KEYWORD EXTRACTION
     ------------------------- */

  const words = [
    // progression / economy
    'upgrade','upgrades','rebirth','prestige','level','levels','level up','xp',
    'earn','cash','coins','money','gems','gold','profit','sell','buy','shop',
    'boost','boosts','multiplier','farm','grind','afk','offline',

    // collection
    'collect','collection','catch','capture','pets','pet','fish','bug','bugs',
    'items','inventory','unlock','rare','legendary','mythic','shiny',

    // combat
    'fight','fighting','battle','battles','pvp','duel','arena','rivals',
    'weapon','weapons','sword','gun','guns','shooter','shoot','laser',
    'attack','boss','war','boxing','slap','powers',

    // survival / horror
    'survive','survival','hide','killer','escape','hunt','horror','scary',
    'monster','zombie','ghost','murder','mystery','infected','infection',

    // social / roleplay
    'roleplay','rp','life','city','town','house','home','family','school',
    'hospital','police','job','jobs','hangout','friends','vibe',

    // builder / tycoon
    'tycoon','build','builder','factory','base','empire','business',
    'restaurant','cafe','hotel','tower','manage','management','idle',

    // racing / vehicles
    'race','racing','drive','driving','car','cars','vehicle','bike',
    'motorcycle','drift','speed','kart',

    // puzzle / guessing
    'guess','quiz','trivia','puzzle','tiles','mahjong','memory','answer',
    'logic','brain',

    // rng / gacha
    'rng','spin','roll','luck','random','crate','case','gacha','summon','draw',

    // food / cozy
    'food','cook','cooking','meal','meals','bakery','pizza','burger','sushi',
    'korean','convenience','asmr','cozy','cute',

    // live ops / retention
    'update','updates','weekly','new update','new content','season','event',
    'limited','code','codes','free','reward','bonus','like','favorite',
    'group','community',

    // fandom / IP / viral
    'anime','manga','pokemon','pokémon','naruto','one piece','dragon ball',
    'titan','star wars','marvel','superhero','hero','brainrot','skibidi',
    'meme','viral',

    // competitive
    'ranked','leaderboard','leaderboards','top players','competitive'
  ]

  words.forEach((word) => {
    if (text.includes(word)) {
      keywords.push(word)
    }
  })

  /* -------------------------
     TAG SYSTEM
     ------------------------- */

  if (
    has(text, /upgrade|upgrades|rebirth|prestige|level up|xp|earn|cash|coins|money|gems|profit|sell|boost|multiplier|farm|grind|afk|offline/)
  ) {
    tags.push('Progression')
  }

  if (
    has(text, /collect|collection|catch|capture|pets|pet|fish|bug|bugs|items|inventory|unlock|rare|legendary|mythic|shiny/)
  ) {
    tags.push('Collection')
  }

  if (
    has(text, /fight|fighting|battle|battles|pvp|duel|arena|rivals|weapon|weapons|sword|gun|guns|shooter|shoot|laser|attack|boss|war|boxing|slap|powers/)
  ) {
    tags.push('Combat')
  }

  if (
    has(text, /survive|survival|hide|killer|escape|hunt|horror|scary|monster|zombie|ghost|murder|mystery|infected|infection/)
  ) {
    tags.push('Survival')
  }

  if (
    has(text, /roleplay|role play|\brp\b|life|city|town|house|home|family|school|hospital|police|job|jobs|hangout|friends|vibe/)
  ) {
    tags.push('Social')
  }

  if (
    has(text, /tycoon|build|builder|factory|base|empire|business|restaurant|cafe|hotel|tower|manage|management|idle/)
  ) {
    tags.push('Builder')
  }

  if (
    has(text, /race|racing|drive|driving|car|cars|vehicle|bike|motorcycle|drift|speed|kart/)
  ) {
    tags.push('Racing / Vehicle')
  }

  if (
    has(text, /soccer|football|basketball|baseball|tennis|golf|sports|volleyball|hockey/)
  ) {
    tags.push('Sports')
  }

  if (
    has(text, /party|minigame|mini game|mini-game|rounds|round-based|quick game|challenge|challenges|friends/)
  ) {
    tags.push('Mini-game / Party')
  }

  if (
    has(text, /food|cook|cooking|meal|meals|restaurant|cafe|bakery|pizza|burger|sushi|korean|convenience store|store|asmr|cozy|cute/)
  ) {
    tags.push('Cozy / Food')
  }

  if (
    has(text, /guess|quiz|trivia|puzzle|tiles|mahjong|memory|answer|logic|brain/)
  ) {
    tags.push('Puzzle / Guessing')
  }

  if (
    has(text, /rng|spin|roll|luck|random|crate|case opening|case|gacha|summon|draw/)
  ) {
    tags.push('RNG / Spin')
  }

  if (
    has(text, /anime|manga|pokemon|pokémon|naruto|one piece|dragon ball|titan|demon slayer|jujutsu|bleach|star wars|marvel|superhero|hero/)
  ) {
    tags.push('Fandom / IP')
  }

  if (
    has(text, /brainrot|skibidi|meme|viral/)
  ) {
    tags.push('Meme / Viral')
  }

  if (
    has(text, /update|updates|weekly|new update|new content|season|event|limited/)
  ) {
    tags.push('Live Ops')
  }

  if (
    has(text, /code|codes|free|reward|bonus|like|favorite|group|community/)
  ) {
    tags.push('Reward Hook')
  }

  if (
    has(text, /ranked|leaderboard|leaderboards|top players|competitive/)
  ) {
    tags.push('Competitive')
  }

  /* -------------------------
     TAG CLEANUP / GUARANTEES
     -------------------------
     Some Roblox descriptions use economy words without
     explicitly saying "simulator" or "progression."
     This guarantees those games still get tagged correctly.
     ------------------------- */

  if (
    keywords.includes('cash') ||
    keywords.includes('coins') ||
    keywords.includes('earn') ||
    keywords.includes('money') ||
    keywords.includes('gems') ||
    keywords.includes('upgrade') ||
    keywords.includes('rebirth') ||
    keywords.includes('boost')
  ) {
    if (!tags.includes('Progression')) {
      tags.push('Progression')
    }
  }


  /* -------------------------
     DESIGN PATTERN
     ------------------------- */

  let design_pattern = 'General Experience'

  if (tags.includes('Progression') && tags.includes('Collection')) {
    design_pattern = 'Collect → Upgrade → Sell'
  } else if (tags.includes('Combat') && tags.includes('Progression')) {
    design_pattern = 'Fight → Earn → Upgrade'
  } else if (tags.includes('Survival')) {
    design_pattern = 'Hide / Survive / Escape'
  } else if (tags.includes('Builder')) {
    design_pattern = 'Build → Expand → Earn'
  } else if (tags.includes('Mini-game / Party')) {
    design_pattern = 'Short Round → Replay → Share'
  } else if (tags.includes('RNG / Spin')) {
    design_pattern = 'Spin → Reveal → Upgrade'
  } else if (tags.includes('Puzzle / Guessing')) {
    design_pattern = 'Guess → Reveal → Repeat'
  } else if (tags.includes('Racing / Vehicle')) {
    design_pattern = 'Race → Improve → Compete'
  } else if (tags.includes('Cozy / Food')) {
    design_pattern = 'Serve → Customize → Return'
  } else if (tags.includes('Social')) {
    design_pattern = 'Roleplay → Socialize → Return'
  } else if (tags.includes('Fandom / IP')) {
    design_pattern = 'Fandom Hook → Progression → Retention'
  }

  /* -------------------------
     AUDIENCE SIGNAL
     ------------------------- */

  let audience_signal = 'General Audience'

  if (tags.includes('Fandom / IP') || tags.includes('Meme / Viral')) {
    audience_signal = 'Fandom / Viral'
  } else if (tags.includes('Competitive') || tags.includes('Combat')) {
    audience_signal = 'Competitive'
  } else if (tags.includes('Social') || tags.includes('Cozy / Food')) {
    audience_signal = 'Social / Cozy'
  } else if (tags.includes('Progression') || tags.includes('Collection')) {
    audience_signal = 'Progression-driven'
  }

  /* -------------------------
     UPDATE SIGNAL
     ------------------------- */

  let update_signal = 'Unknown'

  if (
    has(text, /weekly update|update every week|new update|updates every week|new content|season|event|limited/)
  ) {
    update_signal = 'Frequent Updates'
  } else if (
    has(text, /beta|pre-release|demo|testing|early access/)
  ) {
    update_signal = 'Beta / Iterating'
  }

  return {
    extracted_tags: tags.length ? [...new Set(tags)] : ['General'],
    description_keywords: keywords.length ? [...new Set(keywords)] : ['general'],
    design_pattern,
    audience_signal,
    update_signal
  }
}

/* =========================================================
   MAIN ROUTE
   ---------------------------------------------------------
   Flow:
   1. Fetch Roblox chart sorts
   2. Fetch games for each sort
   3. Enrich with details + thumbnails
   4. Classify and extract intelligence
   5. Upsert into games
   6. Insert chart snapshots
   ========================================================= */

export async function GET(req: Request) {
  const unauthorized = requireCronSecret(req)
  if (unauthorized) return unauthorized

  try {
    const sortsRes = await fetch(
      `https://apis.roblox.com/explore-api/v1/get-sorts?sessionId=${SESSION_ID}&device=${DEVICE}&country=${COUNTRY}`
    )

    const sortsData = await sortsRes.json()

    const apiSorts = (sortsData.sorts || []).filter(
      (sort: any) => sort.contentType === 'Games' && sort.sortId
    )

    const mergedSorts = [...apiSorts, ...EXTRA_SORTS]

    const sorts = Array.from(
      new Map(mergedSorts.map((s: any) => [s.sortId, s])).values()
    )

    let totalImported = 0

    for (const sort of sorts) {
      const sortId = sort.sortId
      const sortName = sort.sortDisplayName || sortId

      const contentRes = await fetch(
        `https://apis.roblox.com/explore-api/v1/get-sort-content?sessionId=${SESSION_ID}&sortId=${sortId}&device=${DEVICE}&country=${COUNTRY}`
      )

      const contentData = await contentRes.json()
      const games = contentData.games || []

      if (!games.length) continue

      const universeIds = games.map((g: any) => g.universeId).filter(Boolean)

      if (!universeIds.length) continue

      const detailsRes = await fetch(
        `https://games.roblox.com/v1/games?universeIds=${universeIds.join(',')}`
      )

      const detailsData = await detailsRes.json()
      const detailedGames = detailsData.data || []

      const thumbnailsRes = await fetch(
        `https://thumbnails.roblox.com/v1/games/icons?universeIds=${universeIds.join(',')}&size=512x512&format=Png&isCircular=false`
      )

      const thumbnailsData = await thumbnailsRes.json()
      const thumbnails = thumbnailsData.data || []

      for (let i = 0; i < games.length; i++) {
        const chartGame = games[i]

        if (!chartGame?.universeId) continue

        const detailedGame = detailedGames.find(
          (g: any) => String(g.id) === String(chartGame.universeId)
        )

        const thumbnail = thumbnails.find(
          (t: any) => String(t.targetId) === String(chartGame.universeId)
        )

        const safeDescription =
          detailedGame?.description ??
          chartGame?.description ??
          chartGame?.name ??
          ''

        const classification = classifyGame(
          {
            title: chartGame.name ?? detailedGame?.name ?? '',
            description: safeDescription
          },
          sortName
        )

        const fallbackDescription = [
          classification.inferred_genre,
          classification.inferred_subgenre,
          classification.core_loop
        ]
          .filter(Boolean)
          .join(' | ')

        const finalDescription =
          detailedGame?.description ??
          fallbackDescription ??
          chartGame?.name ??
          ''

        const intelligence = analyzeDescription(finalDescription)

        const { data: savedGame, error: gameError } = await supabase
          .from('games')
          .upsert(
            {
              platform: 'roblox',
              title: chartGame.name ?? detailedGame?.name ?? 'Untitled Roblox Game',
              url: `https://www.roblox.com/games/${chartGame.rootPlaceId}`,
              roblox_universe_id: String(chartGame.universeId),
              roblox_place_id: chartGame.rootPlaceId
                ? String(chartGame.rootPlaceId)
                : null,
              creator: detailedGame?.creator?.name ?? null,
              description: finalDescription,
              thumbnail_url: thumbnail?.imageUrl ?? null,

              inferred_genre: classification.inferred_genre ?? 'Other',
              inferred_subgenre: classification.inferred_subgenre ?? 'General',
              core_loop: classification.core_loop ?? 'Unknown',
              session_type: classification.session_type ?? 'Unknown',
              monetization_style: classification.monetization_style ?? 'Unknown',
              multiplayer_type: classification.multiplayer_type ?? 'Unknown',
              build_complexity: classification.build_complexity ?? 'Medium',

              extracted_tags: intelligence.extracted_tags,
              description_keywords: intelligence.description_keywords,
              design_pattern: intelligence.design_pattern,
              audience_signal: intelligence.audience_signal,
              update_signal: intelligence.update_signal
            },
            { onConflict: 'roblox_universe_id' }
          )
          .select()
          .single()

        if (gameError) {
          console.error('Game upsert error:', gameError)
          continue
        }

        if (!savedGame) continue

        const { error: snapshotError } = await supabase
          .from('roblox_chart_snapshots')
          .insert({
            sort_id: sortId,
            sort_name: sortName,
            chart_rank: i + 1,
            game_id: savedGame.id,
            current_players: chartGame.playerCount ?? 0,
            like_ratio:
              chartGame.totalUpVotes && chartGame.totalDownVotes
                ? chartGame.totalUpVotes /
                  (chartGame.totalUpVotes + chartGame.totalDownVotes)
                : null
          })

        if (snapshotError) {
          console.error('Snapshot insert error:', snapshotError)
          continue
        }

        totalImported++
      }
    }

    return NextResponse.json({
      success: true,
      totalImported
    })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
