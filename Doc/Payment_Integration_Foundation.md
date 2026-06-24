# Payment Integration Foundation

Last updated: 2026-06-10

## Current Status

Payment integration for dashboard access is paused.

Current monetization direction:

- Paid Patreon episode: the full research readout.
- Public clips: three short excerpts from that paid episode.
- Data Strategy Sessions: future booking/payment flow, preferably linked out from the dashboard at first.

The app has dormant billing/account foundation tables and plan definitions, but it does not currently have active Stripe Checkout, Stripe webhooks, customer portal, or production-ready paid account enforcement.

Do not implement or promote paid dashboard access until:

- Legal/data-use review is complete.
- A checkout kill switch exists.
- Account access is server-enforced.
- Refund/cancellation flows are defined.
- Platform-derived data-use wording is reviewed.

The older Stripe rollout notes below are retained as future infrastructure context, not current launch direction.

## Current Account Status

The app does not yet have full user accounts.

What exists today:

- Private dashboard password gate.
- Supabase `profiles` table.
- Widget entitlement model.
- Newsletter subscriber system.
- Billing-ready tables added by `20260515_billing_tiers_foundation.sql`.

What does not exist yet:

- User sign-up/sign-in flow using Supabase Auth.
- Checkout session creation.
- Payment provider webhook.
- Customer portal.
- Automatic tier changes from payment events.

## Customer-Facing Tiers

| Tier | Monthly | 3-Month Project Pass | Annual |
|---|---:|---:|---:|
| Free | $0 | n/a | n/a |
| Scout | $19/mo | $49 | $190/yr |
| Pro | $49/mo | $129 | $490/yr |

The old internal `paid` tier should be treated as a legacy alias for `Scout`.

## Plan Keys

- `free`
- `scout_monthly`
- `scout_project_3_month`
- `scout_annual`
- `pro_monthly`
- `pro_project_3_month`
- `pro_annual`

These keys should map to payment provider price ids later.

## Recommended Stripe Rollout

Stripe is the cleanest next payment processor for this app because it supports:

- Checkout pages.
- Recurring subscriptions.
- One-time payments for the 3-month project pass.
- Customer portal.
- Webhooks for subscription lifecycle events.

### Phase 1 - Account Layer

1. Turn on Supabase Auth email/password or magic-link login.
2. Create profile rows when users sign up.
3. Replace the global dashboard password gate with account-based middleware.
4. Keep admin/password bypass only for internal use.

### Phase 2 - Checkout

1. Add provider price ids to `billing_plans.provider_price_id`.
2. Add `POST /api/billing/checkout`.
3. The route receives a `plan_key`, creates a Stripe Checkout session, and records it in `billing_checkout_sessions`.
4. Redirect user to Stripe Checkout.

### Phase 3 - Webhooks

1. Add `POST /api/billing/webhook`.
2. Verify Stripe signature.
3. Store every event in `billing_events`.
4. On successful checkout or active subscription, update `profiles`:
   - `subscription_tier`
   - `subscription_status`
   - `current_plan_key`
   - `billing_period`
   - `access_expires_at` for project passes
   - provider customer/subscription ids

### Phase 4 - Access Enforcement

1. Middleware checks Supabase Auth session.
2. Server loads user profile.
3. User can access dashboard only if tier is `trial`, `scout`, `pro`, or `admin`.
4. Widget-level gating uses `src/lib/entitlements.ts`.

## Important Payment Logic

Monthly and annual plans are subscriptions.

3-month project passes are one-time payments with an `access_expires_at` date set three months after purchase. They should not auto-renew unless you explicitly decide to make them subscriptions later.

## Before Launch

- Add Stripe test mode products/prices.
- Store provider price ids in Supabase.
- Test successful checkout.
- Test failed payment.
- Test canceled subscription.
- Test refund or manual downgrade.
- Confirm RLS policies block direct access to billing tables.
- Confirm users cannot self-upgrade by editing profile data.
