import { NextResponse } from "next/server";
import { requireCronSecret } from "@/lib/serverAuth";
import { createSupabaseServerClient } from "@/lib/supabaseServer";
import {
  buildNewsletterIssue,
  getDefaultNewsletterEdition,
  renderNewsletterHtml,
  renderNewsletterText,
  type DashboardSnapshotRecord,
  type NewsletterEdition,
  type PlatformKey,
} from "@/lib/newsletter";
import type { WidgetKey } from "@/lib/entitlements";

export const dynamic = "force-dynamic";

const supabase = createSupabaseServerClient();

export async function GET(req: Request) {
  const unauthorized = requireCronSecret(req);
  if (unauthorized) return unauthorized;

  const url = new URL(req.url);
  const edition = await loadNewsletterEdition(url.searchParams.get("edition"));
  const snapshots = await loadLatestDashboardSnapshots(edition.platforms);
  const issue = buildNewsletterIssue({
    edition,
    snapshots,
    appUrl: process.env.NEXT_PUBLIC_APP_URL ?? process.env.APP_BASE_URL,
  });

  return NextResponse.json({
    ok: true,
    issue,
    html: renderNewsletterHtml(issue),
    text: renderNewsletterText(issue),
  });
}

async function loadNewsletterEdition(key?: string | null): Promise<NewsletterEdition> {
  const fallback = getDefaultNewsletterEdition(key);
  if (!key) return fallback;

  const { data, error } = await supabase
    .from("newsletter_editions")
    .select("key, name, frequency, widget_keys, platforms, is_active")
    .eq("key", key)
    .eq("is_active", true)
    .maybeSingle();

  if (error || !data) return fallback;

  return {
    key: data.key,
    name: data.name,
    frequency: data.frequency,
    widgetKeys: data.widget_keys as WidgetKey[],
    platforms: data.platforms as PlatformKey[],
  };
}

async function loadLatestDashboardSnapshots(platforms: PlatformKey[]) {
  const snapshots = await Promise.all(
    platforms.map(async (platform) => {
      const { data, error } = await supabase
        .from("dashboard_snapshots")
        .select("platform, snapshot_date, created_at, data")
        .eq("platform", platform)
        .order("snapshot_date", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error || !data) return null;

      return data as DashboardSnapshotRecord;
    })
  );

  return snapshots.filter(Boolean) as DashboardSnapshotRecord[];
}
