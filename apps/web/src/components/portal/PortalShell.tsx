"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "firebase/auth";
import { ChevronsLeft, ChevronsRight, LogOut, Menu, X } from "lucide-react";
import { getFirebaseAuth } from "@/lib/firebase/client";
import { useAuth } from "@/lib/firebase/authContext";
import { Sidebar, type NavSection } from "./Sidebar";

const COLLAPSE_KEY = "portalSidebarCollapsed";

export function PortalShell({
  eyebrow,
  title,
  brandHref = "/",
  sections,
  crossLink,
  children,
}: {
  eyebrow: string;
  title: string;
  brandHref?: string;
  sections: NavSection[];
  crossLink?: { href: string; label: string };
  children: React.ReactNode;
}) {
  const [collapsed, setCollapsed] = useState(
    () => typeof window !== "undefined" && window.localStorage.getItem(COLLAPSE_KEY) === "1"
  );
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user } = useAuth();
  const pathname = usePathname();

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMobileOpen(false);
  }, [pathname]);

  function toggleCollapsed() {
    setCollapsed((prev) => {
      window.localStorage.setItem(COLLAPSE_KEY, prev ? "0" : "1");
      return !prev;
    });
  }

  async function handleSignOut() {
    await signOut(getFirebaseAuth());
  }

  const footer = (
    <div className={`clinical-card flex items-center gap-2 rounded-xl p-2.5 ${collapsed ? "justify-center" : ""}`}>
      <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[color:var(--primary-soft)] text-xs font-bold text-[color:var(--primary-strong)]">
        {(user?.email ?? "?").slice(0, 1).toUpperCase()}
      </div>
      {!collapsed && (
        <div className="min-w-0 flex-1">
          <div className="truncate text-xs font-semibold text-[color:var(--secondary)]">
            {user?.email ?? "Signed in"}
          </div>
        </div>
      )}
      <button
        type="button"
        onClick={handleSignOut}
        title="Sign out"
        className="grid size-7 shrink-0 place-items-center rounded-lg text-[color:var(--muted)] hover:bg-[color:var(--surface-muted)] hover:text-[color:var(--danger)]"
      >
        <LogOut size={15} />
      </button>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-[color:var(--background)]">
      <aside
        className={`sidebar-rail sticky top-0 hidden h-screen shrink-0 transition-[width] duration-200 md:flex ${
          collapsed ? "w-[76px]" : "w-[264px]"
        }`}
      >
        <div className="flex w-full flex-col">
          <div className={`flex items-center gap-2 px-4 pt-4 ${collapsed ? "justify-center px-0" : "justify-between"}`}>
            {!collapsed && (
              <Link href={brandHref} className="min-w-0">
                <div className="truncate text-[11px] font-bold uppercase tracking-wide text-[color:var(--primary)]">
                  {eyebrow}
                </div>
                <div className="truncate text-base font-semibold text-[color:var(--secondary)]">{title}</div>
              </Link>
            )}
            <button
              type="button"
              onClick={toggleCollapsed}
              className="grid size-8 shrink-0 place-items-center rounded-lg text-[color:var(--muted)] hover:bg-white/70"
              title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {collapsed ? <ChevronsRight size={16} /> : <ChevronsLeft size={16} />}
            </button>
          </div>
          <div className="mt-2 flex-1 overflow-hidden">
            <Sidebar sections={sections} collapsed={collapsed} footer={footer} />
          </div>
        </div>
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMobileOpen(false)} />
          <div className="sidebar-rail absolute inset-y-0 left-0 flex w-[264px] flex-col bg-[color:var(--background)]">
            <div className="flex items-center justify-between px-4 pt-4">
              <div>
                <div className="text-[11px] font-bold uppercase tracking-wide text-[color:var(--primary)]">{eyebrow}</div>
                <div className="text-base font-semibold text-[color:var(--secondary)]">{title}</div>
              </div>
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                className="grid size-8 place-items-center rounded-lg text-[color:var(--muted)] hover:bg-white/70"
              >
                <X size={18} />
              </button>
            </div>
            <div className="mt-2 flex-1 overflow-hidden">
              <Sidebar sections={sections} collapsed={false} footer={footer} onNavigate={() => setMobileOpen(false)} />
            </div>
          </div>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="portal-topbar sticky top-0 z-30 flex items-center justify-between gap-3 px-4 py-3 md:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="grid size-9 shrink-0 place-items-center rounded-lg border border-[color:var(--border)] text-[color:var(--secondary)] md:hidden"
            >
              <Menu size={18} />
            </button>
            <div className="min-w-0">
              <div className="truncate text-[11px] font-bold uppercase tracking-wide text-[color:var(--primary)] md:hidden">
                {eyebrow}
              </div>
              <div className="truncate text-lg font-semibold text-[color:var(--secondary)]">{title}</div>
            </div>
          </div>
          {crossLink && (
            <Link href={crossLink.href} className="btn-primary shrink-0 px-3 py-2 text-sm">
              {crossLink.label}
            </Link>
          )}
        </header>
        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}
