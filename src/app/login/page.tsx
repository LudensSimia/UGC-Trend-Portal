"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);

    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });

    setLoading(false);

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

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#111318] px-6 text-slate-100">
      <section className="w-full max-w-sm rounded-2xl border border-[#303540] bg-[#191c22] p-6 shadow-2xl">
        <div className="mb-6">
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-[#5fbfd0]">
            Private Preview
          </p>
          <h1 className="mt-3 text-2xl font-black tracking-tight">UGC Intel</h1>
          <p className="mt-2 text-sm text-slate-400">
            Enter the dashboard password to continue.
          </p>
        </div>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <label className="block text-sm font-semibold text-slate-300">
            Password
            <input
              className="mt-2 w-full rounded-xl border border-[#303540] bg-[#111318] px-4 py-3 text-slate-100 outline-none ring-[#5fbfd0] transition focus:ring-2"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
              autoFocus
            />
          </label>

          {error && (
            <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
              {error}
            </p>
          )}

          <button
            className="w-full rounded-xl bg-[#5fbfd0] px-4 py-3 text-sm font-black text-[#111318] transition hover:bg-[#7bd2df] disabled:cursor-not-allowed disabled:opacity-60"
            type="submit"
            disabled={loading || !password}
          >
            {loading ? "Checking..." : "Enter Dashboard"}
          </button>
        </form>
      </section>
    </main>
  );
}
