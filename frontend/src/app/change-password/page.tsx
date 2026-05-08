"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { changePasswordApi } from "@/lib/api";

export default function ChangePasswordPage() {
  const router = useRouter();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (next !== confirm) {
      setError("Passwords do not match");
      return;
    }
    setLoading(true);
    try {
      await changePasswordApi(current, next);
      router.push("/");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to change password");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex-1 flex items-center justify-center bg-[#07111F] py-12">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[#0F1B2D] border border-white/10 mb-6 shadow-lg">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          </div>
          <h1 className="text-2xl font-semibold text-white tracking-tight">Set your password</h1>
          <p className="mt-1 text-sm text-[#7C8BA1]">
            A new password is required before you can continue
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-3 bg-[#0F1B2D] rounded-2xl border border-white/5 p-6 shadow-xl">
            <div>
              <label className="block text-xs font-medium text-[#B6C2D1] mb-1.5">Current / temporary password</label>
              <input
                type="password"
                value={current}
                onChange={(e) => setCurrent(e.target.value)}
                required
                disabled={loading}
                className="w-full px-3 py-2.5 rounded-xl bg-[#07111F] border border-white/10 text-white text-sm placeholder-[#4B5563] focus:outline-none focus:ring-2 focus:ring-[#3B82F6]/40 focus:border-[#3B82F6]/60 transition disabled:opacity-50"
                placeholder="••••••••"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#B6C2D1] mb-1.5">New password</label>
              <input
                type="password"
                value={next}
                onChange={(e) => setNext(e.target.value)}
                required
                disabled={loading}
                className="w-full px-3 py-2.5 rounded-xl bg-[#07111F] border border-white/10 text-white text-sm placeholder-[#4B5563] focus:outline-none focus:ring-2 focus:ring-[#3B82F6]/40 focus:border-[#3B82F6]/60 transition disabled:opacity-50"
                placeholder="Min. 12 characters"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#B6C2D1] mb-1.5">Confirm new password</label>
              <input
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
                disabled={loading}
                className="w-full px-3 py-2.5 rounded-xl bg-[#07111F] border border-white/10 text-white text-sm placeholder-[#4B5563] focus:outline-none focus:ring-2 focus:ring-[#3B82F6]/40 focus:border-[#3B82F6]/60 transition disabled:opacity-50"
                placeholder="••••••••"
              />
            </div>
            <p className="text-xs text-[#7C8BA1]">
              Minimum 12 characters with at least 3 of: uppercase, lowercase, numbers, symbols.
            </p>
            {error && (
              <div className="rounded-xl bg-red-500/10 border border-red-500/20 px-3 py-2.5 text-sm text-red-400">
                {error}
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={loading || !current || !next || !confirm}
            className="w-full py-2.5 rounded-xl bg-[#22C55E] hover:bg-[#16A34A] text-white text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-green-500/20"
          >
            {loading ? "Saving…" : "Set password & continue"}
          </button>
        </form>
      </div>
    </div>
  );
}
