import { onCall, HttpsError } from "firebase-functions/v2/https";
import { z } from "zod";
import { prisma, PermissionResource, PermissionAction } from "@pharmacy-os/db";
import { getCallerUser } from "../lib/authContext";
import { requirePermission } from "../lib/permissions";

const schema = z.object({ branchId: z.string().uuid() });

/**
 * Simplified reorder suggestions: products at or below their reorderLevel at
 * this branch, suggesting a top-up to maxStock (or 2x reorderLevel if
 * maxStock isn't set). This is NOT the full BLUEPRINT.md §22 algorithm
 * (average daily sales, lead time, safety stock, seasonality) — that needs
 * real sales-velocity history and belongs with Phase 10's demand forecasting
 * work. This only answers "what's low right now," not "how much will we
 * need," which is a legitimate simpler tier for smaller pharmacies
 * (BLUEPRINT.md §21: "smaller pharmacies may use a simplified procurement
 * workflow").
 */
export const getPurchaseSuggestions = onCall(async (request) => {
  const caller = await getCallerUser(request);

  const parsed = schema.safeParse(request.data);
  if (!parsed.success) {
    throw new HttpsError("invalid-argument", parsed.error.message);
  }
  const { branchId } = parsed.data;

  await requirePermission({
    userId: caller.id,
    branchId,
    resource: PermissionResource.PURCHASES,
    action: PermissionAction.VIEW,
  });

  const products = await prisma.product.findMany({
    where: { organisationId: caller.organisationId, reorderLevel: { not: null }, isActive: true },
  });

  const stockByProduct = await prisma.branchStock.groupBy({
    by: ["productId"],
    where: { branchId, productId: { in: products.map((p) => p.id) } },
    _sum: { quantityOnHand: true },
  });
  const currentStockByProductId = new Map(
    stockByProduct.map((s) => [s.productId, s._sum.quantityOnHand ?? 0])
  );

  const suggestions = products
    .map((product) => {
      const currentStock = currentStockByProductId.get(product.id) ?? 0;
      const reorderLevel = product.reorderLevel ?? 0;
      if (currentStock > reorderLevel) return null;
      const target = product.maxStock ?? reorderLevel * 2;
      return {
        productId: product.id,
        productName: product.name,
        currentStock,
        reorderLevel,
        suggestedOrderQuantity: Math.max(target - currentStock, 1),
        preferredSupplierId: product.preferredSupplierId,
      };
    })
    .filter((s): s is NonNullable<typeof s> => s !== null);

  return { suggestions };
});
