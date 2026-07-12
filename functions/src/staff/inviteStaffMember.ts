import { HttpsError } from "firebase-functions/v2/https";
import { onCall } from "../lib/onCall";
import { z } from "zod";
import { prisma, PermissionResource, PermissionAction } from "@pharmacy-os/db";
import { auth } from "../admin";
import { getCallerUser } from "../lib/authContext";
import { requirePermission } from "../lib/permissions";
import { computeAndSyncClaims } from "../auth/claims";

const inviteStaffMemberSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  roleId: z.string().uuid(),
  branchId: z.string().uuid().nullish(),
});

/**
 * Creates a Firebase Auth account + Postgres user row + initial role grant for a
 * new staff member, and returns a Firebase password-set link.
 *
 * NOTE: this does not send an email/SMS/WhatsApp message yet — no notification
 * provider (SendGrid/Mailgun/Twilio/WhatsApp Business API) is wired up. The
 * caller (Super Admin UI) gets the raw link back to copy/share manually. Wire a
 * real provider here when one is chosen; the invite mechanics (account +
 * role + link generation) are already correct and won't need to change.
 */
export const inviteStaffMember = onCall(async (request) => {
  const caller = await getCallerUser(request);

  const parsed = inviteStaffMemberSchema.safeParse(request.data);
  if (!parsed.success) {
    throw new HttpsError("invalid-argument", parsed.error.message);
  }
  const { name, email, roleId, branchId = null } = parsed.data;

  await requirePermission({
    userId: caller.id,
    organisationId: caller.organisationId,
    branchId,
    resource: PermissionResource.EMPLOYEES,
    action: PermissionAction.CREATE,
  });

  const [role, branch] = await Promise.all([
    prisma.role.findUnique({ where: { id: roleId } }),
    branchId ? prisma.branch.findUnique({ where: { id: branchId } }) : null,
  ]);

  if (!role || (role.organisationId !== null && role.organisationId !== caller.organisationId)) {
    throw new HttpsError("not-found", "Role not found in this organisation.");
  }
  if (branchId && (!branch || branch.organisationId !== caller.organisationId)) {
    throw new HttpsError("not-found", "Branch not found in this organisation.");
  }

  const existing = await prisma.user.findFirst({ where: { email, organisationId: caller.organisationId } });
  if (existing) {
    throw new HttpsError("already-exists", "A staff member with this email already exists.");
  }

  const firebaseUser = await auth.createUser({ email, displayName: name, disabled: false });

  try {
    const newUser = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          organisationId: caller.organisationId,
          firebaseUid: firebaseUser.uid,
          name,
          email,
        },
      });
      await tx.userRole.create({
        data: { userId: user.id, roleId, branchId },
      });
      return user;
    });

    await computeAndSyncClaims(newUser.id);
    const inviteLink = await auth.generatePasswordResetLink(email);

    return { user: newUser, inviteLink };
  } catch (err) {
    // Best-effort cleanup so a failed Postgres write doesn't leave an orphaned
    // Firebase Auth account with no corresponding user record.
    await auth.deleteUser(firebaseUser.uid).catch(() => undefined);
    throw err;
  }
});
