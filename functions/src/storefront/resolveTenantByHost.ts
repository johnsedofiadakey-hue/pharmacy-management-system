import { HttpsError } from "firebase-functions/v2/https";
import { onCall } from "../lib/onCall";
import { z } from "zod";
import { prisma, OrganisationStatus } from "@pharmacy-os/db";
import { getPublicBranding } from "../lib/organisationBranding";

const schema = z.object({
  hostname: z
    .string()
    .min(1)
    .max(255)
    .transform((value) => value.trim().toLowerCase()),
});

/**
 * Public SaaS tenant resolver (Phase 13 scaffold). Given a browser hostname,
 * returns the active organisation that owns that domain. This is intentionally
 * read-only and returns only public tenant metadata, not settings/roles/users.
 */
export const resolveTenantByHost = onCall(async (request) => {
  const parsed = schema.safeParse(request.data);
  if (!parsed.success) {
    throw new HttpsError("invalid-argument", parsed.error.message);
  }

  const domain = await prisma.organisationDomain.findUnique({
    where: { hostname: parsed.data.hostname },
    include: { organisation: true },
  });

  if (!domain || !domain.isActive || domain.organisation.status !== OrganisationStatus.ACTIVE) {
    throw new HttpsError("not-found", "No active pharmacy storefront found for this domain.");
  }

  return {
    organisation: {
      id: domain.organisation.id,
      name: domain.organisation.name,
      plan: domain.organisation.plan,
      branding: getPublicBranding(domain.organisation.name, domain.organisation.settings),
    },
    domain: {
      hostname: domain.hostname,
      isPrimary: domain.isPrimary,
    },
  };
});
