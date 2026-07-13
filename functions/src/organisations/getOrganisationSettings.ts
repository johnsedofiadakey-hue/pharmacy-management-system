import { onCall } from "../lib/onCall";
import { prisma, PermissionAction, PermissionResource } from "@pharmacy-os/db";
import { getCallerUser } from "../lib/authContext";
import { requirePermission } from "../lib/permissions";
import { getPublicBranding } from "../lib/organisationBranding";

export const getOrganisationSettings = onCall(async (request) => {
  const caller = await getCallerUser(request);

  await requirePermission({
    userId: caller.id,
    organisationId: caller.organisationId,
    branchId: null,
    resource: PermissionResource.SETTINGS,
    action: PermissionAction.VIEW,
  });

  const organisation = await prisma.organisation.findUniqueOrThrow({
    where: { id: caller.organisationId },
    include: { domains: { orderBy: [{ isPrimary: "desc" }, { hostname: "asc" }] } },
  });

  return {
    organisation: {
      id: organisation.id,
      name: organisation.name,
      plan: organisation.plan,
      status: organisation.status,
      branding: getPublicBranding(organisation.name, organisation.settings),
      domains: organisation.domains.map((domain) => ({
        id: domain.id,
        hostname: domain.hostname,
        isPrimary: domain.isPrimary,
        isActive: domain.isActive,
      })),
    },
  };
});
