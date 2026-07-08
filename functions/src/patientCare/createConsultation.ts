import { onCall, HttpsError } from "firebase-functions/v2/https";
import { z } from "zod";
import { prisma, PermissionResource, PermissionAction } from "@pharmacy-os/db";
import { getCallerUser } from "../lib/authContext";
import { requirePermissionAnyBranch } from "../lib/permissions";
import { ensurePatientProfile } from "./ensurePatientProfile";

const createConsultationSchema = z.object({
  customerId: z.string().uuid(),
  branchId: z.string().uuid(),
  reason: z.string().min(1),
  notes: z.string().optional(),
  outcome: z.string().optional(),
  referredToDoctor: z.boolean().optional(),
});

export const createConsultation = onCall(async (request) => {
  const caller = await getCallerUser(request);

  const parsed = createConsultationSchema.safeParse(request.data);
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

  const consultation = await prisma.consultation.create({
    data: {
      patientProfileId: patientProfile.id,
      pharmacistUserId: caller.id,
      branchId: input.branchId,
      reason: input.reason,
      notes: input.notes,
      outcome: input.outcome,
      referredToDoctor: input.referredToDoctor ?? false,
    },
  });

  return { consultation };
});
