import { HttpsError } from "firebase-functions/v2/https";
import { z } from "zod";
import { onCall } from "../lib/onCall";
import { prisma, PermissionAction, PermissionResource } from "@pharmacy-os/db";
import { getCallerUser } from "../lib/authContext";
import { requirePermission } from "../lib/permissions";
import { recordAuditLog } from "../lib/auditLog";
import { getProductDisplay, mergeProductDisplay } from "../lib/productDisplay";

const schema = z.object({
  productId: z.string().uuid(),
  genericName: z.string().trim().max(120).nullish(),
  brandName: z.string().trim().max(120).nullish(),
  categoryId: z.string().uuid().nullish(),
  storefrontImageUrl: z.string().trim().url().or(z.literal("")).nullish(),
  storefrontCategoryName: z.string().trim().max(80).nullish(),
});

function nullableText(value: string | null | undefined): string | null | undefined {
  if (value === undefined) return undefined;
  return value && value.trim() ? value.trim() : null;
}

export const updateProductMerchandising = onCall(async (request) => {
  const caller = await getCallerUser(request);

  const parsed = schema.safeParse(request.data);
  if (!parsed.success) {
    throw new HttpsError("invalid-argument", parsed.error.message);
  }
  const { productId, ...updates } = parsed.data;

  await requirePermission({
    userId: caller.id,
    organisationId: caller.organisationId,
    branchId: null,
    resource: PermissionResource.PRODUCTS,
    action: PermissionAction.EDIT,
  });

  const [product, category] = await Promise.all([
    prisma.product.findUnique({ where: { id: productId } }),
    updates.categoryId ? prisma.category.findUnique({ where: { id: updates.categoryId } }) : null,
  ]);

  if (!product || product.organisationId !== caller.organisationId) {
    throw new HttpsError("not-found", "Product not found in this organisation.");
  }
  if (updates.categoryId && (!category || category.organisationId !== caller.organisationId)) {
    throw new HttpsError("not-found", "Category not found in this organisation.");
  }

  const nextTaxConfig = mergeProductDisplay(product.taxConfig, {
    storefrontImageUrl: updates.storefrontImageUrl,
    storefrontCategoryName: updates.storefrontCategoryName,
  });

  const updated = await prisma.$transaction(async (tx) => {
    const result = await tx.product.update({
      where: { id: productId },
      data: {
        genericName: nullableText(updates.genericName),
        brandName: nullableText(updates.brandName),
        categoryId: updates.categoryId === undefined ? undefined : updates.categoryId,
        taxConfig: nextTaxConfig,
      },
      include: { category: true },
    });

    await recordAuditLog(tx, {
      organisationId: caller.organisationId,
      userId: caller.id,
      action: "PRODUCT_MERCHANDISING_UPDATED",
      resourceType: "Product",
      resourceId: productId,
      oldValue: {
        genericName: product.genericName,
        brandName: product.brandName,
        categoryId: product.categoryId,
        ...getProductDisplay(product.taxConfig),
      },
      newValue: {
        genericName: result.genericName,
        brandName: result.brandName,
        categoryId: result.categoryId,
        ...getProductDisplay(result.taxConfig),
      },
    });

    return result;
  });

  return { product: { ...updated, ...getProductDisplay(updated.taxConfig) } };
});
