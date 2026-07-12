import { HttpsError } from "firebase-functions/v2/https";
import { onCall } from "../lib/onCall";
import { z } from "zod";
import { prisma, PermissionResource, PermissionAction } from "@pharmacy-os/db";
import { getCallerUser } from "../lib/authContext";
import { requirePermissionAnyBranch } from "../lib/permissions";
import { ensurePatientProfile } from "./ensurePatientProfile";

const recordVitalsSchema = z.object({
  customerId: z.string().uuid(),
  branchId: z.string().uuid(),
  bpSystolic: z.number().int().optional(),
  bpDiastolic: z.number().int().optional(),
  glucoseLevel: z.number().optional(),
  weightKg: z.number().optional(),
  heightCm: z.number().optional(),
});

export const recordVitals = onCall(async (request) => {
  const caller = await getCallerUser(request);

  const parsed = recordVitalsSchema.safeParse(request.data);
  if (!parsed.success) {
    throw new HttpsError("invalid-argument", parsed.error.message);
  }
  const input = parsed.data;

  await requirePermissionAnyBranch({
    userId: caller.id,
    resource: PermissionResource.PATIENTS,
    action: PermissionAction.CREATE,
  });

  const [customer, branch] = await Promise.all([
    prisma.customer.findUnique({ where: { id: input.customerId } }),
    prisma.branch.findUnique({ where: { id: input.branchId } }),
  ]);
  if (!customer || customer.organisationId !== caller.organisationId) {
    throw new HttpsError("not-found", "Customer not found in this organisation.");
  }
  if (!branch || branch.organisationId !== caller.organisationId) {
    throw new HttpsError("not-found", "Branch not found in this organisation.");
  }
  if (!branch.clinicalCareEnabled) {
    throw new HttpsError("failed-precondition", "Clinical care is not enabled at this branch.");
  }

  const patientProfile = await ensurePatientProfile(customer.id);

  const vital = await prisma.patientVital.create({
    data: {
      patientProfileId: patientProfile.id,
      recordedByBranchId: input.branchId,
      recordedByUserId: caller.id,
      bpSystolic: input.bpSystolic,
      bpDiastolic: input.bpDiastolic,
      glucoseLevel: input.glucoseLevel,
      weightKg: input.weightKg,
      heightCm: input.heightCm,
    },
  });

  return { vital };
});
