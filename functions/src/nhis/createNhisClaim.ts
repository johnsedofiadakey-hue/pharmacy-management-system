import { onCall, HttpsError } from "firebase-functions/v2/https";
import { z } from "zod";
import { prisma, PermissionResource, PermissionAction } from "@pharmacy-os/db";
import { getCallerUser } from "../lib/authContext";
import { requirePermission } from "../lib/permissions";

const schema = z.object({
  customerId: z.string().uuid(),
  saleId: z.string().uuid().optional(),
  nhisNumber: z.string().min(1),
});

/**
 * BLUEPRINT.md §44 — explicitly "scaffolding," not a real e-claims
 * submission. Creates a DRAFT claim record only; there's no NHIS API to
 * validate against or submit to, so status beyond DRAFT/SUBMITTED must be
 * updated manually until a real integration exists.
 */
export const createNhisClaim = onCall(async (request) => {
  const caller = await getCallerUser(request);

  const parsed = schema.safeParse(request.data);
  if (!parsed.success) {
    throw new HttpsError("invalid-argument", parsed.error.message);
  }
  const { customerId, saleId, nhisNumber } = parsed.data;

  await requirePermission({
    userId: caller.id,
    organisationId: caller.organisationId,
    branchId: null,
    resource: PermissionResource.SALES,
    action: PermissionAction.CREATE,
  });

  const customer = await prisma.customer.findUnique({ where: { id: customerId } });
  if (!customer || customer.organisationId !== caller.organisationId) {
    throw new HttpsError("not-found", "Customer not found in this organisation.");
  }

  const claim = await prisma.nhisClaim.create({
    data: { organisationId: caller.organisationId, customerId, saleId, nhisNumber },
  });

  return { claim };
});
