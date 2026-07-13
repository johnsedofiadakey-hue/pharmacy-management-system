"use client";

import { useEffect } from "react";
import { useTenantBranding } from "@/lib/tenant/useTenantBranding";

export function PublicBrandTheme() {
  const { branding } = useTenantBranding();

  useEffect(() => {
    document.documentElement.style.setProperty("--primary", branding.primaryColor);
    return () => {
      document.documentElement.style.removeProperty("--primary");
    };
  }, [branding.primaryColor]);

  return null;
}
