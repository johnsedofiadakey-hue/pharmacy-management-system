import { HttpsError } from "firebase-functions/v2/https";
import { onCall } from "../lib/onCall";
import { z } from "zod";
import { prisma } from "@pharmacy-os/db";

const schema = z.object({
  organisationId: z.string().uuid(),
  phone: z.string().min(1),
  name: z.string().optional(),
  email: z.string().email().optional(),
});

/**
 * Called right after a customer signs up client-side (Firebase Auth
 * createUserWithEmailAndPassword) to link that new account to a Customer row
 * — creating one if this phone has never been seen, or attaching to an
 * existing phone-only Customer from a past in-store visit (BLUEPRINT.md §29:
 * same person, same record, whether they're a walk-in or an online
 * registrant).
 *
 * organisationId is a required param because there's no tenant-resolution
 * mechanism yet (subdomain/domain routing) — that's Phase 13 (SaaS
 * multi-tenancy). A single-org storefront deployment would hardcode this via
 * a build-time env var.
 */
export const linkCustomerAccount = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Sign-in required.");
  }

  const parsed = schema.safeParse(request.data);
  if (!parsed.success) {
    throw new HttpsError("invalid-argument", parsed.error.message);
  }
  const input = parsed.data;

  const existingByUid = await prisma.customer.findUnique({ where: { firebaseUid: request.auth.uid } });
  if (existingByUid) {
    return { customer: existingByUid };
  }

  const existingByPhone = await prisma.customer.findUnique({
    where: { organisationId_phone: { organisationId: input.organisationId, phone: input.phone } },
  });
  if (existingByPhone?.firebaseUid) {
    throw new HttpsError("already-exists", "This phone number is already linked to an account.");
  }

  const customer = existingByPhone
    ? await prisma.customer.update({
        where: { id: existingByPhone.id },
        data: { firebaseUid: request.auth.uid, name: input.name ?? existingByPhone.name, email: input.email },
      })
    : await prisma.customer.create({
        data: {
          organisationId: input.organisationId,
          phone: input.phone,
          name: input.name,
          email: input.email,
          firebaseUid: request.auth.uid,
        },
      });

  return { customer };
});
