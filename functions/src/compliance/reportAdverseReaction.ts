import { onCall, HttpsError } from "firebase-functions/v2/https";
import { z } from "zod";
import { prisma, PermissionResource, PermissionAction } from "@pharmacy-os/db";
import { getCallerUser } from "../lib/authContext";
import { requirePermissionAnyBranch } from "../lib/permissions";

const schema = z.object({
  productId: z.string().uuid(),
  batchId: z.string().uuid().optional(),
  customerId: z.string().uuid().optional(),
  reactionDescription: z.string().min(1),
  dateOfReaction: z.string().datetime().optional(),
  outcome: z.string().optional(),
});

/**
 * BLUEPRINT.md §43 — captured for future structured regulatory reporting,
 * gated the same way as patient clinical actions (requirePermissionAnyBranch
 * on PATIENTS:CREATE) since this is clinical reporting a pharmacist does
 * regardless of which branch recorded the original sale.
 */
export const reportAdverseReaction = onCall(async (request) => {
  const caller = await getCallerUser(request);

  const parsed = schema.safeParse(request.data);
  if (!parsed.success) {
    throw new HttpsError("invalid-argument", parsed.error.message);
  }
  const input = parsed.data;

  await requirePermissionAnyBranch({
    userId: caller.id,
    resource: PermissionResource.PATIENTS,
    action: PermissionAction.CREATE,
  });

  const product = await prisma.product.findUnique({ where: { id: input.productId } });
  if (!product || product.organisationId !== caller.organisationId) {
    throw new HttpsError("not-found", "Product not found in this organisation.");
  }

  const report = await prisma.adverseReactionReport.create({
    data: {
      organisationId: caller.organisationId,
      productId: input.productId,
      batchId: input.batchId,
      customerId: input.customerId,
      reactionDescription: input.reactionDescription,
      dateOfReaction: input.dateOfReaction ? new Date(input.dateOfReaction) : undefined,
      outcome: input.outcome,
      reportedByUserId: caller.id,
    },
  });

  return { report };
});
