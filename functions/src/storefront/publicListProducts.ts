import { HttpsError } from "firebase-functions/v2/https";
import { onCall } from "../lib/onCall";
import { z } from "zod";
import { prisma } from "@pharmacy-os/db";

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
    },
    orderBy: { name: "asc" },
  });

  return {
    products: products.map((product) => ({
      ...product,
      retailPrice: product.retailPrice?.toString() ?? null,
    })),
  };
});
