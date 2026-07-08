import { prisma } from "@pharmacy-os/db";

/** Recording any clinical data for a customer promotes them to a patient — creates the PatientProfile and flips Customer.isPatient if this is their first clinical record. */
export async function ensurePatientProfile(customerId: string) {
  const existing = await prisma.patientProfile.findUnique({ where: { customerId } });
  if (existing) return existing;

  return prisma.$transaction(async (tx) => {
    await tx.customer.update({ where: { id: customerId }, data: { isPatient: true } });
    return tx.patientProfile.create({ data: { customerId } });
  });
}
