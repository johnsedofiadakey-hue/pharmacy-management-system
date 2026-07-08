import { onCall, HttpsError } from "firebase-functions/v2/https";
import { z } from "zod";
import {
  prisma,
  PermissionResource,
  PermissionAction,
  TillSessionStatus,
  StockMovementType,
  PaymentMethod,
} from "@pharmacy-os/db";
import { getCallerUser } from "../lib/authContext";
import { requirePermission } from "../lib/permissions";
import { deductStockFefo } from "../inventory/fefo";
import { refreshBranchDashboard } from "../dashboard/refreshBranchDashboard";

const createSaleSchema = z.object({
  branchId: z.string().uuid(),
  tillSessionId: z.string().uuid(),
  customerPhone: z.string().optional(),
  items: z
    .array(
      z.object({
        productId: z.string().uuid(),
        quantity: z.number().int().positive(),
        unitPrice: z.number().nonnegative(),
        discountAmount: z.number().nonnegative().optional(),
      })
    )
    .min(1),
  payments: z
    .array(
      z.object({
        paymentMethod: z.nativeEnum(PaymentMethod),
        amount: z.number().positive(),
        referenceNumber: z.string().optional(),
      })
    )
    .min(1),
});

const ROUNDING_TOLERANCE = 0.01;

/**
 * Product-level checkout: the cashier enters "product X, qty 5" once. FEFO
 * deduction may spread that across multiple batches — each becomes its own
 * SaleItem row so it lines up 1:1 with the stock_movements it caused. Tax
 * isn't computed yet (taxTotal is always 0) even though Product.taxConfig
 * exists — that's real tax-calculation logic, not wired up in this phase.
 */
export const createSale = onCall(async (request) => {
  const caller = await getCallerUser(request);

  const parsed = createSaleSchema.safeParse(request.data);
  if (!parsed.success) {
    throw new HttpsError("invalid-argument", parsed.error.message);
  }
  const input = parsed.data;

  await requirePermission({
    userId: caller.id,
    branchId: input.branchId,
    resource: PermissionResource.SALES,
    action: PermissionAction.CREATE,
  });

  const tillSession = await prisma.tillSession.findUnique({ where: { id: input.tillSessionId } });
  if (!tillSession || tillSession.branchId !== input.branchId) {
    throw new HttpsError("not-found", "Till session not found at this branch.");
  }
  if (tillSession.status !== TillSessionStatus.OPEN) {
    throw new HttpsError("failed-precondition", "Till session is not open.");
  }
  if (tillSession.cashierUserId !== caller.id) {
    throw new HttpsError("permission-denied", "This till session belongs to another cashier.");
  }

  const productIds = [...new Set(input.items.map((i) => i.productId))];
  const products = await prisma.product.findMany({ where: { id: { in: productIds } } });
  const productById = new Map(products.map((p) => [p.id, p]));

  for (const item of input.items) {
    const product = productById.get(item.productId);
    if (!product || product.organisationId !== caller.organisationId) {
      throw new HttpsError("not-found", `Product ${item.productId} not found in this organisation.`);
    }
    if (product.minSellingPrice && item.unitPrice < Number(product.minSellingPrice)) {
      throw new HttpsError(
        "failed-precondition",
        `Unit price for "${product.name}" is below its minimum selling price.`
      );
    }
  }

  const subtotal = input.items.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0);
  const discountTotal = input.items.reduce((sum, i) => sum + (i.discountAmount ?? 0), 0);
  const total = subtotal - discountTotal;

  const paymentsTotal = input.payments.reduce((sum, p) => sum + p.amount, 0);
  if (Math.abs(paymentsTotal - total) > ROUNDING_TOLERANCE) {
    throw new HttpsError(
      "invalid-argument",
      `Payments (${paymentsTotal}) do not match sale total (${total}).`
    );
  }

  let customerId: string | undefined;
  if (input.customerPhone) {
    const customer = await prisma.customer.upsert({
      where: { organisationId_phone: { organisationId: caller.organisationId, phone: input.customerPhone } },
      create: { organisationId: caller.organisationId, phone: input.customerPhone },
      update: {},
    });
    customerId = customer.id;
  }

  const sale = await prisma.$transaction(async (tx) => {
    const createdSale = await tx.sale.create({
      data: {
        organisationId: caller.organisationId,
        branchId: input.branchId,
        cashierUserId: caller.id,
        tillSessionId: input.tillSessionId,
        customerId,
        subtotal,
        discountTotal,
        taxTotal: 0,
        total,
      },
    });

    for (const item of input.items) {
      const movements = await deductStockFefo(tx, {
        organisationId: caller.organisationId,
        branchId: input.branchId,
        productId: item.productId,
        quantity: item.quantity,
        movementType: StockMovementType.SALE,
        performedByUserId: caller.id,
        referenceType: "sale",
        referenceId: createdSale.id,
      });

      for (const [index, movement] of movements.entries()) {
        const quantity = -movement.quantityDelta;
        const lineDiscount = index === 0 ? item.discountAmount ?? 0 : 0;
        await tx.saleItem.create({
          data: {
            saleId: createdSale.id,
            productId: item.productId,
            batchId: movement.batchId,
            quantity,
            unitPrice: item.unitPrice,
            discountAmount: lineDiscount,
            lineTotal: item.unitPrice * quantity - lineDiscount,
          },
        });
      }
    }

    for (const payment of input.payments) {
      await tx.salePayment.create({
        data: {
          saleId: createdSale.id,
          paymentMethod: payment.paymentMethod,
          amount: payment.amount,
          referenceNumber: payment.referenceNumber,
        },
      });
    }

    return tx.sale.findUniqueOrThrow({
      where: { id: createdSale.id },
      include: { items: true, payments: true },
    });
  });

  await refreshBranchDashboard(input.branchId);

  return { sale };
});
