import { HttpsError } from "firebase-functions/v2/https";
import { OrderPaymentStatus, OrderStatus, PaymentMethod, PaymentProvider, Prisma, prisma } from "@pharmacy-os/db";

const PAYSTACK_BASE_URL = "https://api.paystack.co";

type PaystackInitializeData = {
  authorization_url: string;
  access_code: string;
  reference: string;
};

type PaystackVerifyData = {
  status: string;
  amount: number;
  currency: string;
  reference: string;
  paid_at?: string | null;
  channel?: string | null;
};

type PaystackResponse<T> = {
  status: boolean;
  message: string;
  data: T;
};

export function isPaystackPaymentMethod(paymentMethod: PaymentMethod) {
  return (
    paymentMethod === PaymentMethod.CARD ||
    paymentMethod === PaymentMethod.MOMO ||
    paymentMethod === PaymentMethod.BANK_TRANSFER
  );
}

export function paystackChannels(paymentMethod: PaymentMethod) {
  if (paymentMethod === PaymentMethod.CARD) return ["card"];
  if (paymentMethod === PaymentMethod.MOMO) return ["mobile_money"];
  if (paymentMethod === PaymentMethod.BANK_TRANSFER) return ["bank_transfer"];
  return ["card", "mobile_money", "bank_transfer"];
}

export function toPaystackSubunit(amount: Prisma.Decimal | number | string) {
  return Math.round(Number(amount) * 100);
}

export function getPaystackSecretKey() {
  const key = process.env.PAYSTACK_SECRET_KEY;
  if (!key) {
    throw new HttpsError(
      "failed-precondition",
      "PAYSTACK_SECRET_KEY is not configured for this Functions environment."
    );
  }
  return key;
}

export async function callPaystack<T>(path: string, options: RequestInit = {}) {
  const response = await fetch(`${PAYSTACK_BASE_URL}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${getPaystackSecretKey()}`,
      "Content-Type": "application/json",
      ...(options.headers ?? {}),
    },
  });

  const body = (await response.json()) as PaystackResponse<T>;
  if (!response.ok || !body.status) {
    throw new HttpsError("failed-precondition", body.message || "Paystack request failed.");
  }
  return body;
}

export async function initializePaystackTransaction(input: {
  email: string;
  amount: number;
  reference: string;
  paymentMethod: PaymentMethod;
  callbackUrl?: string;
  metadata: Record<string, unknown>;
}) {
  return callPaystack<PaystackInitializeData>("/transaction/initialize", {
    method: "POST",
    body: JSON.stringify({
      email: input.email,
      amount: input.amount,
      currency: "GHS",
      reference: input.reference,
      channels: paystackChannels(input.paymentMethod),
      callback_url: input.callbackUrl,
      metadata: input.metadata,
    }),
  });
}

export async function verifyPaystackTransaction(reference: string) {
  return callPaystack<PaystackVerifyData>(`/transaction/verify/${encodeURIComponent(reference)}`);
}

export async function markPaystackPaymentVerified(input: {
  paymentId: string;
  orderId: string;
  expectedAmount: number;
  verifyResponse: PaystackResponse<PaystackVerifyData>;
}) {
  const verified = input.verifyResponse.data;
  const isPaid =
    verified.status === "success" &&
    verified.currency === "GHS" &&
    verified.amount === input.expectedAmount;

  if (!isPaid) {
    const failedStatuses = new Set(["failed", "abandoned", "reversed"]);
    return prisma.orderPayment.update({
      where: { id: input.paymentId },
      data: {
        status: failedStatuses.has(verified.status) ? OrderPaymentStatus.FAILED : OrderPaymentStatus.PENDING,
        providerStatus: verified.status,
        providerResponse: input.verifyResponse as unknown as Prisma.InputJsonValue,
      },
    });
  }

  return prisma.$transaction(async (tx) => {
    const payment = await tx.orderPayment.update({
      where: { id: input.paymentId },
      data: {
        status: OrderPaymentStatus.PAID,
        providerStatus: verified.status,
        providerResponse: input.verifyResponse as unknown as Prisma.InputJsonValue,
        paidAt: verified.paid_at ? new Date(verified.paid_at) : new Date(),
      },
    });

    await tx.order.update({
      where: { id: input.orderId },
      data: { status: OrderStatus.CONFIRMED },
    });

    return payment;
  });
}

export { PaymentProvider };
