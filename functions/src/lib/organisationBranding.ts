import { Prisma } from "@pharmacy-os/db";

export type PublicBranding = {
  brandName: string;
  logoUrl: string | null;
  primaryColor: string;
  supportPhone: string | null;
  supportEmail: string | null;
  storefrontHeadline: string;
  storefrontSubheadline: string;
  homepageAnnouncement: string | null;
  footerText: string | null;
};

export type BrandingInput = Partial<{
  brandName: string | null;
  logoUrl: string | null;
  primaryColor: string | null;
  supportPhone: string | null;
  supportEmail: string | null;
  storefrontHeadline: string | null;
  storefrontSubheadline: string | null;
  homepageAnnouncement: string | null;
  footerText: string | null;
}>;

const DEFAULT_PRIMARY_COLOR = "#0f766e";

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function stringOrNull(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function stringOrFallback(value: unknown, fallback: string): string {
  return stringOrNull(value) ?? fallback;
}

export function getPublicBranding(organisationName: string, settings: unknown): PublicBranding {
  const root = asRecord(settings);
  const branding = asRecord(root.branding);
  const brandName = stringOrFallback(branding.brandName, organisationName);

  return {
    brandName,
    logoUrl: stringOrNull(branding.logoUrl),
    primaryColor: stringOrFallback(branding.primaryColor, DEFAULT_PRIMARY_COLOR),
    supportPhone: stringOrNull(branding.supportPhone),
    supportEmail: stringOrNull(branding.supportEmail),
    storefrontHeadline: stringOrFallback(branding.storefrontHeadline, `${brandName} online pharmacy`),
    storefrontSubheadline: stringOrFallback(
      branding.storefrontSubheadline,
      "Order medicines and wellness products from your nearest branch."
    ),
    homepageAnnouncement: stringOrNull(branding.homepageAnnouncement),
    footerText: stringOrNull(branding.footerText),
  };
}

export function mergeBrandingSettings(settings: unknown, updates: BrandingInput): Prisma.InputJsonValue {
  const root = asRecord(settings);
  const branding = asRecord(root.branding);
  const nextBranding: Record<string, unknown> = { ...branding };

  for (const [key, value] of Object.entries(updates)) {
    if (value === undefined) continue;
    nextBranding[key] = typeof value === "string" ? value.trim() : value;
  }

  return {
    ...root,
    branding: nextBranding,
  } as Prisma.InputJsonValue;
}
