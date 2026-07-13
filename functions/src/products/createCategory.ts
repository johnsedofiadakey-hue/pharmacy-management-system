import { HttpsError } from "firebase-functions/v2/https";
import { z } from "zod";
import { onCall } from "../lib/onCall";
import { prisma, PermissionAction, PermissionResource } from "@pharmacy-os/db";
import { getCallerUser } from "../lib/authContext";
import { requirePermission } from "../lib/permissions";
import { recordAuditLog } from "../lib/auditLog";

const schema = z.object({
  name: z.string().trim().min(1).max(80),
  parentCategoryId: z.string().uuid().nullish(),
});

export const createCategory = onCall(async (request) => {
  const caller = await getCallerUser(request);

  const parsed = schema.safeParse(request.data);
  if (!parsed.success) {
    throw new HttpsError("invalid-argument", parsed.error.message);
  }
  const { name, parentCategoryId = null } = parsed.data;

  await requirePermission({
    userId: caller.id,
    organisationId: caller.organisationId,
    branchId: null,
    resource: PermissionResource.PRODUCTS,
    action: PermissionAction.CREATE,
  });

  if (parentCategoryId) {
    const parent = await prisma.category.findUnique({ where: { id: parentCategoryId } });
    if (!parent || parent.organisationId !== caller.organisationId) {
      throw new HttpsError("not-found", "Parent category not found in this organisation.");
    }
  }

  const category = await prisma.$transaction(async (tx) => {
    const result = await tx.category.create({
      data: { organisationId: caller.organisationId, name, parentCategoryId },
    });

    await recordAuditLog(tx, {
      organisationId: caller.organisationId,
      userId: caller.id,
      action: "CATEGORY_CREATED",
      resourceType: "Category",
      resourceId: result.id,
      newValue: { name, parentCategoryId },
    });

    return result;
  });

  return { category };
});
