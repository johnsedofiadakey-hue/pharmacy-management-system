import { HttpsError } from "firebase-functions/v2/https";
import { onCall } from "../lib/onCall";
import { z } from "zod";
import { prisma, Prisma, PermissionResource, PermissionAction } from "@pharmacy-os/db";
import { getCallerUser } from "../lib/authContext";
import { requirePermissionAnyBranch } from "../lib/permissions";
import { ensurePatientProfile } from "./ensurePatientProfile";

const schema = z.object({
  customerId: z.string().uuid(),
  allergies: z.array(z.string()).optional(),
  chronicConditions: z.array(z.string()).optional(),
  consentClinicalData: z.boolean().optional(),
});

export const updatePatientProfile = onCall(async (request) => {
  const caller = await getCallerUser(request);

  const parsed = schema.safeParse(request.data);
  if (!parsed.success) {
    throw new HttpsError("invalid-argument", parsed.error.message);
  }
  const input = parsed.data;

  await requirePermissionAnyBranch({
    userId: caller.id,
    resource: PermissionResource.PATIENTS,
    action: PermissionAction.EDIT,
  });

  const customer = await prisma.customer.findUnique({ where: { id: input.customerId } });
  if (!customer || customer.organisationId !== caller.organisationId) {
    throw new HttpsError("not-found", "Customer not found in this organisation.");
  }

  await ensurePatientProfile(customer.id);

  const patientProfile = await prisma.patientProfile.update({
    where: { customerId: customer.id },
    data: {
      allergies: input.allergies as Prisma.InputJsonValue | undefined,
      chronicConditions: input.chronicConditions as Prisma.InputJsonValue | undefined,
      consentClinicalData: input.consentClinicalData,
      consentDate: input.consentClinicalData ? new Date() : undefined,
    },
  });

  return { patientProfile };
});
