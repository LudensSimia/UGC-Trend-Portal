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
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const supabase = useMemo(() => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    return url && anonKey ? createClient(url, anonKey) : null;
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

    if (payload?.requiresConfirmation) {
      setMessage("Check your email to confirm the account before signing in.");
      setMode("login");
      setPassword("");
      return;
    }

    router.replace("/");
    router.refresh();
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
    <main className="flex min-h-screen items-center justify-center bg-[#111318] px-6 text-slate-100">
      <section className="w-full max-w-sm rounded-2xl border border-[#303540] bg-[#191c22] p-6 shadow-2xl">
        <div className="mb-6">
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-[#0d69ac]">
            Private Beta
          </p>
          <h1 className="mt-3 text-2xl font-black tracking-tight">
            Snoutboard
          </h1>
          <p className="mt-2 text-sm text-slate-400">
            {title}
          </p>
        </div>

        <form className="space-y-4" onSubmit={handleSubmit}>
          {mode !== "reset" && (
            <label className="block text-sm font-semibold text-slate-300">
              Email
              <input
                className="mt-2 w-full rounded-xl border border-[#303540] bg-[#111318] px-4 py-3 text-slate-100 outline-none ring-[#0d69ac] transition focus:ring-2"
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
            <label className="block text-sm font-semibold text-slate-300">
              Password
              <input
                className="mt-2 w-full rounded-xl border border-[#303540] bg-[#111318] px-4 py-3 text-slate-100 outline-none ring-[#0d69ac] transition focus:ring-2"
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
              className="text-sm font-bold text-[#72b8e8] transition hover:text-white"
            >
              Forgot your password?
            </button>
          )}

          {mode === "reset" && (
            <>
              <label className="block text-sm font-semibold text-slate-300">
                New password
                <input
                  className="mt-2 w-full rounded-xl border border-[#303540] bg-[#111318] px-4 py-3 text-slate-100 outline-none ring-[#0d69ac] transition focus:ring-2"
                  type="password"
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                  autoComplete="new-password"
                  minLength={8}
                  required
                />
              </label>
              <label className="block text-sm font-semibold text-slate-300">
                Confirm password
                <input
                  className="mt-2 w-full rounded-xl border border-[#303540] bg-[#111318] px-4 py-3 text-slate-100 outline-none ring-[#0d69ac] transition focus:ring-2"
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
            <p className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-100">
              {message}
            </p>
          )}

          {error && (
            <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
              {error}
            </p>
          )}

          <button
            className="w-full rounded-xl bg-[#0d69ac] px-4 py-3 text-sm font-black text-white transition hover:bg-[#2f83bd] disabled:cursor-not-allowed disabled:opacity-60"
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
        </form>

        {mode !== "reset" && (
          <div className="mt-5 border-t border-[#303540] pt-4 text-sm text-slate-400">
            {mode === "signup" ? (
              <button
                type="button"
                onClick={() => {
                  setMode("login");
                  setError("");
                  setMessage("");
                }}
                className="font-bold text-[#72b8e8] transition hover:text-white"
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
                className="font-bold text-[#72b8e8] transition hover:text-white"
              >
                New here? Create an account.
              </button>
            )}
          </div>
        )}
      </section>
    </main>
  );
}
