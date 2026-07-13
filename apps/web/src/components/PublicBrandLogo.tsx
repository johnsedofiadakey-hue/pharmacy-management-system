"use client";

import { Logo } from "@/components/Logo";
import { useTenantBranding } from "@/lib/tenant/useTenantBranding";

export function PublicBrandLogo({ size = "md" }: { size?: "sm" | "md" }) {
  const { branding } = useTenantBranding();
  return <Logo size={size} brandName={branding.brandName} logoUrl={branding.logoUrl} />;
}
