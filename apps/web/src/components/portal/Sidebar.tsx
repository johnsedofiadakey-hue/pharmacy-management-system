"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { LucideIcon } from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

export type NavSection = {
  label?: string;
  items: NavItem[];
};

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function Sidebar({
  sections,
  collapsed,
  footer,
  onNavigate,
}: {
  sections: NavSection[];
  collapsed: boolean;
  footer?: React.ReactNode;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();

  return (
    <div className="flex h-full flex-col justify-between overflow-y-auto py-4">
      <nav className="flex flex-col gap-5 px-3">
        {sections.map((section, index) => (
          <div key={section.label ?? index} className="flex flex-col gap-1">
            {section.label && !collapsed && (
              <div className="nav-group-label mb-1">{section.label}</div>
            )}
            {section.items.map((item) => {
              const Icon = item.icon;
              const active = isActive(pathname, item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onNavigate}
                  title={collapsed ? item.label : undefined}
                  className={`nav-item ${active ? "nav-item-active" : ""} ${collapsed ? "justify-center px-0" : ""}`}
                >
                  <Icon size={18} strokeWidth={2} className="shrink-0" />
                  {!collapsed && <span className="truncate">{item.label}</span>}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>
      {footer && <div className="px-3">{footer}</div>}
    </div>
  );
}
