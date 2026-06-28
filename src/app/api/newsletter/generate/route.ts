export const dynamic = "force-dynamic";

const RETIRED_NEWSLETTER_RESPONSE = {
  error: "Newsletter generation is not available.",
  status: "retired",
  message:
    "Snoutboard newsletter generation is intentionally disabled for this release.",
};

export async function GET() {
  return Response.json(RETIRED_NEWSLETTER_RESPONSE, { status: 410 });
}

export async function POST() {
  return Response.json(RETIRED_NEWSLETTER_RESPONSE, { status: 410 });
}
