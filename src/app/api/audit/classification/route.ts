import { NextResponse } from "next/server";
import { requireCronSecret } from "@/lib/serverAuth";
import { createSupabaseServerClient } from "@/lib/supabaseServer";

const supabase = createSupabaseServerClient();

type AuditSummary = {
  platform: string;
  source_table: string;
  total_records: number;
  classified_records: number;
  missing_genre_records: number;
  missing_subgenre_records: number;
  missing_core_loop_records: number;
  missing_source_records: number;
  classification_coverage_percent: number;
  source_coverage_percent: number;
  confidence_percent: number;
  notes: string;
};

export async function GET(req: Request) {
  const unauthorized = requireCronSecret(req);
  if (unauthorized) return unauthorized;

  try {
    const { data, error: auditError } = await supabase.rpc(
      "get_classification_audit_summary"
    );

    if (auditError) {
      throw new Error(`Classification audit RPC failed: ${auditError.message}`);
    }

    const audits = (data ?? []) as AuditSummary[];

    if (audits.length !== 2) {
      throw new Error(
        `Classification audit RPC returned ${audits.length} platform summaries; expected 2`
      );
    }

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
