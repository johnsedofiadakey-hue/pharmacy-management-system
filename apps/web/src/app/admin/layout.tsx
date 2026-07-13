"use client";

import { RequireAuth } from "@/components/RequireAuth";
import { PortalShell } from "@/components/portal/PortalShell";
import { BarChart3, Building2, ClipboardList, Package, Palette, ShieldCheck, ShoppingBag, Store, Truck, Users } from "lucide-react";
import { useTenantBranding } from "@/lib/tenant/useTenantBranding";

const sections = [
  {
    label: "Organisation",
    items: [
      { href: "/admin/branches", label: "Branches & staff", icon: Building2 },
      { href: "/admin/staff", label: "Staff access", icon: Users },
      { href: "/admin/company", label: "Company", icon: Store },
      { href: "/admin/customization", label: "Customization", icon: Palette },
      { href: "/admin/compliance", label: "Compliance", icon: ShieldCheck },
      { href: "/admin/audit", label: "Audit trail", icon: ClipboardList },
    ],
  },
  {
    label: "Operations",
    items: [
      { href: "/admin/products", label: "Products & pricing", icon: Package },
      { href: "/admin/inventory", label: "Inventory receiving", icon: ClipboardList },
      { href: "/admin/orders", label: "Orders", icon: ShoppingBag },
      { href: "/admin/procurement", label: "Procurement", icon: Truck },
      { href: "/admin/reports", label: "Reports", icon: BarChart3 },
    ],
  },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { branding } = useTenantBranding();

  return (
    <RequireAuth>
      <PortalShell
        eyebrow="Super Admin"
        title={`${branding.brandName} Admin`}
        sections={sections}
        crossLink={{ href: "/branch/dashboard", label: "Branch workspace" }}
      >
        {children}
      </PortalShell>
    </RequireAuth>
  );
}
