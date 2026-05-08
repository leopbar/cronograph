"use client";

import { useEffect, useState } from "react";
import { getMeApi, logoutApi, type UserInfo } from "./api";

export type { UserInfo };

export function useUser() {
  const [user, setUser] = useState<UserInfo | null | undefined>(undefined);

  useEffect(() => {
    getMeApi().then(setUser);
  }, []);

  return user;
}

export async function logout(): Promise<void> {
  await logoutApi().catch(() => {});
  window.location.href = "/login";
}
