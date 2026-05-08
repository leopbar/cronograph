"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CheckCircle2,
  History,
  Database,
  Calendar,
  Settings,
  FileText,
  HelpCircle,
  Clock,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  ClipboardList,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useUser, logout } from "@/lib/auth";

const MAIN_NAV = [
  { name: "Extract Data", href: "/", icon: CheckCircle2 },
  { name: "Analysis", href: "/analysis", icon: Database },
  { name: "Extraction History", href: "/previous", icon: History },
  { name: "Saved Analyses", href: "/saved", icon: FileText, disabled: true },
  { name: "Schedules", href: "/schedules", icon: Calendar, disabled: true },
  { name: "Settings", href: "/settings", icon: Settings, disabled: true },
  { name: "System Logs", href: "/logs", icon: Clock, disabled: true },
  { name: "Help", href: "/help", icon: HelpCircle, disabled: true },
];

const ADMIN_NAV = [
  { name: "Users", href: "/admin/users", icon: ShieldCheck },
  { name: "Audit Log", href: "/admin/audit", icon: ClipboardList },
];

export function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = React.useState(false);
  const user = useUser();

  return (
    <div
      className={cn(
        "flex h-full flex-col bg-[#07111F] border-r border-white/5 transition-all duration-300 ease-in-out flex-shrink-0",
        collapsed ? "w-[68px]" : "w-72"
      )}
    >
      {/* Logo Area */}
      <div className={cn("flex h-24 items-center border-b border-white/5 relative", collapsed ? "justify-center px-0" : "px-8")}>
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="h-10 w-10 rounded-full bg-blue-600 flex items-center justify-center shadow-[0_0_15px_rgba(37,99,235,0.4)] flex-shrink-0">
            <Clock className="h-6 w-6 text-white" />
          </div>
          {!collapsed && (
            <div className="overflow-hidden">
              <span className="font-bold text-xl text-white tracking-tight leading-tight block whitespace-nowrap">Cronograph</span>
              <span className="text-xs text-[#7C8BA1] block font-medium whitespace-nowrap">Bitcoin Data Extraction</span>
            </div>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className={cn("flex-1 space-y-1.5 py-8 overflow-y-auto", collapsed ? "px-2" : "px-4")}>
        {MAIN_NAV.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.name}
              href={item.disabled ? "#" : item.href}
              title={collapsed ? item.name : undefined}
              className={cn(
                "group flex items-center py-3.5 text-sm font-semibold rounded-xl transition-all duration-200",
                collapsed ? "justify-center px-0" : "px-4",
                isActive
                  ? "bg-[#22C55E]/10 text-[#22C55E] shadow-[inset_0_0_12px_rgba(34,197,94,0.05)]"
                  : "text-[#B6C2D1] hover:bg-white/5 hover:text-white",
                item.disabled && "opacity-40 cursor-not-allowed hover:bg-transparent hover:text-[#B6C2D1]"
              )}
            >
              <item.icon
                className={cn(
                  "h-5 w-5 flex-shrink-0 transition-colors",
                  !collapsed && "mr-3.5",
                  isActive ? "text-[#22C55E]" : "text-[#7C8BA1] group-hover:text-[#B6C2D1]"
                )}
                aria-hidden="true"
              />
              {!collapsed && item.name}
            </Link>
          );
        })}

        {/* Admin section — only for admins */}
        {user?.role === "admin" && (
          <>
            {!collapsed && (
              <div className="pt-4 pb-1 px-4">
                <span className="text-[10px] font-semibold uppercase tracking-widest text-[#4B5563]">Admin</span>
              </div>
            )}
            {collapsed && <div className="border-t border-white/5 my-2" />}
            {ADMIN_NAV.map((item) => {
              const isActive = pathname.startsWith(item.href);
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  title={collapsed ? item.name : undefined}
                  className={cn(
                    "group flex items-center py-3.5 text-sm font-semibold rounded-xl transition-all duration-200",
                    collapsed ? "justify-center px-0" : "px-4",
                    isActive
                      ? "bg-[#3B82F6]/10 text-[#3B82F6]"
                      : "text-[#B6C2D1] hover:bg-white/5 hover:text-white"
                  )}
                >
                  <item.icon
                    className={cn(
                      "h-5 w-5 flex-shrink-0 transition-colors",
                      !collapsed && "mr-3.5",
                      isActive ? "text-[#3B82F6]" : "text-[#7C8BA1] group-hover:text-[#B6C2D1]"
                    )}
                    aria-hidden="true"
                  />
                  {!collapsed && item.name}
                </Link>
              );
            })}
          </>
        )}
      </nav>

      {/* System Status Footer */}
      {!collapsed && (
        <div className="px-4 pb-3">
          <div className="rounded-2xl border border-white/5 bg-[#0F1B2D] p-4 shadow-xl">
            <div className="flex items-center gap-2.5 mb-1.5">
              <div className="h-2.5 w-2.5 rounded-full bg-[#22C55E] shadow-[0_0_10px_rgba(34,197,94,0.8)] animate-pulse" />
              <span className="text-sm font-semibold text-white">System Status</span>
            </div>
            <span className="text-xs text-[#B6C2D1] block pl-5 font-medium">Online</span>
            {user && (
              <div className="mt-2 pl-5 text-xs text-[#7C8BA1]">
                {user.username}
                {user.role === "admin" && (
                  <span className="ml-1.5 px-1.5 py-0.5 rounded-full bg-[#3B82F6]/15 text-[#3B82F6] text-[10px] font-medium">admin</span>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {collapsed && (
        <div className="flex justify-center pb-3">
          <div className="h-2.5 w-2.5 rounded-full bg-[#22C55E] shadow-[0_0_10px_rgba(34,197,94,0.8)] animate-pulse" />
        </div>
      )}

      {/* Logout */}
      <button
        onClick={() => logout()}
        title={collapsed ? "Sign Out" : undefined}
        className={cn(
          "flex items-center text-[#7C8BA1] hover:text-red-400 hover:bg-red-500/5 transition-all border-t border-white/5 py-3",
          collapsed ? "justify-center" : "px-6 gap-3"
        )}
      >
        <LogOut className="h-4 w-4 flex-shrink-0" />
        {!collapsed && <span className="text-sm font-medium">Sign Out</span>}
      </button>

      {/* Toggle Button */}
      <button
        onClick={() => setCollapsed((c) => !c)}
        className="flex items-center justify-center h-10 w-full border-t border-white/5 text-[#7C8BA1] hover:text-white hover:bg-white/5 transition-all"
        title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
      >
        {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
      </button>
    </div>
  );
}
