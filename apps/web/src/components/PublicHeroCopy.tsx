"use client";

import { useTenantBranding } from "@/lib/tenant/useTenantBranding";

export function PublicHeroCopy() {
  const { branding } = useTenantBranding();

  const [lead, accent] = branding.storefrontHeadline.includes(",")
    ? branding.storefrontHeadline.split(/,(.+)/).map((part) => part.trim())
    : [branding.storefrontHeadline, ""];

  return (
    <>
      <h1 className="font-display text-4xl font-bold leading-[1.1] text-[color:var(--secondary)] md:text-6xl">
        {lead}
        {accent && (
          <>
            <br />
            <span className="text-[color:var(--primary)]">{accent}</span>
          </>
        )}
      </h1>
      <p className="mt-5 max-w-md text-lg text-[color:var(--muted)]">
        {branding.storefrontSubheadline}
      </p>
      {branding.homepageAnnouncement && (
        <p className="mt-3 inline-flex rounded-full bg-[color:var(--primary-soft)] px-3 py-1 text-sm font-semibold text-[color:var(--primary-strong)]">
          {branding.homepageAnnouncement}
        </p>
      )}
    </>
  );
}
