import { createHash } from "crypto";

const DASHBOARD_BUILD = "v0.01";

type SupabaseLike = {
  from: (table: string) => any;
};

export type IngestRunInput = {
  platform: string;
  sourceName: string;
  sourceUrl?: string;
  parserVersion?: string;
};

export async function startIngestRun(supabase: SupabaseLike, input: IngestRunInput) {
  const { data, error } = await supabase
    .from("ingest_runs")
    .insert({
      platform: input.platform,
      source_name: input.sourceName,
      source_url: input.sourceUrl ?? null,
      snapshot_date: new Date().toISOString().slice(0, 10),
      status: "running",
      parser_version: input.parserVersion ?? null,
      dashboard_build: DASHBOARD_BUILD,
      started_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (error) {
    console.warn("Ingest run start failed:", error.message);
    return null;
  }

  return data?.id ?? null;
}

export async function storeRawSourceResponse(
  supabase: SupabaseLike,
  input: {
    ingestRunId: string | null;
    platform: string;
    sourceName: string;
    sourceUrl: string;
    httpStatus?: number;
    payload: unknown;
    rowCount: number;
    responseStartedAt?: string;
  }
) {
  const payloadText = JSON.stringify(input.payload ?? null);
  const payloadSha256 = createHash("sha256").update(payloadText).digest("hex");

  const { error } = await supabase.from("raw_source_responses").insert({
    ingest_run_id: input.ingestRunId,
    platform: input.platform,
    source_name: input.sourceName,
    source_url: input.sourceUrl,
    response_started_at: input.responseStartedAt ?? null,
    response_finished_at: new Date().toISOString(),
    http_status: input.httpStatus ?? null,
    row_count: input.rowCount,
    payload_sha256: payloadSha256,
    payload: input.payload,
  });

  if (error) {
    console.warn("Raw source response archive failed:", error.message);
  }
}

export async function finishIngestRun(
  supabase: SupabaseLike,
  input: {
    ingestRunId: string | null;
    status: "completed" | "partial" | "failed";
    httpStatus?: number;
    rowsReturned?: number;
    rowsInserted?: number;
    rowsFailed?: number;
    errorMessage?: string;
    rawResponseSummary?: Record<string, unknown>;
  }
) {
  if (!input.ingestRunId) return;

  const { error } = await supabase
    .from("ingest_runs")
    .update({
      status: input.status,
      http_status: input.httpStatus ?? null,
      rows_returned: input.rowsReturned ?? 0,
      rows_inserted: input.rowsInserted ?? 0,
      rows_failed: input.rowsFailed ?? 0,
      error_message: input.errorMessage ?? null,
      raw_response_summary: input.rawResponseSummary ?? null,
      finished_at: new Date().toISOString(),
    })
    .eq("id", input.ingestRunId);

  if (error) {
    console.warn("Ingest run finish failed:", error.message);
  }
}
