"use client";

import { useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import {
  publicGetOrganisationBrand,
  resolveTenantByHost,
  type OrganisationBranding,
} from "@/lib/firebase/callables";
import { showcaseBranding } from "@/lib/showcaseData";

const FALLBACK_ORGANISATION_ID = process.env.NEXT_PUBLIC_ORGANISATION_ID ?? "";

export const DEFAULT_BRANDING: OrganisationBranding = {
  brandName: "NexusPharma",
  logoUrl: null,
  primaryColor: "#0f766e",
  supportPhone: null,
  supportEmail: null,
  storefrontHeadline: "Your Health, Our Priority",
  storefrontSubheadline: "Trusted medicines, advanced care, delivered from the branch near you.",
  homepageAnnouncement: null,
  footerText: null,
};

type TenantBrandingState = {
  organisationId: string;
  branding: OrganisationBranding;
  loading: boolean;
  error: string | null;
};

function isLocalHostname(hostname: string): boolean {
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";
}

export function useTenantBranding(): TenantBrandingState {
  const [state, setState] = useState<TenantBrandingState>({
    organisationId: FALLBACK_ORGANISATION_ID,
    branding: DEFAULT_BRANDING,
    loading: true,
    error: null,
  });

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const hostname = window.location.hostname.toLowerCase();

      try {
        if (hostname && !isLocalHostname(hostname)) {
          const resolved = await resolveTenantByHost(hostname);
          if (cancelled) return;
          setState({
            organisationId: resolved.data.organisation.id,
            branding: { ...DEFAULT_BRANDING, ...resolved.data.organisation.branding },
            loading: false,
            error: null,
          });
          return;
        }
      } catch {
        // Fall back to the deployment env id below. A custom domain may not be
        // registered yet in local preview or during DNS rollout.
      }

      if (FALLBACK_ORGANISATION_ID) {
        try {
          const result = await publicGetOrganisationBrand(FALLBACK_ORGANISATION_ID);
          if (cancelled) return;
          setState({
            organisationId: result.data.organisation.id,
            branding: { ...DEFAULT_BRANDING, ...result.data.organisation.branding },
            loading: false,
            error: null,
          });
          return;
        } catch {
          if (cancelled) return;
          setState({
            organisationId: FALLBACK_ORGANISATION_ID,
            branding: { ...DEFAULT_BRANDING, ...showcaseBranding },
            loading: false,
            error: "Organisation branding could not be loaded for this deployment.",
          });
          return;
        }
      }

      if (!cancelled) {
        setState({
          organisationId: "",
          branding: DEFAULT_BRANDING,
          loading: false,
          error: "No organisation is configured for this storefront.",
        });
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, []);

  return useMemo(() => state, [state]);
}

export function tenantPrimaryStyle(branding: OrganisationBranding): CSSProperties {
  return { "--primary": branding.primaryColor } as CSSProperties;
}
