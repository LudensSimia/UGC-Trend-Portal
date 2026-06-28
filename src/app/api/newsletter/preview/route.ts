export const dynamic = "force-dynamic";

const RETIRED_NEWSLETTER_RESPONSE = {
  error: "Newsletter preview is not available.",
  status: "retired",
  message:
    "Snoutboard newsletter generation is intentionally disabled for this release.",
};

export async function GET() {
  return Response.json(RETIRED_NEWSLETTER_RESPONSE, { status: 410 });
}
