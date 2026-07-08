import { onCall, HttpsError } from "firebase-functions/v2/https";
import { z } from "zod";
import { prisma, PermissionResource, PermissionAction } from "@pharmacy-os/db";
import { getCallerUser } from "../lib/authContext";
import { requirePermission } from "../lib/permissions";

const requestTransferSchema = z.object({
  fromBranchId: z.string().uuid(),
  toBranchId: z.string().uuid(),
  items: z
    .array(
      z.object({
        productId: z.string().uuid(),
        batchId: z.string().uuid(),
        quantityRequested: z.number().int().positive(),
      })
    )
    .min(1),
});

/** The requesting (destination) branch initiates — "Spintex requests 50 units from East Legon" (BLUEPRINT.md §20). */
export const requestTransfer = onCall(async (request) => {
  const caller = await getCallerUser(request);

  const parsed = requestTransferSchema.safeParse(request.data);
  if (!parsed.success) {
    throw new HttpsError("invalid-argument", parsed.error.message);
  }
  const input = parsed.data;

  if (input.fromBranchId === input.toBranchId) {
    throw new HttpsError("invalid-argument", "Source and destination branch must differ.");
  }

  await requirePermission({
    userId: caller.id,
    branchId: input.toBranchId,
    resource: PermissionResource.TRANSFERS,
    action: PermissionAction.CREATE,
  });

  const [fromBranch, toBranch] = await Promise.all([
    prisma.branch.findUnique({ where: { id: input.fromBranchId } }),
    prisma.branch.findUnique({ where: { id: input.toBranchId } }),
  ]);
  if (!fromBranch || fromBranch.organisationId !== caller.organisationId) {
    throw new HttpsError("not-found", "Source branch not found in this organisation.");
  }
  if (!toBranch || toBranch.organisationId !== caller.organisationId) {
    throw new HttpsError("not-found", "Destination branch not found in this organisation.");
  }

  const transfer = await prisma.stockTransfer.create({
    data: {
      organisationId: caller.organisationId,
      fromBranchId: input.fromBranchId,
      toBranchId: input.toBranchId,
      requestedByUserId: caller.id,
      items: {
        create: input.items.map((item) => ({
          productId: item.productId,
          batchId: item.batchId,
          quantityRequested: item.quantityRequested,
        })),
      },
    },
    include: { items: true },
  });

  return { transfer };
});
