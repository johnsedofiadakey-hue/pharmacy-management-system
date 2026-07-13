import { onCall } from "../lib/onCall";
import { z } from "zod";
import { HttpsError } from "firebase-functions/v2/https";
import { prisma, PermissionResource, PermissionAction } from "@pharmacy-os/db";
import { getCallerUser } from "../lib/authContext";
import { requirePermissionAnyBranch } from "../lib/permissions";
import { getProductDisplay } from "../lib/productDisplay";

const schema = z.object({
  includeInactive: z.boolean().optional(),
});

// Any-branch check: the product catalogue itself isn't branch-scoped data
// (branch_stock is), and every branch-scoped role (cashier, pharmacy
// technician, branch manager...) needs it for POS/pharmacist/procurement
// pages even though their PRODUCTS:VIEW grant is scoped to their own branch.
export const listProducts = onCall(async (request) => {
  const caller = await getCallerUser(request);
  const parsed = schema.safeParse(request.data ?? {});
  if (!parsed.success) {
    throw new HttpsError("invalid-argument", parsed.error.message);
  }

  await requirePermissionAnyBranch({
    userId: caller.id,
    resource: PermissionResource.PRODUCTS,
    action: PermissionAction.VIEW,
  });

  const products = await prisma.product.findMany({
    where: {
      organisationId: caller.organisationId,
      ...(parsed.data.includeInactive ? {} : { isActive: true }),
    },
    include: { category: { select: { id: true, name: true } } },
    orderBy: { name: "asc" },
  });

  return {
    products: products.map((product) => ({
      id: product.id,
      organisationId: product.organisationId,
      name: product.name,
      genericName: product.genericName,
      brandName: product.brandName,
      barcode: product.barcode,
      sku: product.sku,
      categoryId: product.categoryId,
      category: product.category,
      prescriptionClassification: product.prescriptionClassification,
      costPrice: product.costPrice?.toString() ?? null,
      wholesalePrice: product.wholesalePrice?.toString() ?? null,
      retailPrice: product.retailPrice?.toString() ?? null,
      minSellingPrice: product.minSellingPrice?.toString() ?? null,
      reorderLevel: product.reorderLevel,
      isActive: product.isActive,
      ...getProductDisplay(product.taxConfig),
    })),
  };
});
