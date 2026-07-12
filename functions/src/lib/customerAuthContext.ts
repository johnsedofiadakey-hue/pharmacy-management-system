import { HttpsError, type CallableRequest } from "firebase-functions/v2/https";
import { prisma, type Customer } from "@pharmacy-os/db";

/**
 * Resolves a Firebase Auth caller to their Postgres `customers` row (set by
 * linkCustomerAccount at signup). Storefront counterpart of getCallerUser —
 * a phone-only counter customer has no firebaseUid and can never call
 * customer-gated functions.
 */
export async function getCallerCustomer(request: CallableRequest): Promise<Customer> {
  const firebaseUid = request.auth?.uid;
  if (!firebaseUid) {
    throw new HttpsError("unauthenticated", "Sign in to continue.");
  }

  const customer = await prisma.customer.findUnique({ where: { firebaseUid } });
  if (!customer) {
    throw new HttpsError(
      "permission-denied",
      "No customer profile is linked to this login yet. Complete signup first."
    );
  }

  return customer;
}
