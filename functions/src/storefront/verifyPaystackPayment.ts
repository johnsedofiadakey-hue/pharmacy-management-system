import { onCall, HttpsError } from "firebase-functions/v2/https";
import { z } from "zod";
import { PaymentProvider, prisma } from "@pharmacy-os/db";
import { getCallerCustomer } from "../lib/customerAuthContext";
import { markPaystackPaymentVerified, toPaystackSubunit, verifyPaystackTransaction } from "./paystack";

const schema = z.object({
  reference: z.string().min(6),
});

export const verifyPaystackPayment = onCall(async (request) => {
  const customer = await getCallerCustomer(request);
  const parsed = schema.safeParse(request.data);
  if (!parsed.success) {
    throw new HttpsError("invalid-argument", parsed.error.message);
  }

  const payment = await prisma.orderPayment.findFirst({
    where: {
      provider: PaymentProvider.PAYSTACK,
      providerReference: parsed.data.reference,
      order: { customerId: customer.id },
    },
    include: { order: true },
  });

  if (!payment) {
    throw new HttpsError("not-found", "Payment not found.");
  }

  const verifyResponse = await verifyPaystackTransaction(parsed.data.reference);
  const updatedPayment = await markPaystackPaymentVerified({
    paymentId: payment.id,
    orderId: payment.orderId,
    expectedAmount: toPaystackSubunit(payment.amount),
    verifyResponse,
  });

  const order = await prisma.order.findUniqueOrThrow({
    where: { id: payment.orderId },
    include: { items: { include: { product: true } }, payments: true, delivery: true, branch: true },
  });

  return {
    payment: updatedPayment,
    order,
    providerStatus: verifyResponse.data.status,
  };
});
