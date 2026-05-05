export const DASHBOARD_AUTH_COOKIE = "ugc_dashboard_auth";

export async function getDashboardAuthToken(password: string) {
  const secret = process.env.DASHBOARD_AUTH_SECRET ?? process.env.CRON_SECRET;

  if (!secret) {
    throw new Error("Missing DASHBOARD_AUTH_SECRET or CRON_SECRET");
  }

  const input = `${password}:${secret}`;
  const data = new TextEncoder().encode(input);
  const hash = await crypto.subtle.digest("SHA-256", data);

  return Array.from(new Uint8Array(hash))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}
