import { onCall, HttpsError } from "firebase-functions/v2/https";
import { z } from "zod";
import { prisma, PermissionResource, PermissionAction } from "@pharmacy-os/db";
import { getCallerUser } from "../lib/authContext";
import { requirePermission } from "../lib/permissions";

const createSupplierSchema = z.object({
  companyName: z.string().min(1),
  contactPerson: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  address: z.string().optional(),
  paymentTerms: z.string().optional(),
  avgDeliveryDays: z.number().int().positive().optional(),
});

export const createSupplier = onCall(async (request) => {
  const caller = await getCallerUser(request);

  await requirePermission({
    userId: caller.id,
    branchId: null,
    resource: PermissionResource.SUPPLIERS,
    action: PermissionAction.CREATE,
  });

  const parsed = createSupplierSchema.safeParse(request.data);
  if (!parsed.success) {
    throw new HttpsError("invalid-argument", parsed.error.message);
  }

  const supplier = await prisma.supplier.create({
    data: { organisationId: caller.organisationId, ...parsed.data },
  });

  return { supplier };
});
