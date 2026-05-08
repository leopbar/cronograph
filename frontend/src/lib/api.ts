const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8001";

function getCsrfToken(): string {
  if (typeof document === "undefined") return "";
  const match = document.cookie.match(/(?:^|;\s*)csrf_token=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : "";
}

let _refreshing: Promise<boolean> | null = null;

async function _tryRefresh(): Promise<boolean> {
  if (_refreshing) return _refreshing;
  _refreshing = fetch(`${API_URL}/auth/refresh`, {
    method: "POST",
    credentials: "include",
  })
    .then((r) => r.ok)
    .catch(() => false)
    .finally(() => { _refreshing = null; });
  return _refreshing;
}

export async function apiFetch(
  input: string,
  init: RequestInit = {},
): Promise<Response> {
  const method = (init.method ?? "GET").toUpperCase();
  const isMutation = !["GET", "HEAD", "OPTIONS"].includes(method);

  const headers: Record<string, string> = {
    ...(init.headers as Record<string, string>),
  };
  if (isMutation) {
    if (!headers["Content-Type"]) headers["Content-Type"] = "application/json";
    const csrf = getCsrfToken();
    if (csrf) headers["X-CSRF-Token"] = csrf;
  }

  const url = input.startsWith("http") ? input : `${API_URL}${input}`;
  let response = await fetch(url, { ...init, headers, credentials: "include" });

  if (response.status === 401) {
    const refreshed = await _tryRefresh();
    if (refreshed) {
      // Rebuild CSRF for retry after refresh (new csrf_token cookie)
      if (isMutation) {
        const csrf = getCsrfToken();
        if (csrf) headers["X-CSRF-Token"] = csrf;
      }
      response = await fetch(url, { ...init, headers, credentials: "include" });
    } else {
      if (typeof window !== "undefined") window.location.href = "/login";
    }
  }

  return response;
}

// ─── Public helpers (no auth required) ──────────────────────────────────────

export async function fetchSymbols(query: string): Promise<string[]> {
  const response = await apiFetch(`/symbols/?q=${encodeURIComponent(query)}`);
  if (!response.ok) return [];
  return response.json();
}

export interface ExtractionPreviewRequest {
  symbol: string;
  interval: string;
  range_from: string;
  range_to: string;
}

export interface ExtractionEstimate {
  candles_total: number;
  requests_total: number;
  eta_seconds: number;
  mb_estimate: number;
}

export async function getExtractionPreview(
  request: ExtractionPreviewRequest,
): Promise<ExtractionEstimate> {
  const response = await apiFetch("/extractions/preview", {
    method: "POST",
    body: JSON.stringify(request),
  });
  if (!response.ok) throw new Error("Failed to get preview");
  return response.json();
}

export async function startExtraction(
  request: ExtractionPreviewRequest,
): Promise<{ job_id: string }> {
  const response = await apiFetch("/extractions/", {
    method: "POST",
    body: JSON.stringify(request),
  });
  if (!response.ok) throw new Error("Failed to start extraction");
  return response.json();
}

export interface Coverage {
  symbol: string;
  interval: string;
  range_from: string;
  range_to: string;
}

export async function getCoverageHistory(): Promise<Coverage[]> {
  const response = await apiFetch("/extractions/coverage");
  if (!response.ok) return [];
  return response.json();
}

// ─── Auth ────────────────────────────────────────────────────────────────────

export interface UserInfo {
  id: string;
  email: string;
  username: string;
  role: "admin" | "user";
  must_change_password: boolean;
}

export async function loginApi(
  username: string,
  password: string,
): Promise<UserInfo> {
  const response = await fetch(`${API_URL}/auth/login`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.detail ?? "Invalid credentials");
  }
  return response.json();
}

export async function logoutApi(): Promise<void> {
  await apiFetch("/auth/logout", { method: "POST" });
}

export async function getMeApi(): Promise<UserInfo | null> {
  try {
    const response = await apiFetch("/auth/me");
    if (!response.ok) return null;
    return response.json();
  } catch {
    return null;
  }
}

export async function changePasswordApi(
  currentPassword: string,
  newPassword: string,
): Promise<void> {
  const response = await apiFetch("/auth/change-password", {
    method: "POST",
    body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }),
  });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.detail ?? "Failed to change password");
  }
}

// ─── Admin ───────────────────────────────────────────────────────────────────

export interface AdminUser {
  id: string;
  email: string;
  username: string;
  role: string;
  is_active: boolean;
  must_change_password: boolean;
  failed_login_attempts: number;
  locked_until: string | null;
  last_login_at: string | null;
  created_at: string;
}

export interface AuditLogEntry {
  id: number;
  user_id: string | null;
  event: string;
  ip: string | null;
  user_agent: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export async function adminListUsers(): Promise<AdminUser[]> {
  const r = await apiFetch("/admin/users");
  if (!r.ok) throw new Error("Erro ao buscar usuários");
  return r.json();
}

export async function adminCreateUser(
  email: string,
  username: string,
  role: string,
): Promise<{ temp_password: string }> {
  const r = await apiFetch("/admin/users", {
    method: "POST",
    body: JSON.stringify({ email, username, role }),
  });
  if (!r.ok) {
    const d = await r.json().catch(() => ({}));
    throw new Error(d.detail ?? "Erro ao criar usuário");
  }
  return r.json();
}

export async function adminUpdateUser(
  userId: string,
  updates: Partial<Pick<AdminUser, "email" | "username" | "role" | "is_active">>,
): Promise<AdminUser> {
  const r = await apiFetch(`/admin/users/${userId}`, {
    method: "PATCH",
    body: JSON.stringify(updates),
  });
  if (!r.ok) {
    const d = await r.json().catch(() => ({}));
    throw new Error(d.detail ?? "Erro ao atualizar usuário");
  }
  return r.json();
}

export async function adminResetPassword(userId: string): Promise<{ temp_password: string }> {
  const r = await apiFetch(`/admin/users/${userId}/reset-password`, { method: "POST" });
  if (!r.ok) throw new Error("Erro ao resetar senha");
  return r.json();
}

export async function adminUnlockUser(userId: string): Promise<AdminUser> {
  const r = await apiFetch(`/admin/users/${userId}/unlock`, { method: "POST" });
  if (!r.ok) throw new Error("Erro ao desbloquear usuário");
  return r.json();
}

export async function adminGetAuditLog(
  skip = 0,
  limit = 50,
): Promise<AuditLogEntry[]> {
  const r = await apiFetch(`/admin/audit-log?skip=${skip}&limit=${limit}`);
  if (!r.ok) throw new Error("Erro ao buscar audit log");
  return r.json();
}
