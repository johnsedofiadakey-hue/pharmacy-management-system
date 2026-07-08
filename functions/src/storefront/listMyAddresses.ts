import { onCall } from "firebase-functions/v2/https";
import { prisma } from "@pharmacy-os/db";
import { getCallerCustomer } from "../lib/customerAuthContext";

export const listMyAddresses = onCall(async (request) => {
  const customer = await getCallerCustomer(request);

  const addresses = await prisma.customerAddress.findMany({
    where: { customerId: customer.id },
    orderBy: { createdAt: "desc" },
  });

  return { addresses };
});
