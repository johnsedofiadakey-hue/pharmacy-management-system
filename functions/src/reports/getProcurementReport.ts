import { onCall, HttpsError } from "firebase-functions/v2/https";
import { z } from "zod";
import { prisma, PermissionResource, PermissionAction, PurchaseOrderStatus } from "@pharmacy-os/db";
import { getCallerUser } from "../lib/authContext";
import { requirePermission } from "../lib/permissions";

const schema = z.object({ branchId: z.string().uuid() });

const OPEN_STATUSES: PurchaseOrderStatus[] = [
  PurchaseOrderStatus.DRAFT,
  PurchaseOrderStatus.SUBMITTED,
  PurchaseOrderStatus.APPROVED,
  PurchaseOrderStatus.SENT,
  PurchaseOrderStatus.PARTIALLY_RECEIVED,
];

/** BLUEPRINT.md §45.4 — supplier spend, pending POs, and a simple price-trend signal per product/supplier. */
export const getProcurementReport = onCall(async (request) => {
  const caller = await getCallerUser(request);

  const parsed = schema.safeParse(request.data);
  if (!parsed.success) {
    throw new HttpsError("invalid-argument", parsed.error.message);
  }
  const { branchId } = parsed.data;

  await requirePermission({
    userId: caller.id,
    organisationId: caller.organisationId,
    branchId,
    resource: PermissionResource.PURCHASES,
    action: PermissionAction.VIEW,
  });

  const purchaseOrders = await prisma.purchaseOrder.findMany({
    where: { branchId },
    include: { items: { include: { product: true } }, supplier: true },
    orderBy: { createdAt: "asc" },
  });

  const supplierSpend = new Map<string, { name: string; total: number }>();
  const pending: typeof purchaseOrders = [];
  const priceHistory = new Map<string, { productName: string; supplierName: string; costs: number[] }>();

  for (const po of purchaseOrders) {
    if (OPEN_STATUSES.includes(po.status)) {
      pending.push(po);
    }
    if (po.status === PurchaseOrderStatus.RECEIVED || po.status === PurchaseOrderStatus.PARTIALLY_RECEIVED) {
      const entry = supplierSpend.get(po.supplierId) ?? { name: po.supplier.companyName, total: 0 };
      for (const item of po.items) {
        entry.total += item.quantityReceived * Number(item.unitCost);

        const key = `${item.productId}:${po.supplierId}`;
        const history = priceHistory.get(key) ?? {
          productName: item.product.name,
          supplierName: po.supplier.companyName,
          costs: [],
        };
        history.costs.push(Number(item.unitCost));
        priceHistory.set(key, history);
      }
      supplierSpend.set(po.supplierId, entry);
    }
  }

  const priceTrend = [...priceHistory.values()]
    .filter((h) => h.costs.length >= 2)
    .map((h) => {
      const latest = h.costs[h.costs.length - 1];
      const previous = h.costs[h.costs.length - 2];
      return {
        productName: h.productName,
        supplierName: h.supplierName,
        previousCost: previous,
        latestCost: latest,
        percentChange: previous > 0 ? ((latest - previous) / previous) * 100 : 0,
      };
    });

  return {
    supplierSpend: [...supplierSpend.entries()].map(([supplierId, v]) => ({ supplierId, ...v })),
    pendingPurchaseOrders: pending.map((po) => ({
      id: po.id,
      supplierName: po.supplier.companyName,
      status: po.status,
      value: po.items.reduce((sum, i) => sum + i.quantityOrdered * Number(i.unitCost), 0),
    })),
    priceTrend,
  };
});
