"use client";

import { useEffect, useState } from "react";
import { adminGetAuditLog, type AuditLogEntry } from "@/lib/api";
import { useUser } from "@/lib/auth";
import { useRouter } from "next/navigation";

const EVENT_COLORS: Record<string, string> = {
  login_success: "text-[#22C55E] bg-[#22C55E]/10",
  login_failure: "text-red-400 bg-red-500/10",
  logout: "text-[#7C8BA1] bg-white/5",
  password_changed: "text-[#3B82F6] bg-[#3B82F6]/10",
  user_created: "text-[#22C55E] bg-[#22C55E]/10",
  user_updated: "text-[#3B82F6] bg-[#3B82F6]/10",
  password_reset_by_admin: "text-yellow-400 bg-yellow-400/10",
  refresh_reuse_detected: "text-red-400 bg-red-500/10",
  user_unlocked: "text-[#22C55E] bg-[#22C55E]/10",
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("en-US", { timeZone: "America/Sao_Paulo" });
}

export default function AuditLogPage() {
  const user = useUser();
  const router = useRouter();
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [skip, setSkip] = useState(0);
  const limit = 50;

  useEffect(() => {
    if (user === null) router.push("/login");
    if (user && user.role !== "admin") router.push("/");
  }, [user, router]);

  useEffect(() => {
    if (user?.role === "admin") {
      void (async () => {
        setLoading(true);
        try {
          const data = await adminGetAuditLog(skip, limit);
          setLogs(data);
        } finally {
          setLoading(false);
        }
      })();
    }
  }, [user, skip]);

  if (!user || user.role !== "admin") return null;

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-white">Audit Log</h1>
        <p className="text-sm text-[#7C8BA1] mt-1">Record of all system actions</p>
      </div>

      {loading ? (
        <div className="text-[#7C8BA1] text-sm">Loading...</div>
      ) : (
        <div className="bg-[#0F1B2D] rounded-2xl border border-white/5 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/5 text-[#7C8BA1] text-xs uppercase tracking-wider">
                <th className="text-left px-4 py-3">Date / Time</th>
                <th className="text-left px-4 py-3">Event</th>
                <th className="text-left px-4 py-3">IP</th>
                <th className="text-left px-4 py-3">Details</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id} className="border-b border-white/5 last:border-0 hover:bg-white/[0.02] transition-colors">
                  <td className="px-4 py-3 text-[#7C8BA1] font-mono text-xs whitespace-nowrap">
                    {formatDate(log.created_at)}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${EVENT_COLORS[log.event] ?? "text-[#B6C2D1] bg-white/5"}`}>
                      {log.event}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-[#B6C2D1]">{log.ip ?? "—"}</td>
                  <td className="px-4 py-3 text-xs text-[#7C8BA1] max-w-xs truncate">
                    {log.metadata ? JSON.stringify(log.metadata) : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="flex items-center justify-between px-4 py-3 border-t border-white/5 text-xs text-[#7C8BA1]">
            <button
              disabled={skip === 0}
              onClick={() => setSkip(Math.max(0, skip - limit))}
              className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 disabled:opacity-30 transition-colors"
            >
              ← Previous
            </button>
            <span>Page {Math.floor(skip / limit) + 1}</span>
            <button
              disabled={logs.length < limit}
              onClick={() => setSkip(skip + limit)}
              className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 disabled:opacity-30 transition-colors"
            >
              Next →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
