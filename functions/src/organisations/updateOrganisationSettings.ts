import { HttpsError } from "firebase-functions/v2/https";
import { z } from "zod";
import { onCall } from "../lib/onCall";
import { prisma, PermissionAction, PermissionResource } from "@pharmacy-os/db";
import { getCallerUser } from "../lib/authContext";
import { requirePermission } from "../lib/permissions";
import { recordAuditLog } from "../lib/auditLog";
import { getPublicBranding, mergeBrandingSettings } from "../lib/organisationBranding";

const optionalText = (max: number) => z.string().trim().max(max).nullish();

const brandingSchema = z.object({
  brandName: optionalText(80),
  logoUrl: z.string().trim().url().or(z.literal("")).nullish(),
  primaryColor: z.string().trim().regex(/^#[0-9a-fA-F]{6}$/).nullish(),
  supportPhone: optionalText(40),
  supportEmail: z.string().trim().email().or(z.literal("")).nullish(),
  storefrontHeadline: optionalText(120),
  storefrontSubheadline: optionalText(240),
  homepageAnnouncement: optionalText(180),
  footerText: optionalText(160),
});

const schema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  branding: brandingSchema.optional(),
});

export const updateOrganisationSettings = onCall(async (request) => {
  const caller = await getCallerUser(request);

  const parsed = schema.safeParse(request.data);
  if (!parsed.success) {
    throw new HttpsError("invalid-argument", parsed.error.message);
  }

  await requirePermission({
    userId: caller.id,
    organisationId: caller.organisationId,
    branchId: null,
    resource: PermissionResource.SETTINGS,
    action: PermissionAction.EDIT,
  });

  const organisation = await prisma.organisation.findUniqueOrThrow({ where: { id: caller.organisationId } });
  const nextSettings = parsed.data.branding
    ? mergeBrandingSettings(organisation.settings, parsed.data.branding)
    : organisation.settings ?? {};

  const updated = await prisma.$transaction(async (tx) => {
    const result = await tx.organisation.update({
      where: { id: caller.organisationId },
      data: {
        name: parsed.data.name,
        settings: nextSettings,
      },
    });

    await recordAuditLog(tx, {
      organisationId: caller.organisationId,
      userId: caller.id,
      action: "ORGANISATION_SETTINGS_UPDATED",
      resourceType: "Organisation",
      resourceId: caller.organisationId,
      oldValue: { name: organisation.name, branding: getPublicBranding(organisation.name, organisation.settings) },
      newValue: { name: result.name, branding: getPublicBranding(result.name, result.settings) },
    });

    return result;
  });

  return {
    organisation: {
      id: updated.id,
      name: updated.name,
      plan: updated.plan,
      status: updated.status,
      branding: getPublicBranding(updated.name, updated.settings),
    },
  };
});
