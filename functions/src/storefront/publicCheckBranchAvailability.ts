import { HttpsError } from "firebase-functions/v2/https";
import { onCall } from "../lib/onCall";
import { z } from "zod";
import { prisma } from "@pharmacy-os/db";

const schema = z.object({ organisationId: z.string().uuid(), productId: z.string().uuid() });

/** Public — per-branch "in stock / low / out" for the storefront (BLUEPRINT.md §32). Exposes quantity buckets only, not exact counts or cost data. */
export const publicCheckBranchAvailability = onCall({ invoker: "public" }, async (request) => {
  const parsed = schema.safeParse(request.data);
  if (!parsed.success) {
    throw new HttpsError("invalid-argument", parsed.error.message);
  }
  const { organisationId, productId } = parsed.data;

  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product || product.organisationId !== organisationId) {
    throw new HttpsError("not-found", "Product not found.");
  }

  const stockByBranch = await prisma.branchStock.groupBy({
    by: ["branchId"],
    where: { productId, branch: { organisationId, isActive: true } },
    _sum: { quantityOnHand: true },
  });

  const branches = await prisma.branch.findMany({
    where: { organisationId, isActive: true },
    select: { id: true, name: true },
  });
  const quantityByBranchId = new Map(stockByBranch.map((s) => [s.branchId, s._sum.quantityOnHand ?? 0]));

  const availability = branches.map((branch) => {
    const quantity = quantityByBranchId.get(branch.id) ?? 0;
    return {
      branchId: branch.id,
      branchName: branch.name,
      status: quantity === 0 ? "OUT_OF_STOCK" : quantity <= 5 ? "LOW_STOCK" : "IN_STOCK",
    };
  });

  return { availability };
});
