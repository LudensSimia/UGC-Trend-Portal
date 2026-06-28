export const dynamic = "force-dynamic";

const RETIRED_NEWSLETTER_RESPONSE = {
  error: "Newsletter subscriptions are not available.",
  status: "retired",
  message:
    "Snoutboard is not currently collecting newsletter subscriptions through this endpoint.",
};

export async function POST() {
  return Response.json(RETIRED_NEWSLETTER_RESPONSE, { status: 410 });
}
