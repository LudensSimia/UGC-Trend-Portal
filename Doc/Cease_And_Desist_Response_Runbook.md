# Cease and Desist Response Runbook

Last updated: 2026-05-27

This document is an operational checklist for responding if Roblox, Epic Games, Fortnite, or another platform owner challenges Snoutboard's collection, processing, display, or sale of platform-derived public data.

This is not legal advice. Treat it as a response protocol to help preserve options, protect users, reduce commercial exposure, and give legal counsel clean facts to review.

## Response Goals

- Stop creating new risk quickly.
- Preserve evidence of what data was collected, when, and from which source.
- Avoid making admissions publicly before legal review.
- Protect current users with clear communication and fair billing handling.
- Keep the product capable of operating in a reduced, compliant research-only mode.
- Create a path toward permission, licensing, API access, or partnership.

## Severity Levels

### Level 1: Platform Inquiry

Examples:
- A platform representative asks how Snoutboard gets or uses data.
- A platform asks for attribution changes.
- A platform asks for clarification but does not demand shutdown.

Immediate posture:
- Do not ignore it.
- Pause any new marketing language that emphasizes platform data resale.
- Prepare a factual data-source summary.
- Ask counsel to review before replying.

### Level 2: Formal Legal Notice

Examples:
- Cease and desist letter.
- Trademark complaint.
- API terms complaint.
- Demand to remove specific data, names, images, logos, or claims.

Immediate posture:
- Freeze paid acquisition.
- Preserve logs and source records.
- Move affected platform pages into compliance review mode.
- Prepare user communication draft but do not send until reviewed.

### Level 3: Platform/API Access Risk

Examples:
- API keys revoked.
- IP blocked.
- Data source blocked.
- Hosting/provider complaint.
- App must stop displaying a platform dataset immediately.

Immediate posture:
- Disable affected ingestion jobs.
- Hide or lock affected platform dashboard sections.
- Keep account, billing, export, and cancellation flows available.
- Prepare refund/cancellation workflow.

## First 60 Minutes

1. Save the notice.
   - Store the original email/PDF/screenshot in a private admin/legal folder outside the public repo.
   - Record sender, date, deadline, claims, requested actions, and affected platform.

2. Stop public escalation.
   - Do not post about the notice.
   - Do not contact users until a response plan is chosen.
   - Do not make casual written admissions in email, Discord, Slack, GitHub, or support messages.

3. Freeze risky growth paths.
   - Disable paid checkout links for the affected product if the notice targets paid access.
   - Pause ads, launch posts, affiliate links, or promo campaigns.
   - Pause new promo code distribution.

4. Preserve evidence.
   - Export recent ingestion logs.
   - Export source response hashes and raw source response metadata.
   - Export Stripe subscription/customer list if paid users exist.
   - Export current Terms of Service, Glossary, disclaimer, and pricing page text.

5. Put the dashboard in review mode.
   - If only one platform is affected, lock or hide only that platform's research page.
   - If commercial use is challenged broadly, lock paid-only research widgets while leaving account management available.
   - Keep a neutral message: "This section is temporarily unavailable while we review platform data usage requirements."

## First Day

1. Legal review package.
   - Provide counsel with the notice.
   - Provide a short product description.
   - Provide screenshots of the affected pages.
   - Provide source/API descriptions.
   - Provide Terms of Service, disclaimers, and no-affiliation notices.
   - Provide examples of transformed/processed metrics.
   - Provide billing model and active subscriber count.

2. Technical review package.
   - List every source table that stores affected platform data.
   - List ingestion jobs and GitHub Actions schedules.
   - List API endpoints that expose affected data.
   - List UI widgets using affected data.
   - List newsletter blocks using affected data.
   - List raw media usage, including thumbnails and images.

3. Business decision checkpoint.
   - Option A: Narrow changes and continue.
   - Option B: Temporarily remove affected platform pages.
   - Option C: Pause paid access entirely.
   - Option D: Full shutdown and refund current period.

4. Partnership/licensing outreach.
   - Ask the platform for a permitted data-use path.
   - Ask whether paid licensing, API partnership, developer program participation, or written permission is available.
   - Ask which specific uses must stop immediately.
   - Ask whether transformed aggregate research is acceptable.

## Emergency Product Switches To Prepare

These are not all implemented yet, but should be treated as desired operational controls.

### Data Source Kill Switches

Recommended environment variables:

```text
DISABLE_ROBLOX_INGEST=true
DISABLE_FORTNITE_INGEST=true
DISABLE_ROBLOX_DASHBOARD=true
DISABLE_FORTNITE_DASHBOARD=true
DISABLE_NEWSLETTER_GENERATION=true
DISABLE_PAID_CHECKOUT=true
COMPLIANCE_REVIEW_MODE=true
```

Expected behavior:
- Ingestion jobs exit safely before calling the affected source.
- Dashboard cards show a neutral compliance-review placeholder.
- Newsletter drafts skip affected widgets.
- Checkout routes stop creating new paid subscriptions.
- Existing users can still log in, view account information, cancel, and delete their account.

### Admin Controls

Admin panel should eventually support:
- Disable a full platform page.
- Disable individual widgets.
- Disable paid-only widgets while preserving free/disclaimer pages.
- Disable newsletter generation.
- Export active account list.
- Export affected data-source inventory.

