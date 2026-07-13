"use client";

import { RequireAuth } from "@/components/RequireAuth";
import { BranchContextBar, BranchWorkspaceProvider } from "@/components/branch/BranchWorkspaceContext";
import { PortalShell } from "@/components/portal/PortalShell";
import { useTenantBranding } from "@/lib/tenant/useTenantBranding";
import {
  LayoutDashboard,
  Package,
  Stethoscope,
  Users,
  Truck,
  BarChart3,
  ArrowLeftRight,
} from "lucide-react";

const sections = [
  {
    label: "Branch",
    items: [
      { href: "/branch/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { href: "/branch/orders", label: "Orders", icon: Package },
      { href: "/branch/pharmacist", label: "Pharmacist", icon: Stethoscope },
      { href: "/branch/patients", label: "Patients", icon: Users },
      { href: "/branch/procurement", label: "Procurement", icon: Truck },
      { href: "/branch/transfers", label: "Transfers", icon: ArrowLeftRight },
      { href: "/branch/reports", label: "Reports", icon: BarChart3 },
    ],
  },
];

export default function BranchLayout({ children }: { children: React.ReactNode }) {
  const { branding } = useTenantBranding();

  return (
    <RequireAuth>
      <BranchWorkspaceProvider>
        <PortalShell
          eyebrow="Branch Workspace"
          title={branding.brandName}
          sections={sections}
          crossLink={{ href: "/pos", label: "Open POS" }}
        >
          <BranchContextBar />
          {children}
        </PortalShell>
      </BranchWorkspaceProvider>
    </RequireAuth>
  );
}
