import { onCall } from "../lib/onCall";
import { prisma, PermissionAction, PermissionResource } from "@pharmacy-os/db";
import { getCallerUser } from "../lib/authContext";
import { requirePermissionAnyBranch } from "../lib/permissions";

export const listCategories = onCall(async (request) => {
  const caller = await getCallerUser(request);

  await requirePermissionAnyBranch({
    userId: caller.id,
    resource: PermissionResource.PRODUCTS,
    action: PermissionAction.VIEW,
  });

  const categories = await prisma.category.findMany({
    where: { organisationId: caller.organisationId },
    include: { parentCategory: { select: { id: true, name: true } }, _count: { select: { products: true } } },
    orderBy: { name: "asc" },
  });

  return { categories };
});
