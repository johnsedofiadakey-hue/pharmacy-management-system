import { Prisma, type PrismaClient } from "@pharmacy-os/db";

type Db = PrismaClient | Prisma.TransactionClient;

/**
 * Append-only audit trail (BLUEPRINT.md §7: nothing hard-deleted anywhere).
 * Accepts either the root client or a transaction client so sensitive
 * mutations can write their audit entry atomically with the change itself.
 */
export async function recordAuditLog(
  db: Db,
  entry: {
    organisationId: string;
    userId?: string | null;
    branchId?: string | null;
    action: string;
    resourceType: string;
    resourceId?: string | null;
    oldValue?: unknown;
    newValue?: unknown;
  }
): Promise<void> {
  await db.auditLog.create({
    data: {
      organisationId: entry.organisationId,
      userId: entry.userId ?? null,
      branchId: entry.branchId ?? null,
      action: entry.action,
      resourceType: entry.resourceType,
      resourceId: entry.resourceId ?? null,
      oldValue: (entry.oldValue ?? undefined) as Prisma.InputJsonValue | undefined,
      newValue: (entry.newValue ?? undefined) as Prisma.InputJsonValue | undefined,
    },
  });
}
