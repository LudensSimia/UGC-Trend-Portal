export const DASHBOARD_AUTH_COOKIE = "ugc_dashboard_auth";
export const DASHBOARD_TIER_COOKIE = "ugc_dashboard_tier";

export type DashboardSessionPayload = {
  userId: string;
  email: string;
  tier: string;
  role: "user" | "admin";
  exp: number;
};

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

export async function createDashboardSessionToken(
  payload: Omit<DashboardSessionPayload, "exp">,
  maxAgeSeconds = 60 * 60 * 24 * 7
) {
  const fullPayload: DashboardSessionPayload = {
    ...payload,
    exp: Math.floor(Date.now() / 1000) + maxAgeSeconds,
  };
  const encodedPayload = base64UrlEncode(JSON.stringify(fullPayload));
  const signature = await signSessionPayload(encodedPayload);

  return `${encodedPayload}.${signature}`;
}

export async function verifyDashboardSessionToken(token?: string | null) {
  if (!token) return null;

  const [encodedPayload, signature] = token.split(".");
  if (!encodedPayload || !signature) return null;

  const expectedSignature = await signSessionPayload(encodedPayload);
  if (!constantTimeEqual(signature, expectedSignature)) return null;

  try {
    const payload = JSON.parse(base64UrlDecode(encodedPayload)) as DashboardSessionPayload;

    if (!payload?.userId || !payload?.email || !payload?.exp) return null;
    if (payload.exp < Math.floor(Date.now() / 1000)) return null;

    return payload;
  } catch {
    return null;
  }
}

async function signSessionPayload(encodedPayload: string) {
  const secret = process.env.DASHBOARD_AUTH_SECRET ?? process.env.CRON_SECRET;

  if (!secret) {
    throw new Error("Missing DASHBOARD_AUTH_SECRET or CRON_SECRET");
  }

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(encodedPayload)
  );

  return base64UrlEncodeBytes(new Uint8Array(signature));
}

function base64UrlEncode(value: string) {
  return base64UrlEncodeBytes(new TextEncoder().encode(value));
}

function base64UrlEncodeBytes(bytes: Uint8Array) {
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });

  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64UrlDecode(value: string) {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(
    Math.ceil(value.length / 4) * 4,
    "="
  );
  const binary = atob(padded);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));

  return new TextDecoder().decode(bytes);
}

function constantTimeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;

  let result = 0;
  for (let index = 0; index < a.length; index += 1) {
    result |= a.charCodeAt(index) ^ b.charCodeAt(index);
  }

  return result === 0;
}
