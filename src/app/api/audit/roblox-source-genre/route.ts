import { NextResponse } from "next/server";
import { requireCronSecret } from "@/lib/serverAuth";
import { createSupabaseServerClient } from "@/lib/supabaseServer";

const supabase = createSupabaseServerClient();

type RobloxGenreAuditRow = {
  id: string;
  title: string | null;
  url: string | null;
  genre: string | null;
  inferred_genre: string | null;
  inferred_subgenre: string | null;
  raw_top_trending?: Record<string, unknown> | null;
  raw_game_details?: Record<string, unknown> | null;
};

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const unauthorized = requireCronSecret(req);
  if (unauthorized) return unauthorized;

  const { data, error } = await supabase
    .from("games")
    .select(
      `
        id,
        title,
        url,
        genre,
        inferred_genre,
        inferred_subgenre,
        raw_top_trending,
        raw_game_details
      `
    )
    .eq("platform", "roblox");

  if (error) {
    return NextResponse.json(
      { error: "Roblox source genre audit failed", details: error.message },
      { status: 500 }
    );
  }

  const rows = (data ?? []) as RobloxGenreAuditRow[];
  const audited = rows.map((row) => {
    const sourceGenre =
      cleanText(row.genre) ??
      pickRobloxSourceGenre(row.raw_top_trending, row.raw_game_details);
    const sourceSubgenre = pickRobloxSourceSubgenre(
      row.raw_top_trending,
      row.raw_game_details
    );
    const genreMatches =
      !sourceGenre || normalizeLabel(sourceGenre) === normalizeLabel(row.inferred_genre);
    const subgenreMatches =
      !sourceSubgenre ||
      normalizeLabel(sourceSubgenre) === normalizeLabel(row.inferred_subgenre);

    return {
      id: row.id,
      title: row.title,
      url: row.url,
      roblox_source_genre: sourceGenre,
      stored_genre: row.genre,
      dashboard_genre: row.inferred_genre,
      genre_matches: genreMatches,
      roblox_source_subgenre: sourceSubgenre,
      dashboard_subgenre: row.inferred_subgenre,
      subgenre_matches: subgenreMatches,
    };
  });
  const rowsWithSourceGenre = audited.filter((row) => row.roblox_source_genre);
  const genreMismatches = rowsWithSourceGenre.filter((row) => !row.genre_matches);
  const rowsWithSourceSubgenre = audited.filter((row) => row.roblox_source_subgenre);
  const subgenreMismatches = rowsWithSourceSubgenre.filter(
    (row) => !row.subgenre_matches
  );
  const url = new URL(req.url);
  const limit = Number(url.searchParams.get("limit") ?? 50);

  return NextResponse.json({
    ok: true,
    summary: {
      total_roblox_rows: rows.length,
      rows_with_roblox_source_genre: rowsWithSourceGenre.length,
      genre_mismatch_count: genreMismatches.length,
      rows_with_roblox_source_subgenre: rowsWithSourceSubgenre.length,
      subgenre_mismatch_count: subgenreMismatches.length,
      note: "Roblox source genre/subgenre is preferred when available. Missing source values still fall back to the dashboard heuristic.",
    },
    genre_mismatches: genreMismatches.slice(0, limit),
    subgenre_mismatches: subgenreMismatches.slice(0, limit),
  });
}

function pickRobloxSourceGenre(
  chartGame?: Record<string, unknown> | null,
  detailedGame?: Record<string, unknown> | null
) {
  return pickText(
    detailedGame?.genre,
    detailedGame?.genreName,
    detailedGame?.genre_l1,
    detailedGame?.genreL1,
    detailedGame?.rootGenre,
    chartGame?.genre,
    chartGame?.genreName,
    chartGame?.genre_l1,
    chartGame?.genreL1,
    chartGame?.category,
    chartGame?.topic
  );
}

function pickRobloxSourceSubgenre(
  chartGame?: Record<string, unknown> | null,
  detailedGame?: Record<string, unknown> | null
) {
  return pickText(
    detailedGame?.subgenre,
    detailedGame?.subGenre,
    detailedGame?.subgenreName,
    detailedGame?.genre_l2,
    detailedGame?.genreL2,
    detailedGame?.subCategory,
    detailedGame?.topic,
    chartGame?.subgenre,
    chartGame?.subGenre,
    chartGame?.subgenreName,
    chartGame?.genre_l2,
    chartGame?.genreL2,
    chartGame?.subCategory
  );
}

function pickText(...values: unknown[]) {
  for (const value of values) {
    const text = cleanText(value);
    if (text) return text;
  }

  return null;
}

function cleanText(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function normalizeLabel(value: unknown) {
  return typeof value === "string"
    ? value.trim().toLowerCase().replace(/\s+/g, " ")
    : "";
}
