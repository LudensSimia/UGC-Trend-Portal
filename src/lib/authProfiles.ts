import { createSupabaseServerClient } from "@/lib/supabaseServer";
import { normalizeAccessTier, type AccessTier } from "@/lib/entitlements";

export type DashboardProfile = {
  id: string;
  email: string | null;
  role: "user" | "admin";
  subscription_tier: string;
  subscription_status: string;
  access_expires_at?: string | null;
};

export async function getOrCreateProfile(user: { id: string; email?: string | null }) {
  const supabase = createSupabaseServerClient();
  const { data: existing, error: readError } = await supabase
    .from("profiles")
    .select("id,email,role,subscription_tier,subscription_status,access_expires_at")
    .eq("id", user.id)
    .maybeSingle();

  if (readError) throw readError;
  if (existing) return existing as DashboardProfile;

  const { data, error } = await supabase
    .from("profiles")
    .insert({
      id: user.id,
      email: user.email ?? null,
      role: "user",
      subscription_tier: "free",
      subscription_status: "none",
    })
    .select("id,email,role,subscription_tier,subscription_status,access_expires_at")
    .single();

  if (error) throw error;

  return data as DashboardProfile;
}

export async function getProfileById(userId: string) {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("id,email,role,subscription_tier,subscription_status,access_expires_at")
    .eq("id", userId)
    .maybeSingle();

  if (error) throw error;

  return data as DashboardProfile | null;
}

export function resolveProfileAccessTier(profile?: DashboardProfile | null): AccessTier {
  if (!profile) return "free";
  if (profile.role === "admin" || profile.subscription_tier === "admin") return "admin";

  const tier = normalizeAccessTier(profile.subscription_tier);
  const activeStatus = ["active", "trialing"].includes(profile.subscription_status);
  const hasUnexpiredAccess =
    !profile.access_expires_at || new Date(profile.access_expires_at).getTime() > Date.now();

  if ((tier === "scout" || tier === "paid" || tier === "pro" || tier === "trial") && activeStatus && hasUnexpiredAccess) {
    return tier;
  }

  return tier === "newsletter" ? "newsletter" : "free";
}
