"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

type AuthMode = "login" | "signup" | "forgot" | "reset";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<AuthMode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [subscribeNewsletter, setSubscribeNewsletter] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [freeLoading, setFreeLoading] = useState(false);
  const supabase = useMemo(() => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    return url && anonKey
      ? createClient(url, anonKey, {
          auth: {
            persistSession: false,
            autoRefreshToken: false,
            detectSessionInUrl: false,
          },
        })
      : null;
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));

    if (params.get("mode") === "reset" || hash.get("type") === "recovery") {
      setMode("reset");
      setMessage("Create a new password to finish account recovery.");
    }
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");
    setLoading(true);

    try {
      if (mode === "login") {
        await submitLogin();
      } else if (mode === "signup") {
        await submitSignup();
      } else if (mode === "forgot") {
        await submitForgotPassword();
      } else {
        await submitPasswordUpdate();
      }
    } finally {
      setLoading(false);
    }
  }

  async function submitLogin() {
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      const payload = await response.json().catch(() => null);
      setError(payload?.error ?? "Unable to sign in");
      return;
    }

    await submitNewsletterOptIn();
    const nextPath =
      new URLSearchParams(window.location.search).get("next") || "/";

    router.replace(nextPath);
    router.refresh();
  }

  async function submitSignup() {
    const response = await fetch("/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const payload = await response.json().catch(() => null);

    if (!response.ok) {
      setError(payload?.error ?? "Unable to create account");
      return;
    }

    await submitNewsletterOptIn();

    if (payload?.requiresConfirmation) {
      setMessage("Check your email to confirm the account before signing in.");
      setMode("login");
      setPassword("");
      return;
    }

    router.replace("/");
    router.refresh();
  }

  async function submitNewsletterOptIn() {
    if (!subscribeNewsletter || !email) return;

    await fetch("/api/newsletter/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        frequency: "weekly",
        interests: ["roblox", "fortnite"],
      }),
    }).catch(() => null);
  }

  async function enterFreeDashboard() {
    setError("");
    setMessage("");
    setFreeLoading(true);

    try {
      const response = await fetch("/api/auth/free", { method: "POST" });

      if (!response.ok) {
        throw new Error("Unable to open the free dashboard.");
      }

      router.replace("/");
      router.refresh();
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to open the free dashboard."
      );
    } finally {
      setFreeLoading(false);
    }
  }

  async function submitForgotPassword() {
    await fetch("/api/auth/password-reset", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });

    setMessage("If an account exists for that email, a password reset link has been sent.");
    setMode("login");
    setPassword("");
  }

  async function submitPasswordUpdate() {
    if (!supabase) {
      setError("Authentication is not configured.");
      return;
    }

    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const accessToken = hash.get("access_token");
    const refreshToken = hash.get("refresh_token");

    if (!accessToken || !refreshToken) {
      setError("This recovery link is invalid or expired. Request a new reset email.");
      return;
    }

    const { error: sessionError } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });

    if (sessionError) {
      setError("This recovery link is invalid or expired. Request a new reset email.");
      return;
    }

    const { error: updateError } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (updateError) {
      setError("Unable to update password. Request a new reset email.");
      return;
    }

    await supabase.auth.signOut();
    window.history.replaceState({}, "", "/login");
    setMode("login");
    setPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setMessage("Password updated. Sign in with your new password.");
  }

  const title =
    mode === "signup"
      ? "Create your account"
      : mode === "forgot"
        ? "Reset your password"
        : mode === "reset"
          ? "Create a new password"
          : "Sign in";
  const buttonLabel =
    mode === "signup"
      ? "Create Account"
      : mode === "forgot"
        ? "Send Reset Email"
        : mode === "reset"
          ? "Update Password"
          : "Enter Dashboard";

  return (
    <main className="min-h-screen bg-[#eef0f3] px-5 py-8 text-slate-900">
      <section className="mx-auto grid min-h-[calc(100vh-4rem)] w-full max-w-6xl items-center gap-6 lg:grid-cols-2">
        <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm md:p-10">
          <div className="flex items-center gap-4">
            <img
              src="/LogoSnoutBoard.svg"
              alt="Snoutboard"
              className="h-16 w-16 object-contain"
            />
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-black tracking-tight md:text-3xl">
                  Snoutboard
                </h1>
                <span className="rounded-full bg-emerald-50 px-3 py-1 text-[10px] font-black uppercase tracking-wide text-emerald-700">
                  Beta
                </span>
              </div>
              <p className="mt-1 text-sm font-semibold text-slate-500">
                UGC Research Dashboard
              </p>
            </div>
          </div>

          <div className="mt-8 rounded-3xl border border-[#b9d6ea] bg-[#eaf5fd] p-5">
            <p className="text-sm font-black text-[#0d4f82]">
              Disclaimer & Acknowledgement
            </p>
            <p className="mt-2 text-sm leading-6 text-[#24465d]">
              Snoutboard is independent and is not affiliated with, endorsed by,
              sponsored by, or operated by Roblox, Epic Games, Fortnite, or any
              related platform owner. By entering the portal, you acknowledge
              that Snoutboard provides processed research information only, and
              that it is not official platform guidance or a guarantee of
              business or game performance.
            </p>
          </div>
        </div>

        <div className="relative rounded-[2rem] border border-slate-200 bg-white p-6 pb-12 shadow-sm">
          <div className="mb-6">
            <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-900">
              {title}
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              Enter with your account, create one, or preview the free dashboard.
            </p>
          </div>

          <form className="space-y-4" onSubmit={handleSubmit}>
          {mode !== "reset" && (
            <label className="block text-sm font-bold text-slate-600">
              Email
              <input
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none ring-[#0d69ac] transition focus:border-[#0d69ac] focus:bg-white focus:ring-2"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="email"
                autoFocus
                required
              />
            </label>
          )}

          {(mode === "login" || mode === "signup") && (
            <label className="block text-sm font-bold text-slate-600">
              Password
              <input
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none ring-[#0d69ac] transition focus:border-[#0d69ac] focus:bg-white focus:ring-2"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete={mode === "signup" ? "new-password" : "current-password"}
                minLength={8}
                required
              />
            </label>
          )}

          {mode === "login" && (
            <button
              type="button"
              onClick={() => {
                setMode("forgot");
                setError("");
              setMessage("");
              }}
              className="text-sm font-bold text-[#0d69ac] transition hover:text-[#084b79]"
            >
              Forgot your password?
            </button>
          )}

          {mode === "reset" && (
            <>
              <label className="block text-sm font-bold text-slate-600">
                New password
                <input
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none ring-[#0d69ac] transition focus:border-[#0d69ac] focus:bg-white focus:ring-2"
                  type="password"
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                  autoComplete="new-password"
                  minLength={8}
                  required
                />
              </label>
              <label className="block text-sm font-bold text-slate-600">
                Confirm password
                <input
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none ring-[#0d69ac] transition focus:border-[#0d69ac] focus:bg-white focus:ring-2"
                  type="password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  autoComplete="new-password"
                  minLength={8}
                  required
                />
              </label>
            </>
          )}

          {message && (
            <p className="rounded-2xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700">
              {message}
            </p>
          )}

          {error && (
            <p className="rounded-2xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">
              {error}
            </p>
          )}

          <button
            className="w-full rounded-2xl bg-[#0d69ac] px-4 py-3 text-sm font-black uppercase tracking-wide text-white transition hover:bg-[#2f83bd] disabled:cursor-not-allowed disabled:opacity-60"
            type="submit"
            disabled={
              loading ||
              (mode !== "reset" && !email) ||
              ((mode === "login" || mode === "signup") && !password) ||
              (mode === "reset" && (!newPassword || !confirmPassword))
            }
          >
            {loading ? "Please wait..." : buttonLabel}
          </button>

          {mode === "login" && (
            <button
              type="button"
              onClick={enterFreeDashboard}
              disabled={freeLoading}
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-black uppercase tracking-wide text-slate-600 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {freeLoading ? "Opening preview..." : "Access Free Version"}
            </button>
          )}
        </form>

        {mode !== "reset" && (
          <div className="mt-5 border-t border-slate-200 pt-4 text-sm text-slate-500">
            {mode !== "forgot" && (
              <label className="mb-4 flex items-start gap-3 rounded-2xl bg-slate-50 p-3 text-sm font-semibold leading-5 text-slate-600">
                <input
                  type="checkbox"
                  checked={subscribeNewsletter}
                  onChange={(event) => setSubscribeNewsletter(event.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-slate-300 accent-[#0d69ac]"
                />
                <span>
                  Subscribe to the weekly Snoutboard research newsletter.
                </span>
              </label>
            )}
            {mode === "signup" ? (
              <button
                type="button"
                onClick={() => {
                  setMode("login");
                  setError("");
                  setMessage("");
                }}
                className="font-bold text-[#0d69ac] transition hover:text-[#084b79]"
              >
                Already have an account? Sign in.
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setMode("signup");
                  setError("");
                  setMessage("");
                }}
                className="font-bold text-[#0d69ac] transition hover:text-[#084b79]"
              >
                New here? Create an account.
              </button>
            )}
          </div>
        )}
          <p className="absolute bottom-5 right-6 rounded-full bg-slate-50 px-3 py-1 text-[10px] font-black uppercase tracking-wide text-slate-400">
            V0.0.1
          </p>
        </div>
      </section>
    </main>
  );
}
