import { HttpsError } from "firebase-functions/v2/https";
import { z } from "zod";
import { onCall } from "../lib/onCall";
import { prisma, PermissionAction, PermissionResource } from "@pharmacy-os/db";
import { getCallerUser } from "../lib/authContext";
import { requirePermission } from "../lib/permissions";
import { recordAuditLog } from "../lib/auditLog";
import { getProductDisplay } from "../lib/productDisplay";

const schema = z.object({
  productId: z.string().uuid(),
  isActive: z.boolean(),
});

export const setProductActive = onCall(async (request) => {
  const caller = await getCallerUser(request);

  const parsed = schema.safeParse(request.data);
  if (!parsed.success) {
    throw new HttpsError("invalid-argument", parsed.error.message);
  }
  const { productId, isActive } = parsed.data;

  await requirePermission({
    userId: caller.id,
    organisationId: caller.organisationId,
    branchId: null,
    resource: PermissionResource.PRODUCTS,
    action: PermissionAction.DELETE,
  });

  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product || product.organisationId !== caller.organisationId) {
    throw new HttpsError("not-found", "Product not found in this organisation.");
  }

  const updated = await prisma.$transaction(async (tx) => {
    const result = await tx.product.update({ where: { id: productId }, data: { isActive } });

    await recordAuditLog(tx, {
      organisationId: caller.organisationId,
      userId: caller.id,
      action: isActive ? "PRODUCT_REACTIVATED" : "PRODUCT_DEACTIVATED",
      resourceType: "Product",
      resourceId: productId,
      oldValue: { isActive: product.isActive, isShowcase: getProductDisplay(product.taxConfig).isShowcase },
      newValue: { isActive },
    });

    return result;
  });

  return { product: { ...updated, ...getProductDisplay(updated.taxConfig) } };
});