## Stripe Emergency Billing Plan

Stripe should be used for billing operations, not editorial email delivery.

### If Paid Acquisition Must Stop

1. Disable checkout links in the app.
2. Archive or deactivate active Stripe prices only after confirming no route depends on them.
3. Pause marketing and promo codes.
4. Keep the Stripe customer portal or cancellation support flow available.

### If Existing Subscriptions Must End At Period End

Use this when the service can continue until the paid period ends.

Actions:
- Set subscriptions to cancel at period end.
- Email users that access continues until the end of the billing period.
- Do not issue automatic refunds unless required or promised.

### If Existing Subscriptions Must Be Stopped Immediately

Use this when the platform requires immediate commercial shutdown or data removal.

Actions:
- Cancel affected subscriptions immediately.
- Refund the current billing period according to the chosen refund policy.
- Downgrade users to the free/research-only state.
- Keep account deletion available.

### Refund Policy Decision

Recommended emergency policy:
- Refund the current month for active monthly subscribers.
- Refund the unused current access period for project-pass or annual users if legally or commercially appropriate.
- Keep a CSV export of all refunds issued.
- Avoid promising automatic prorated refunds in public copy unless the implementation supports it.

## User Communication Templates

### Platform Review Notice

```text
Snoutboard is temporarily reviewing part of the dashboard because a platform data-use question requires clarification. Account access and account management remain available. We will provide an update when the review is complete.
```

### Paid Access Pause Notice

```text
We have temporarily paused paid access while we review platform data-use requirements. Your account remains available for account management. If your subscription is affected, we will provide a billing update before any further charge.
```

### Shutdown and Refund Notice

```text
We are temporarily discontinuing paid access to the affected dashboard while we work through platform data-use requirements. Current affected subscriptions are being canceled, and eligible current-period refunds will be processed. This does not mean Snoutboard is ending permanently; it means we are pausing the affected commercial access while we pursue a compliant path forward.
```

## Public Copy Rules During Review

Avoid:
- "official"
- "partner"
- "certified"
- "approved"
- "endorsed"
- "best performing" when ranking is not sourced
- "most popular" when popularity is inferred
- "guaranteed"
- "recommended investment"
- "business advice"

Prefer:
- "independent"
- "research dashboard"
- "processed public signals"
- "estimated"
- "directional"
- "captured in our dataset"
- "source-visible"
- "not a guarantee of outcome"

## Data Preservation Checklist

Export or preserve:
- `ingest_runs`
- `raw_source_responses`
- Roblox chart snapshots
- Roblox metric snapshots
- Fortnite island snapshots
- Dashboard snapshot archives
- Data quality snapshots
- Newsletter drafts sent or generated
- Current Terms of Service and Glossary
- Current pricing copy
- Current no-affiliation footer
- Git commit hash of deployed version
- Vercel deployment URL and deployment timestamp

Do not delete historical records until counsel confirms deletion is required.

## Data Removal Checklist

If a platform requires removal:

1. Identify exact tables and columns storing affected data.
2. Identify derived aggregates that may still contain affected data.
3. Identify cached dashboard snapshots.
4. Identify newsletter drafts and archives.
5. Identify object storage images or thumbnails.
6. Identify logs containing source payloads.
7. Create a deletion migration or archival process.
8. Run deletion first in a staging copy.
9. Export a deletion report.
10. Confirm the dashboard no longer displays affected records.

## Partnership / Permission Path

Prepare a concise outreach package:
- Product overview.
- Audience: creators researching UGC market patterns.
- Data sources used.
- Examples of transformed aggregate insights.
- Safety/disclaimer posture.
- No-affiliation wording.
- Privacy/security posture.
- Request: permitted data-use path, commercial license, API access, or partnership discussion.

Questions to ask:
- Is paid access to transformed research allowed?
- Are raw names/images/descriptions allowed to be stored?
- Are public rankings allowed to be cached historically?
- Are thumbnails/media allowed to be displayed?
- Are aggregate genre/label trends allowed?
- Are newsletters containing platform-derived insights allowed?
- What attribution is required?
- What data must not be stored?

## Implementation Backlog

High priority:
- Add ingestion kill switches.
- Add paid checkout kill switch before Stripe launch.
- Add compliance review mode per platform.
- Add newsletter generation kill switch.
- Add admin-only data export checklist page.
- Add Stripe cancellation/refund dry-run script once Stripe is integrated.
- Add a billing emergency runbook after Stripe products/prices are finalized.

Medium priority:
- Add a "platform data source inventory" admin panel.
- Add one-click widget disable by platform.
- Add audit export for source response hashes.
- Add saved screenshots of Terms/Glossary/Disclaimer at each release.
- Add deployment metadata to dashboard footer or admin panel.

Low priority:
- Add legal contact field in admin settings.
- Add partner/license status metadata per source.
- Add internal "approved wording" copy registry.

## Final Go / No-Go Checklist

Before re-enabling paid access:
- Counsel has reviewed the notice and response.
- Affected platform source terms have been reviewed.
- Dashboard wording has been updated.
- No-affiliation notice is visible.
- Paid checkout language is accurate.
- Refund/cancellation obligations are clear.
- Ingestion jobs are compliant or disabled.
- Newsletter generation excludes disputed data unless approved.
- Admin can disable affected widgets quickly.
- A user communication plan is ready.

