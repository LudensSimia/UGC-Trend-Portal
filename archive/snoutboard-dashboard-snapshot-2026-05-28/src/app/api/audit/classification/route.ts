import { NextResponse } from "next/server";
import { requireCronSecret } from "@/lib/serverAuth";
import { createSupabaseServerClient } from "@/lib/supabaseServer";

const supabase = createSupabaseServerClient();

type AuditRow = {
  title?: string | null;
  inferred_genre?: string | null;
  inferred_subgenre?: string | null;
  core_loop?: string | null;
  raw_latest?: unknown;
  roblox_chart_snapshots?: { id?: string; created_at?: string | null }[];
  fortnite_island_snapshots?: { id?: string; created_at?: string | null }[];
};

export async function GET(req: Request) {
  const unauthorized = requireCronSecret(req);
  if (unauthorized) return unauthorized;

  try {
    const audits = [];

    audits.push(
      await auditTable({
        platform: "roblox",
        sourceTable: "games",
        query: supabase
          .from("games")
          .select(
            `
              title,
              inferred_genre,
              inferred_subgenre,
              core_loop,
              roblox_chart_snapshots (
                id,
                created_at
              )
            `
          )
          .eq("platform", "roblox"),
        hasSource: (row) => (row.roblox_chart_snapshots ?? []).length > 0,
      })
    );

    audits.push(
      await auditTable({
        platform: "fortnite",
        sourceTable: "fortnite_islands",
        query: supabase.from("fortnite_islands").select(`
          title,
          inferred_genre,
          inferred_subgenre,
          core_loop,
          raw_latest,
          fortnite_island_snapshots (
            id,
            created_at
          )
        `),
        hasSource: (row) =>
          Boolean(row.raw_latest) ||
          (row.fortnite_island_snapshots ?? []).length > 0,
      })
    );

    const { error: insertError } = await supabase
      .from("data_quality_snapshots")
      .insert(audits);

    if (insertError) {
      return NextResponse.json(
        {
          error: "Audit calculated, but saving failed",
          details: insertError,
          audits,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, audits });
  } catch (err) {
    console.error("Classification audit failed:", err);

    return NextResponse.json(
      { error: "Classification audit failed" },
      { status: 500 }
    );
  }
}

async function auditTable({
  platform,
  sourceTable,
  query,
  hasSource,
}: {
  platform: string;
  sourceTable: string;
  query: PromiseLike<{ data: AuditRow[] | null; error: { message: string } | null }>;
  hasSource: (row: AuditRow) => boolean;
}) {
  const { data, error } = await query;

  if (error) {
    throw new Error(`${platform} audit query failed: ${error.message}`);
  }

  const rows = data ?? [];
  const totalRecords = rows.length;

  const missingGenreRecords = rows.filter(
    (row) => !row.inferred_genre || row.inferred_genre === "Other"
  ).length;

  const missingSubgenreRecords = rows.filter(
    (row) => !row.inferred_subgenre || row.inferred_subgenre === "General"
  ).length;

  const missingCoreLoopRecords = rows.filter(
    (row) => !row.core_loop || row.core_loop === "Unknown"
  ).length;

  const missingSourceRecords = rows.filter((row) => !hasSource(row)).length;

  const classifiedRecords = rows.filter(
    (row) =>
      row.title &&
      row.inferred_genre &&
      row.inferred_genre !== "Other" &&
      row.inferred_subgenre &&
      row.inferred_subgenre !== "General" &&
      row.core_loop &&
      row.core_loop !== "Unknown"
  ).length;

  const classificationCoveragePercent = percent(classifiedRecords, totalRecords);
  const sourceCoveragePercent = percent(
    totalRecords - missingSourceRecords,
    totalRecords
  );

  return {
    platform,
    source_table: sourceTable,
    total_records: totalRecords,
    classified_records: classifiedRecords,
    missing_genre_records: missingGenreRecords,
    missing_subgenre_records: missingSubgenreRecords,
    missing_core_loop_records: missingCoreLoopRecords,
    missing_source_records: missingSourceRecords,
    classification_coverage_percent: classificationCoveragePercent,
    source_coverage_percent: sourceCoveragePercent,
    confidence_percent: Math.round(
      classificationCoveragePercent * 0.8 + sourceCoveragePercent * 0.2
    ),
    notes:
      "Automated confidence is a data-quality proxy, not manually verified classification accuracy.",
  };
}

function percent(numerator: number, denominator: number) {
  if (!denominator) return 0;
  return Math.round((numerator / denominator) * 10000) / 100;
}
