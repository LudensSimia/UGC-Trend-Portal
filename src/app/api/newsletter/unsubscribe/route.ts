export const dynamic = "force-dynamic";

const RETIRED_NEWSLETTER_RESPONSE = {
  error: "Newsletter unsubscribe is not available.",
  status: "retired",
  message:
    "Snoutboard is not currently operating newsletter subscriptions through this endpoint.",
};

export async function GET() {
  return Response.json(RETIRED_NEWSLETTER_RESPONSE, { status: 410 });
}
