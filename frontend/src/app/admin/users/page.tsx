"use client";

import { useEffect, useState } from "react";
import {
  adminCreateUser,
  adminListUsers,
  adminResetPassword,
  adminUnlockUser,
  adminUpdateUser,
  type AdminUser,
} from "@/lib/api";
import { useUser } from "@/lib/auth";
import { useRouter } from "next/navigation";

export default function AdminUsersPage() {
  const user = useUser();
  const router = useRouter();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [showCreate, setShowCreate] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [newUsername, setNewUsername] = useState("");
  const [newRole, setNewRole] = useState("user");
  const [creating, setCreating] = useState(false);
  const [tempPassword, setTempPassword] = useState("");

  useEffect(() => {
    if (user === null) router.push("/login");
    if (user && user.role !== "admin") router.push("/");
  }, [user, router]);

  useEffect(() => {
    if (user?.role === "admin") {
      adminListUsers()
        .then(setUsers)
        .catch((e: unknown) => setError(e instanceof Error ? e.message : "Failed to load users"))
        .finally(() => setLoading(false));
    }
  }, [user]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setError("");
    try {
      const { temp_password } = await adminCreateUser(newEmail, newUsername, newRole);
      setTempPassword(temp_password);
      setNewEmail("");
      setNewUsername("");
      setNewRole("user");
      const updated = await adminListUsers();
      setUsers(updated);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to create user");
    } finally {
      setCreating(false);
    }
  }

  async function handleToggleActive(u: AdminUser) {
    try {
      const updated = await adminUpdateUser(u.id, { is_active: !u.is_active });
      setUsers((prev) => prev.map((x) => (x.id === u.id ? updated : x)));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to update user");
    }
  }

  async function handleResetPassword(u: AdminUser) {
    try {
      const { temp_password } = await adminResetPassword(u.id);
      setTempPassword(`Temporary password for ${u.username}: ${temp_password}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to reset password");
    }
  }

  async function handleUnlock(u: AdminUser) {
    try {
      const updated = await adminUnlockUser(u.id);
      setUsers((prev) => prev.map((x) => (x.id === u.id ? updated : x)));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to unlock user");
    }
  }

  if (!user || user.role !== "admin") return null;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white">Manage Users</h1>
          <p className="text-sm text-[#7C8BA1] mt-1">{users.length} user(s) registered</p>
        </div>
        <button
          onClick={() => { setShowCreate(!showCreate); setTempPassword(""); }}
          className="px-4 py-2 rounded-xl bg-[#3B82F6] hover:bg-[#2563EB] text-white text-sm font-medium transition-colors"
        >
          {showCreate ? "Cancel" : "+ New user"}
        </button>
      </div>

      {error && (
        <div className="rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-400 flex items-center justify-between">
          {error}
          <button onClick={() => setError("")} className="text-red-400/60 hover:text-red-400 ml-4">✕</button>
        </div>
      )}

      {tempPassword && (
        <div className="rounded-xl bg-[#22C55E]/10 border border-[#22C55E]/20 px-4 py-3 text-sm text-[#22C55E] flex items-center justify-between">
          <span>
            <span className="font-medium">Temporary password:</span>{" "}
            <code className="font-mono bg-black/20 px-2 py-0.5 rounded">{tempPassword}</code>
            <span className="text-[#7C8BA1] ml-2">— share this securely with the user</span>
          </span>
          <button onClick={() => setTempPassword("")} className="text-[#22C55E]/60 hover:text-[#22C55E] ml-4">✕</button>
        </div>
      )}

      {showCreate && (
        <form onSubmit={handleCreate} className="bg-[#0F1B2D] rounded-2xl border border-white/5 p-6 space-y-4">
          <h2 className="text-sm font-medium text-[#B6C2D1]">Create new user</h2>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-xs text-[#7C8BA1] mb-1.5">Email</label>
              <input
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                required
                className="w-full px-3 py-2 rounded-xl bg-[#07111F] border border-white/10 text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#3B82F6]/40 transition"
                placeholder="user@example.com"
              />
            </div>
            <div>
              <label className="block text-xs text-[#7C8BA1] mb-1.5">Username</label>
              <input
                type="text"
                value={newUsername}
                onChange={(e) => setNewUsername(e.target.value)}
                required
                className="w-full px-3 py-2 rounded-xl bg-[#07111F] border border-white/10 text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#3B82F6]/40 transition"
                placeholder="username"
              />
            </div>
            <div>
              <label className="block text-xs text-[#7C8BA1] mb-1.5">Role</label>
              <select
                value={newRole}
                onChange={(e) => setNewRole(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-[#07111F] border border-white/10 text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#3B82F6]/40 transition"
              >
                <option value="user">user</option>
                <option value="admin">admin</option>
              </select>
            </div>
          </div>
          <button
            type="submit"
            disabled={creating}
            className="px-4 py-2 rounded-xl bg-[#22C55E] hover:bg-[#16A34A] text-white text-sm font-medium transition-colors disabled:opacity-50"
          >
            {creating ? "Creating…" : "Create user"}
          </button>
        </form>
      )}

      {loading ? (
        <div className="text-[#7C8BA1] text-sm">Loading...</div>
      ) : (
        <div className="bg-[#0F1B2D] rounded-2xl border border-white/5 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/5 text-[#7C8BA1] text-xs uppercase tracking-wider">
                <th className="text-left px-4 py-3">Username</th>
                <th className="text-left px-4 py-3">Email</th>
                <th className="text-left px-4 py-3">Role</th>
                <th className="text-left px-4 py-3">Status</th>
                <th className="text-left px-4 py-3">Failed logins</th>
                <th className="text-right px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-b border-white/5 last:border-0 hover:bg-white/[0.02] transition-colors">
                  <td className="px-4 py-3 font-medium text-white">{u.username}</td>
                  <td className="px-4 py-3 text-[#B6C2D1]">{u.email}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${u.role === "admin" ? "bg-[#3B82F6]/15 text-[#3B82F6]" : "bg-white/5 text-[#7C8BA1]"}`}>
                      {u.role}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {u.locked_until ? (
                      <span className="text-red-400 text-xs">Locked</span>
                    ) : u.is_active ? (
                      <span className="text-[#22C55E] text-xs">Active</span>
                    ) : (
                      <span className="text-[#7C8BA1] text-xs">Inactive</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-[#B6C2D1]">{u.failed_login_attempts}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      {u.locked_until && (
                        <button
                          onClick={() => handleUnlock(u)}
                          className="px-2.5 py-1 rounded-lg bg-[#22C55E]/10 text-[#22C55E] text-xs hover:bg-[#22C55E]/20 transition-colors"
                        >
                          Unlock
                        </button>
                      )}
                      <button
                        onClick={() => handleResetPassword(u)}
                        className="px-2.5 py-1 rounded-lg bg-[#3B82F6]/10 text-[#3B82F6] text-xs hover:bg-[#3B82F6]/20 transition-colors"
                      >
                        Reset password
                      </button>
                      <button
                        onClick={() => handleToggleActive(u)}
                        className="px-2.5 py-1 rounded-lg bg-white/5 text-[#B6C2D1] text-xs hover:bg-white/10 transition-colors"
                      >
                        {u.is_active ? "Deactivate" : "Activate"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
