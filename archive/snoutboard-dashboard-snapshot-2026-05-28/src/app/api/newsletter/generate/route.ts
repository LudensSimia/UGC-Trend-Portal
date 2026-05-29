import { NextResponse } from "next/server";
import { requireCronSecret } from "@/lib/serverAuth";
import { createSupabaseServerClient } from "@/lib/supabaseServer";
import {
  buildNewsletterIssue,
  DEFAULT_NEWSLETTER_EDITIONS,
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
  return handleGenerate(req);
}

export async function POST(req: Request) {
  return handleGenerate(req);
}

async function handleGenerate(req: Request) {
  const unauthorized = requireCronSecret(req);
  if (unauthorized) return unauthorized;

  const url = new URL(req.url);
  const editionKey = url.searchParams.get("edition");
  const shouldSend = url.searchParams.get("send") === "true";
  const edition = await loadNewsletterEdition(editionKey);
  const snapshots = await loadLatestDashboardSnapshots(edition.platforms);
  const issue = buildNewsletterIssue({
    edition,
    snapshots,
    appUrl: process.env.NEXT_PUBLIC_APP_URL ?? process.env.APP_BASE_URL,
  });
  const html = renderNewsletterHtml(issue);
  const text = renderNewsletterText(issue);

  const { data: insertedIssue, error: issueError } = await supabase
    .from("newsletter_issues")
    .insert({
      edition_key: issue.editionKey,
      subject: issue.subject,
      preview_text: issue.previewText,
      platforms: issue.platforms,
      widget_keys: issue.widgetKeys,
      payload: issue,
      html,
      text,
      status: shouldSend ? "sending" : "generated",
      generated_at: issue.generatedAt,
    })
    .select("id")
    .single();

  if (issueError) {
    return NextResponse.json(
      { error: "Newsletter issue save failed", details: issueError.message },
      { status: 500 }
    );
  }

  if (!shouldSend) {
    return NextResponse.json({ ok: true, issueId: insertedIssue.id, issue });
  }

  const sendResult = await sendNewsletter({
    issueId: insertedIssue.id,
    edition,
    subject: issue.subject,
    html,
    text,
  });

  return NextResponse.json({
    ok: sendResult.ok,
    issueId: insertedIssue.id,
    issue,
    delivery: sendResult,
  });
}

async function loadNewsletterEdition(key?: string | null): Promise<NewsletterEdition> {
  if (!key) return DEFAULT_NEWSLETTER_EDITIONS.daily_creator_digest;

  const fallback = getDefaultNewsletterEdition(key);
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

async function sendNewsletter({
  issueId,
  edition,
  subject,
  html,
  text,
}: {
  issueId: string;
  edition: NewsletterEdition;
  subject: string;
  html: string;
  text: string;
}) {
  const apiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.NEWSLETTER_FROM_EMAIL;

  if (!apiKey || !fromEmail) {
    await supabase
      .from("newsletter_issues")
      .update({ status: "generated" })
      .eq("id", issueId);

    return {
      ok: false,
      sent: 0,
      failed: 0,
      warning: "Missing RESEND_API_KEY or NEWSLETTER_FROM_EMAIL. Issue generated but not sent.",
    };
  }

  const { data: subscribers, error } = await supabase
    .from("newsletter_subscribers")
    .select("id, email, interests")
    .eq("status", "active")
    .eq("frequency", edition.frequency);

  if (error) {
    await supabase
      .from("newsletter_issues")
      .update({ status: "failed" })
      .eq("id", issueId);

    return { ok: false, sent: 0, failed: 0, error: error.message };
  }

  const eligibleSubscribers = (subscribers ?? []).filter((subscriber) => {
    const interests = (subscriber.interests ?? []) as string[];

    return interests.length === 0 || edition.platforms.some((platform) => interests.includes(platform));
  });
  let sent = 0;
  let failed = 0;

  for (const subscriber of eligibleSubscribers) {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: fromEmail,
        to: subscriber.email,
        subject,
        html,
        text,
      }),
    });
    const body = (await response.json().catch(() => null)) as { id?: string; message?: string } | null;
    const status = response.ok ? "sent" : "failed";

    if (response.ok) sent += 1;
    else failed += 1;

    await supabase.from("newsletter_deliveries").insert({
      issue_id: issueId,
      subscriber_id: subscriber.id,
      email: subscriber.email,
      status,
      provider: "resend",
      provider_message_id: body?.id ?? null,
      error: response.ok ? null : body?.message ?? `HTTP ${response.status}`,
      sent_at: response.ok ? new Date().toISOString() : null,
    });
  }

  await supabase
    .from("newsletter_issues")
    .update({
      status: failed > 0 ? "failed" : "sent",
      sent_at: sent > 0 ? new Date().toISOString() : null,
    })
    .eq("id", issueId);

  return { ok: failed === 0, sent, failed };
}
