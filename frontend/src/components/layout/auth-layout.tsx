"use client";

import { usePathname } from "next/navigation";
import { Sidebar } from "./sidebar";

const NO_SIDEBAR_PATHS = ["/login", "/change-password"];

export function AuthLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const hideSidebar = NO_SIDEBAR_PATHS.some((p) => pathname.startsWith(p));

  if (hideSidebar) {
    return <div className="flex-1 flex flex-col overflow-y-auto">{children}</div>;
  }

  return (
    <>
      <Sidebar />
      <main className="flex-1 overflow-y-auto overflow-x-hidden relative bg-blue-glow">
        {children}
      </main>
    </>
  );
}
