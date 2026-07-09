"use client";

import { RequireAuth } from "@/components/RequireAuth";
import { PortalShell } from "@/components/portal/PortalShell";
import { Building2, ShieldCheck, Store } from "lucide-react";

const sections = [
  {
    label: "Organisation",
    items: [
      { href: "/admin/branches", label: "Branches & staff", icon: Building2 },
      { href: "/admin/company", label: "Company", icon: Store },
      { href: "/admin/compliance", label: "Compliance", icon: ShieldCheck },
    ],
  },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <RequireAuth>
      <PortalShell
        eyebrow="Super Admin"
        title="Nexus Pharma Admin"
        sections={sections}
        crossLink={{ href: "/branch/dashboard", label: "Branch workspace" }}
      >
        {children}
      </PortalShell>
    </RequireAuth>
  );
}
