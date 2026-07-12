import { onCall } from "../lib/onCall";
import { prisma } from "@pharmacy-os/db";
import { getCallerCustomer } from "../lib/customerAuthContext";

export const listMyOrders = onCall(async (request) => {
  const customer = await getCallerCustomer(request);

  const orders = await prisma.order.findMany({
    where: { customerId: customer.id },
    include: { items: { include: { product: true } }, payments: true, delivery: true, branch: true },
    orderBy: { createdAt: "desc" },
  });

  return { orders };
});
