import { HttpsError } from "firebase-functions/v2/https";
import { onCall } from "../lib/onCall";
import { z } from "zod";
import { OrderPaymentStatus, PaymentProvider, Prisma, prisma } from "@pharmacy-os/db";
import { getCallerCustomer } from "../lib/customerAuthContext";
import {
  initializePaystackTransaction,
  isPaystackPaymentMethod,
  toPaystackSubunit,
} from "./paystack";

const schema = z.object({
  orderId: z.string().uuid(),
  callbackUrl: z.string().url().optional(),
});

export const initializePaystackPayment = onCall(async (request) => {
  const customer = await getCallerCustomer(request);
  const parsed = schema.safeParse(request.data);
  if (!parsed.success) {
    throw new HttpsError("invalid-argument", parsed.error.message);
  }

  const order = await prisma.order.findFirst({
    where: { id: parsed.data.orderId, customerId: customer.id },
    include: { payments: true, branch: true },
  });

  if (!order) {
    throw new HttpsError("not-found", "Order not found.");
  }

  const payment = order.payments[0];
  if (!payment) {
    throw new HttpsError("failed-precondition", "Order has no payment row.");
  }
  if (payment.status === OrderPaymentStatus.PAID) {
    throw new HttpsError("failed-precondition", "Order is already paid.");
  }
  if (!isPaystackPaymentMethod(payment.paymentMethod)) {
    throw new HttpsError("failed-precondition", "This order's payment method is not payable through Paystack.");
  }

  if (payment.provider === PaymentProvider.PAYSTACK && payment.providerAuthorizationUrl && payment.providerReference) {
    return {
      authorizationUrl: payment.providerAuthorizationUrl,
      accessCode: payment.providerAccessCode,
      reference: payment.providerReference,
    };
  }

  const email = customer.email ?? request.auth?.token.email;
  if (!email) {
    throw new HttpsError("failed-precondition", "A customer email is required before online payment.");
  }

  const reference = `nexus_${order.id.replace(/-/g, "")}_${Date.now()}`;
  const amount = toPaystackSubunit(payment.amount);
  const result = await initializePaystackTransaction({
    email,
    amount,
    reference,
    paymentMethod: payment.paymentMethod,
    callbackUrl: parsed.data.callbackUrl,
    metadata: {
      orderId: order.id,
      branchId: order.branchId,
      customerId: customer.id,
      organisationId: customer.organisationId,
      paymentId: payment.id,
    },
  });

  const updated = await prisma.orderPayment.update({
    where: { id: payment.id },
    data: {
      provider: PaymentProvider.PAYSTACK,
      providerReference: result.data.reference,
      providerAccessCode: result.data.access_code,
      providerAuthorizationUrl: result.data.authorization_url,
      providerStatus: "initialized",
      providerResponse: result as unknown as Prisma.InputJsonValue,
    },
  });

  return {
    authorizationUrl: updated.providerAuthorizationUrl,
    accessCode: updated.providerAccessCode,
    reference: updated.providerReference,
  };
});
