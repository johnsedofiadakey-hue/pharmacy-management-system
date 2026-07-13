import { HttpsError } from "firebase-functions/v2/https";
import { onCall } from "../lib/onCall";
import { z } from "zod";
import { prisma } from "@pharmacy-os/db";
import { getProductDisplay } from "../lib/productDisplay";

const schema = z.object({ organisationId: z.string().uuid() });

/**
 * Deliberately unauthenticated — product name/price/barcode is public
 * storefront data by nature (BLUEPRINT.md §31-32), same as any e-commerce
 * catalogue page. No requirePermission call: there is no staff caller here,
 * and nothing sensitive (cost price, supplier, internal stock levels) is
 * returned.
 */
export const publicListProducts = onCall(
  { invoker: "public" },
  async (request) => {
  const parsed = schema.safeParse(request.data);
  if (!parsed.success) {
    throw new HttpsError("invalid-argument", parsed.error.message);
  }

  const products = await prisma.product.findMany({
    where: { organisationId: parsed.data.organisationId, isActive: true },
    select: {
      id: true,
      name: true,
      genericName: true,
      brandName: true,
      barcode: true,
      retailPrice: true,
      prescriptionClassification: true,
      taxConfig: true,
      category: { select: { id: true, name: true } },
    },
    orderBy: { name: "asc" },
  });

  return {
    products: products.map((product) => ({
      id: product.id,
      name: product.name,
      genericName: product.genericName,
      brandName: product.brandName,
      barcode: product.barcode,
      retailPrice: product.retailPrice?.toString() ?? null,
      prescriptionClassification: product.prescriptionClassification,
      category: product.category,
      ...getProductDisplay(product.taxConfig),
    })),
  };
});
