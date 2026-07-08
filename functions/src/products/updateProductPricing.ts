import { onCall, HttpsError } from "firebase-functions/v2/https";
import { z } from "zod";
import { prisma, PermissionResource, PermissionAction } from "@pharmacy-os/db";
import { getCallerUser } from "../lib/authContext";
import { requirePermission } from "../lib/permissions";
import { recordAuditLog } from "../lib/auditLog";

const schema = z.object({
  productId: z.string().uuid(),
  costPrice: z.number().nonnegative().optional(),
  wholesalePrice: z.number().nonnegative().optional(),
  retailPrice: z.number().nonnegative().optional(),
  minSellingPrice: z.number().nonnegative().optional(),
});

/**
 * This is the concrete gap-fill BLUEPRINT.md §53's own audit-trail example
 * describes ("John changed Amoxicillin price from GH₵40 to GH₵32") — no
 * product-pricing update existed before this phase (Phase 2 only built
 * createProduct). Gated under PRICING:EDIT rather than PRODUCTS, since this
 * is specifically a commercial pricing action.
 */
export const updateProductPricing = onCall(async (request) => {
  const caller = await getCallerUser(request);

  const parsed = schema.safeParse(request.data);
  if (!parsed.success) {
    throw new HttpsError("invalid-argument", parsed.error.message);
  }
  const { productId, ...updates } = parsed.data;

  await requirePermission({
    userId: caller.id,
    branchId: null,
    resource: PermissionResource.PRICING,
    action: PermissionAction.EDIT,
  });

  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product || product.organisationId !== caller.organisationId) {
    throw new HttpsError("not-found", "Product not found in this organisation.");
  }

  const oldValue = {
    costPrice: product.costPrice,
    wholesalePrice: product.wholesalePrice,
    retailPrice: product.retailPrice,
    minSellingPrice: product.minSellingPrice,
  };

  const updated = await prisma.$transaction(async (tx) => {
    const result = await tx.product.update({ where: { id: productId }, data: updates });

    await recordAuditLog(tx, {
      organisationId: caller.organisationId,
      userId: caller.id,
      action: "PRODUCT_PRICING_UPDATED",
      resourceType: "Product",
      resourceId: productId,
      oldValue,
      newValue: updates,
    });

    return result;
  });

  return { product: updated };
});
