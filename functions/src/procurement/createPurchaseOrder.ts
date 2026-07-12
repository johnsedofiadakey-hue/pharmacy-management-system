import { HttpsError } from "firebase-functions/v2/https";
import { onCall } from "../lib/onCall";
import { z } from "zod";
import { prisma, PermissionResource, PermissionAction, PurchaseOrderStatus } from "@pharmacy-os/db";
import { getCallerUser } from "../lib/authContext";
import { requirePermission } from "../lib/permissions";

const createPurchaseOrderSchema = z.object({
  branchId: z.string().uuid(),
  supplierId: z.string().uuid(),
  items: z
    .array(
      z.object({
        productId: z.string().uuid(),
        quantityOrdered: z.number().int().positive(),
        unitCost: z.number().nonnegative(),
      })
    )
    .min(1),
});

/** Created directly as SUBMITTED — no separate draft-editing step in this scaffold. */
export const createPurchaseOrder = onCall(async (request) => {
  const caller = await getCallerUser(request);

  const parsed = createPurchaseOrderSchema.safeParse(request.data);
  if (!parsed.success) {
    throw new HttpsError("invalid-argument", parsed.error.message);
  }
  const input = parsed.data;

  await requirePermission({
    userId: caller.id,
    organisationId: caller.organisationId,
    branchId: input.branchId,
    resource: PermissionResource.PURCHASES,
    action: PermissionAction.CREATE,
  });

  const [branch, supplier] = await Promise.all([
    prisma.branch.findUnique({ where: { id: input.branchId } }),
    prisma.supplier.findUnique({ where: { id: input.supplierId } }),
  ]);
  if (!branch || branch.organisationId !== caller.organisationId) {
    throw new HttpsError("not-found", "Branch not found in this organisation.");
  }
  if (!supplier || supplier.organisationId !== caller.organisationId) {
    throw new HttpsError("not-found", "Supplier not found in this organisation.");
  }

  const purchaseOrder = await prisma.purchaseOrder.create({
    data: {
      organisationId: caller.organisationId,
      branchId: input.branchId,
      supplierId: input.supplierId,
      status: PurchaseOrderStatus.SUBMITTED,
      createdByUserId: caller.id,
      items: {
        create: input.items.map((item) => ({
          productId: item.productId,
          quantityOrdered: item.quantityOrdered,
          unitCost: item.unitCost,
        })),
      },
    },
    include: { items: true },
  });

  return { purchaseOrder };
});
