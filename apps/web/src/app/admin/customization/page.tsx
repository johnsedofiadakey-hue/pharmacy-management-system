"use client";

import { useEffect, useState } from "react";
import type { CSSProperties } from "react";
import { Logo } from "@/components/Logo";
import { Alert, Badge, Button } from "@/components/ui";
import {
  getOrganisationSettings,
  updateOrganisationSettings,
  type OrganisationBranding,
  type OrganisationSettings,
} from "@/lib/firebase/callables";

const emptyBranding: OrganisationBranding = {
  brandName: "",
  logoUrl: "",
  primaryColor: "#0f766e",
  supportPhone: "",
  supportEmail: "",
  storefrontHeadline: "",
  storefrontSubheadline: "",
  homepageAnnouncement: "",
  footerText: "",
};

export default function AdminCustomizationPage() {
  const [organisation, setOrganisation] = useState<OrganisationSettings | null>(null);
  const [name, setName] = useState("");
  const [branding, setBranding] = useState<OrganisationBranding>(emptyBranding);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function refresh() {
    try {
      const result = await getOrganisationSettings();
      setOrganisation(result.data.organisation);
      setName(result.data.organisation.name);
      setBranding({ ...emptyBranding, ...result.data.organisation.branding });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load organisation settings.");
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refresh();
  }, []);

  async function handleSave(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const result = await updateOrganisationSettings({
        name,
        branding,
      });
      setOrganisation(result.data.organisation);
      setBranding({ ...emptyBranding, ...result.data.organisation.branding });
      setMessage("System customization saved.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save customization.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="page-wrap py-8">
      <div className="mb-6">
        <p className="text-sm font-semibold uppercase text-[color:var(--primary)]">Super Admin</p>
        <h1 className="mt-1 text-3xl font-semibold text-[color:var(--secondary)]">System customization</h1>
        <p className="mt-2 max-w-2xl text-sm text-[color:var(--muted)]">
          White-label the customer storefront and admin identity for a client without changing source code.
        </p>
      </div>

      {error && <Alert tone="error" className="mb-4">{error}</Alert>}
      {message && <Alert tone="success" className="mb-4">{message}</Alert>}

      <div className="grid gap-5 xl:grid-cols-[1.3fr_0.7fr]">
        <form onSubmit={handleSave} className="clinical-card grid gap-4 rounded-xl p-5 md:grid-cols-2">
          <h2 className="font-semibold text-[color:var(--secondary)] md:col-span-2">Brand settings</h2>
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold uppercase text-[color:var(--muted)]">Organisation name</span>
            <input className="field px-3 py-2" value={name} onChange={(e) => setName(e.target.value)} />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold uppercase text-[color:var(--muted)]">Public brand name</span>
            <input
              className="field px-3 py-2"
              value={branding.brandName}
              onChange={(e) => setBranding({ ...branding, brandName: e.target.value })}
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold uppercase text-[color:var(--muted)]">Logo URL</span>
            <input
              className="field px-3 py-2"
              placeholder="https://..."
              value={branding.logoUrl ?? ""}
              onChange={(e) => setBranding({ ...branding, logoUrl: e.target.value })}
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold uppercase text-[color:var(--muted)]">Primary colour</span>
            <div className="flex gap-2">
              <input
                type="color"
                className="h-11 w-14 rounded-lg border border-[color:var(--border)] bg-white p-1"
                value={branding.primaryColor}
                onChange={(e) => setBranding({ ...branding, primaryColor: e.target.value })}
              />
              <input
                className="field flex-1 px-3 py-2"
                value={branding.primaryColor}
                onChange={(e) => setBranding({ ...branding, primaryColor: e.target.value })}
              />
            </div>
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold uppercase text-[color:var(--muted)]">Support phone</span>
            <input
              className="field px-3 py-2"
              value={branding.supportPhone ?? ""}
              onChange={(e) => setBranding({ ...branding, supportPhone: e.target.value })}
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold uppercase text-[color:var(--muted)]">Support email</span>
            <input
              type="email"
              className="field px-3 py-2"
              value={branding.supportEmail ?? ""}
              onChange={(e) => setBranding({ ...branding, supportEmail: e.target.value })}
            />
          </label>
          <label className="flex flex-col gap-1.5 md:col-span-2">
            <span className="text-xs font-semibold uppercase text-[color:var(--muted)]">Storefront headline</span>
            <input
              className="field px-3 py-2"
              value={branding.storefrontHeadline}
              onChange={(e) => setBranding({ ...branding, storefrontHeadline: e.target.value })}
            />
          </label>
          <label className="flex flex-col gap-1.5 md:col-span-2">
            <span className="text-xs font-semibold uppercase text-[color:var(--muted)]">Storefront subheadline</span>
            <textarea
              className="field min-h-24 px-3 py-2"
              value={branding.storefrontSubheadline}
              onChange={(e) => setBranding({ ...branding, storefrontSubheadline: e.target.value })}
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold uppercase text-[color:var(--muted)]">Homepage announcement</span>
            <input
              className="field px-3 py-2"
              value={branding.homepageAnnouncement ?? ""}
              onChange={(e) => setBranding({ ...branding, homepageAnnouncement: e.target.value })}
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold uppercase text-[color:var(--muted)]">Footer text</span>
            <input
              className="field px-3 py-2"
              value={branding.footerText ?? ""}
              onChange={(e) => setBranding({ ...branding, footerText: e.target.value })}
            />
          </label>
          <Button type="submit" disabled={saving} className="md:col-span-2">
            {saving ? "Saving..." : "Save customization"}
          </Button>
        </form>

        <aside className="flex flex-col gap-5">
          <section className="clinical-card rounded-xl p-5">
            <h2 className="mb-4 font-semibold text-[color:var(--secondary)]">Preview</h2>
            <div className="rounded-xl border border-[color:var(--border)] bg-white p-4" style={{ "--primary": branding.primaryColor } as CSSProperties}>
              <Logo brandName={branding.brandName || name || "NexusPharma"} logoUrl={branding.logoUrl} href="#" />
              <h3 className="mt-5 text-2xl font-bold text-[color:var(--secondary)]">
                {branding.storefrontHeadline || "Your Health, Our Priority"}
              </h3>
              <p className="mt-2 text-sm text-[color:var(--muted)]">
                {branding.storefrontSubheadline || "Trusted medicines, advanced care, delivered from the branch near you."}
              </p>
            </div>
          </section>

          <section className="clinical-card rounded-xl p-5">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 className="font-semibold text-[color:var(--secondary)]">Domains</h2>
              <Badge tone="info">{organisation?.domains?.length ?? 0}</Badge>
            </div>
            <ul className="flex flex-col gap-2 text-sm">
              {organisation?.domains?.length ? (
                organisation.domains.map((domain) => (
                  <li key={domain.id} className="flex items-center justify-between gap-3">
                    <span className="truncate text-[color:var(--secondary)]">{domain.hostname}</span>
                    <Badge tone={domain.isActive ? "safe" : "neutral"}>
                      {domain.isPrimary ? "Primary" : domain.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </li>
                ))
              ) : (
                <li className="text-[color:var(--muted)]">No custom domains registered yet.</li>
              )}
            </ul>
          </section>
        </aside>
      </div>
    </main>
  );
}
