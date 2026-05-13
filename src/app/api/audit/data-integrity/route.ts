import { NextResponse } from "next/server";
import { requireCronSecret } from "@/lib/serverAuth";
import { createSupabaseServerClient } from "@/lib/supabaseServer";

const supabase = createSupabaseServerClient();

export async function GET(req: Request) {
  const unauthorized = requireCronSecret(req);
  if (unauthorized) return unauthorized;

  try {
    const [
      robloxChartSnapshots,
      gameMetrics,
      fortniteSnapshots,
      ingestRuns,
      rawResponses,
    ] = await Promise.all([
      loadAll(
        "roblox_chart_snapshots",
        "snapshot_date,created_at,sort_id,chart_rank,game_id,current_players,raw_chart_item,raw_game_details,raw_thumbnail"
      ),
      loadAll(
        "game_metrics",
        "date,source,chart_rank,game_id,current_players,visits,favorites,up_votes,down_votes,like_ratio,raw_metric_snapshot"
      ),
      loadAll(
        "fortnite_island_snapshots",
        "snapshot_date,created_at,source_name,island_id,rank,source_order,rank_source,minutes_played,plays,unique_players,peak_ccu,raw_payload"
      ),
      loadAll(
        "ingest_runs",
        "platform,source_name,snapshot_date,status,rows_returned,rows_inserted,rows_failed,started_at,finished_at"
      ),
      loadAll(
        "raw_source_responses",
        "platform,source_name,row_count,payload_sha256,created_at"
      ),
    ]);

    const payload = {
      generated_at: new Date().toISOString(),
      roblox: {
        chart_snapshots: {
          rows: robloxChartSnapshots.length,
          by_date: countBy(robloxChartSnapshots, (row) =>
            row.snapshot_date ?? getDateKey(row.created_at)
          ),
          missing_raw_chart_item: missing(robloxChartSnapshots, "raw_chart_item"),
          missing_raw_game_details: missing(robloxChartSnapshots, "raw_game_details"),
          missing_raw_thumbnail: missing(robloxChartSnapshots, "raw_thumbnail"),
          duplicate_exact_keys: duplicateGroupCount(robloxChartSnapshots, (row) =>
            [
              row.snapshot_date,
              row.sort_id,
              row.chart_rank,
              row.game_id,
            ].join("|")
          ),
        },
        game_metrics: {
          rows: gameMetrics.length,
          by_date: countBy(gameMetrics, (row) => row.date),
          missing_raw_metric_snapshot: missing(gameMetrics, "raw_metric_snapshot"),
          missing_visits: missing(gameMetrics, "visits"),
          missing_favorites: missing(gameMetrics, "favorites"),
          duplicate_exact_keys: duplicateGroupCount(gameMetrics, (row) =>
            [row.date, row.source, row.chart_rank, row.game_id].join("|")
          ),
        },
      },
      fortnite: {
        island_snapshots: {
          rows: fortniteSnapshots.length,
          by_date: countBy(fortniteSnapshots, (row) =>
            row.snapshot_date ?? getDateKey(row.created_at)
          ),
          missing_raw_payload: missing(fortniteSnapshots, "raw_payload"),
          missing_rank: missing(fortniteSnapshots, "rank"),
          missing_source_order: missing(fortniteSnapshots, "source_order"),
          missing_activity_metric: fortniteSnapshots.filter(
            (row) =>
              row.minutes_played == null &&
              row.plays == null &&
              row.unique_players == null &&
              row.peak_ccu == null
          ).length,
          duplicate_exact_keys: duplicateGroupCount(fortniteSnapshots, (row) =>
            [row.snapshot_date, row.source_name, row.island_id].join("|")
          ),
        },
      },
      ingestion: {
        runs: ingestRuns.length,
        raw_source_responses: rawResponses.length,
        failed_runs: ingestRuns.filter((run) => run.status === "failed").length,
        partial_runs: ingestRuns.filter((run) => run.status === "partial").length,
      },
    };

    const { error } = await supabase.from("data_integrity_snapshots").insert({
      snapshot_date: new Date().toISOString().slice(0, 10),
      status: "completed",
      payload,
    });

    if (error) {
      return NextResponse.json(
        { error: "Integrity audit calculated, but saving failed", details: error, payload },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, payload });
  } catch (err) {
    console.error("Data integrity audit failed:", err);

    return NextResponse.json(
      { error: "Data integrity audit failed" },
      { status: 500 }
    );
  }
}

async function loadAll(table: string, select: string) {
  const rows: any[] = [];

  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase
      .from(table)
      .select(select)
      .range(from, from + 999);

    if (error) throw new Error(`${table}: ${error.message}`);

    rows.push(...(data ?? []));
    if (!data || data.length < 1000) break;
  }

  return rows;
}

function getDateKey(value?: string | null) {
  return String(value ?? "").slice(0, 10);
}

function missing(rows: any[], field: string) {
  return rows.filter((row) => row[field] == null || row[field] === "").length;
}

function countBy(rows: any[], keyFn: (row: any) => string) {
  return rows.reduce<Record<string, number>>((acc, row) => {
    const key = keyFn(row) || "unknown";
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});
}

function duplicateGroupCount(rows: any[], keyFn: (row: any) => string) {
  const counts = countBy(rows, keyFn);
  return Object.values(counts).filter((count) => count > 1).length;
}
