"use client";

import { RequireAuth } from "@/components/RequireAuth";
import { PortalShell } from "@/components/portal/PortalShell";
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
  return (
    <RequireAuth>
      <PortalShell
        eyebrow="Branch Workspace"
        title="Nexus Pharma"
        sections={sections}
        crossLink={{ href: "/pos", label: "Open POS" }}
      >
        {children}
      </PortalShell>
    </RequireAuth>
  );
}
