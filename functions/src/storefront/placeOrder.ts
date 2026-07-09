import { onCall, HttpsError } from "firebase-functions/v2/https";
import { z } from "zod";
import { prisma, StockMovementType, PaymentMethod } from "@pharmacy-os/db";
import { getCallerCustomer } from "../lib/customerAuthContext";
import { deductStockFefo } from "../inventory/fefo";
import { refreshBranchDashboard } from "../dashboard/refreshBranchDashboard";

const placeOrderSchema = z.object({
  branchId: z.string().uuid(),
  fulfilmentType: z.enum(["PICKUP", "DELIVERY"]),
  deliveryAddressId: z.string().uuid().optional(),
  paymentMethod: z.nativeEnum(PaymentMethod),
  items: z.array(z.object({ productId: z.string().uuid(), quantity: z.number().int().positive() })).min(1),
});

/**
 * Customer-facing checkout. Unlike POS's createSale, unit prices are never
 * taken from the client — they're read from Product.retailPrice server-side,
 * since a customer request is untrusted input in a way a logged-in cashier's
 * isn't. Stock is deducted (via the same FEFO engine as POS) at order
 * placement rather than at some later "confirmed" step — see the Phase 9
 * build log for why a real reservation-without-a-ledger-entry concept was
 * rejected in favor of this simpler, still-honest approach.
 *
 * RESTRICTED products are blocked outright here — the storefront doesn't yet
 * support attaching/reviewing a prescription during checkout (see Phase 9
 * build log); buying a restricted medicine still requires an in-person POS
 * sale with an approved prescription (Phase 7).
 */
export const placeOrder = onCall(async (request) => {
  const customer = await getCallerCustomer(request);

  const parsed = placeOrderSchema.safeParse(request.data);
  if (!parsed.success) {
    throw new HttpsError("invalid-argument", parsed.error.message);
  }
  const input = parsed.data;

  if (input.fulfilmentType === "DELIVERY" && !input.deliveryAddressId) {
    throw new HttpsError("invalid-argument", "deliveryAddressId is required for delivery orders.");
  }

  const branch = await prisma.branch.findUnique({ where: { id: input.branchId } });
  if (!branch || branch.organisationId !== customer.organisationId || !branch.isActive) {
    throw new HttpsError("not-found", "Branch not found.");
  }

  if (input.deliveryAddressId) {
    const address = await prisma.customerAddress.findUnique({ where: { id: input.deliveryAddressId } });
    if (!address || address.customerId !== customer.id) {
      throw new HttpsError("not-found", "Delivery address not found.");
    }
  }

  const productIds = [...new Set(input.items.map((i) => i.productId))];
  const products = await prisma.product.findMany({ where: { id: { in: productIds } } });
  const productById = new Map(products.map((p) => [p.id, p]));

  for (const item of input.items) {
    const product = productById.get(item.productId);
    if (!product || product.organisationId !== customer.organisationId || !product.isActive) {
      throw new HttpsError("not-found", `Product ${item.productId} not found.`);
    }
    if (product.prescriptionClassification === "RESTRICTED") {
      throw new HttpsError(
        "failed-precondition",
        `"${product.name}" is a restricted medicine and can't be ordered online — please visit a branch with your prescription.`
      );
    }
    if (!product.retailPrice) {
      throw new HttpsError("failed-precondition", `"${product.name}" has no price set.`);
    }
  }

  const subtotal = input.items.reduce(
    (sum, i) => sum + Number(productById.get(i.productId)!.retailPrice) * i.quantity,
    0
  );
  const total = subtotal;

  const order = await prisma.$transaction(async (tx) => {
    const createdOrder = await tx.order.create({
      data: {
        organisationId: customer.organisationId,
        branchId: input.branchId,
        customerId: customer.id,
        fulfilmentType: input.fulfilmentType,
        deliveryAddressId: input.deliveryAddressId,
        subtotal,
        discountTotal: 0,
        total,
      },
    });

    for (const item of input.items) {
      const product = productById.get(item.productId)!;
      const unitPrice = Number(product.retailPrice);

      const movements = await deductStockFefo(tx, {
        organisationId: customer.organisationId,
        branchId: input.branchId,
        productId: item.productId,
        quantity: item.quantity,
        movementType: StockMovementType.SALE,
        performedByCustomerId: customer.id,
        referenceType: "order",
        referenceId: createdOrder.id,
      });

      for (const movement of movements) {
        const quantity = -movement.quantityDelta;
        await tx.orderItem.create({
          data: {
            orderId: createdOrder.id,
            productId: item.productId,
            batchId: movement.batchId,
            quantity,
            unitPrice,
            lineTotal: unitPrice * quantity,
          },
        });
      }
    }

    await tx.orderPayment.create({
      data: { orderId: createdOrder.id, paymentMethod: input.paymentMethod, amount: total },
    });

    if (input.fulfilmentType === "DELIVERY") {
      await tx.delivery.create({ data: { orderId: createdOrder.id } });
    }

    return tx.order.findUniqueOrThrow({
      where: { id: createdOrder.id },
      include: { items: true, payments: true },
    });
  });

  await refreshBranchDashboard(input.branchId);

  return { order };
});
