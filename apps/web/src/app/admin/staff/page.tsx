"use client";

import { useEffect, useMemo, useState } from "react";
import {
  assignUserRole,
  inviteStaffMember,
  listBranches,
  listRoles,
  listStaffMembers,
  setStaffActive,
  type Branch,
  type Role,
  type StaffDirectoryUser,
} from "@/lib/firebase/callables";
import { Alert, Badge, Button } from "@/components/ui";

export default function AdminStaffPage() {
  const [staff, setStaff] = useState<StaffDirectoryUser[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [inviteLink, setInviteLink] = useState("");
  const [busy, setBusy] = useState(false);
  const [inviteForm, setInviteForm] = useState({
    name: "",
    email: "",
    roleId: "",
    branchId: "",
  });
  const [grantForm, setGrantForm] = useState({
    targetUserId: "",
    roleId: "",
    branchId: "",
  });

  async function refresh() {
    try {
      const [staffResult, roleResult, branchResult] = await Promise.all([
        listStaffMembers(),
        listRoles(),
        listBranches(),
      ]);
      setStaff(staffResult.data.users);
      setRoles(roleResult.data.roles);
      setBranches(branchResult.data.branches);
      setInviteForm((current) => ({
        ...current,
        roleId: current.roleId || roleResult.data.roles[0]?.id || "",
      }));
      setGrantForm((current) => ({
        ...current,
        targetUserId: current.targetUserId || staffResult.data.users[0]?.id || "",
        roleId: current.roleId || roleResult.data.roles[0]?.id || "",
      }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load staff.");
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refresh();
  }, []);

  async function handleInvite(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setMessage(null);
    setInviteLink("");
    try {
      const result = await inviteStaffMember({
        name: inviteForm.name,
        email: inviteForm.email,
        roleId: inviteForm.roleId,
        branchId: inviteForm.branchId || null,
      });
      setInviteLink(result.data.inviteLink);
      setInviteForm({ name: "", email: "", roleId: inviteForm.roleId, branchId: "" });
      setMessage("Staff invite created.");
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to invite staff member.");
    } finally {
      setBusy(false);
    }
  }

  async function handleGrant(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      await assignUserRole({
        targetUserId: grantForm.targetUserId,
        roleId: grantForm.roleId,
        branchId: grantForm.branchId || null,
      });
      setMessage("Role grant saved.");
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to assign role.");
    } finally {
      setBusy(false);
    }
  }

  async function toggleActive(user: StaffDirectoryUser) {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      await setStaffActive({ targetUserId: user.id, isActive: !user.isActive });
      setMessage(`${user.name} ${user.isActive ? "deactivated" : "reactivated"}.`);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update staff status.");
    } finally {
      setBusy(false);
    }
  }

  const activeCount = useMemo(() => staff.filter((user) => user.isActive !== false).length, [staff]);

  return (
    <main className="page-wrap py-8">
      <div className="mb-6">
        <p className="text-sm font-semibold uppercase text-[color:var(--primary)]">Super Admin</p>
        <h1 className="mt-1 text-3xl font-semibold text-[color:var(--secondary)]">Staff management</h1>
        <p className="mt-2 max-w-2xl text-sm text-[color:var(--muted)]">
          Invite staff, assign role grants across multiple branches, and deactivate accounts without deleting history.
        </p>
      </div>

      {error && <Alert tone="error" className="mb-4">{error}</Alert>}
      {message && <Alert tone="success" className="mb-4">{message}</Alert>}

      <div className="mb-8 grid gap-4 xl:grid-cols-2">
        <form onSubmit={handleInvite} className="clinical-card grid gap-3 rounded-xl p-5 md:grid-cols-2">
          <h2 className="font-semibold text-[color:var(--secondary)] md:col-span-2">Invite staff member</h2>
          <input
            required
            className="field px-3 py-2"
            placeholder="Full name"
            value={inviteForm.name}
            onChange={(e) => setInviteForm({ ...inviteForm, name: e.target.value })}
          />
          <input
            required
            type="email"
            className="field px-3 py-2"
            placeholder="Email"
            value={inviteForm.email}
            onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
          />
          <select
            required
            className="field px-3 py-2"
            value={inviteForm.roleId}
            onChange={(e) => setInviteForm({ ...inviteForm, roleId: e.target.value })}
          >
            {roles.map((role) => (
              <option key={role.id} value={role.id}>
                {role.name}
              </option>
            ))}
          </select>
          <select
            className="field px-3 py-2"
            value={inviteForm.branchId}
            onChange={(e) => setInviteForm({ ...inviteForm, branchId: e.target.value })}
          >
            <option value="">Org-wide access</option>
            {branches.map((branch) => (
              <option key={branch.id} value={branch.id}>
                {branch.name}
              </option>
            ))}
          </select>
          <Button type="submit" disabled={busy || !inviteForm.roleId} className="md:col-span-2">
            Create invite
          </Button>
          {inviteLink && (
            <textarea readOnly className="field min-h-20 px-3 py-2 text-xs md:col-span-2" value={inviteLink} />
          )}
        </form>

        <form onSubmit={handleGrant} className="clinical-card grid gap-3 rounded-xl p-5 md:grid-cols-2">
          <h2 className="font-semibold text-[color:var(--secondary)] md:col-span-2">Add branch or role grant</h2>
          <select
            required
            className="field px-3 py-2"
            value={grantForm.targetUserId}
            onChange={(e) => setGrantForm({ ...grantForm, targetUserId: e.target.value })}
          >
            {staff.map((user) => (
              <option key={user.id} value={user.id}>
                {user.name} {user.email ? `(${user.email})` : ""}
              </option>
            ))}
          </select>
          <select
            required
            className="field px-3 py-2"
            value={grantForm.roleId}
            onChange={(e) => setGrantForm({ ...grantForm, roleId: e.target.value })}
          >
            {roles.map((role) => (
              <option key={role.id} value={role.id}>
                {role.name}
              </option>
            ))}
          </select>
          <select
            className="field px-3 py-2 md:col-span-2"
            value={grantForm.branchId}
            onChange={(e) => setGrantForm({ ...grantForm, branchId: e.target.value })}
          >
            <option value="">Org-wide grant</option>
            {branches.map((branch) => (
              <option key={branch.id} value={branch.id}>
                {branch.name}
              </option>
            ))}
          </select>
          <Button type="submit" disabled={busy || !grantForm.targetUserId || !grantForm.roleId} className="md:col-span-2">
            Save role grant
          </Button>
        </form>
      </div>

      <section className="clinical-card rounded-xl p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-semibold text-[color:var(--secondary)]">Staff directory</h2>
          <div className="flex gap-2">
            <Badge tone="safe">{activeCount} active</Badge>
            <Badge tone="info">{staff.length} total</Badge>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[920px] text-sm">
            <thead>
              <tr className="border-b border-[color:var(--border)] text-left text-[color:var(--muted)]">
                <th className="px-3 py-2 font-medium">Staff</th>
                <th className="px-3 py-2 font-medium">Primary branch</th>
                <th className="px-3 py-2 font-medium">Role grants</th>
                <th className="px-3 py-2 font-medium">Status</th>
                <th className="px-3 py-2 font-medium">Action</th>
              </tr>
            </thead>
            <tbody>
              {staff.map((user) => (
                <tr key={user.id} className="border-b border-[color:var(--border)] last:border-0">
                  <td className="px-3 py-3">
                    <div className="font-medium text-[color:var(--secondary)]">{user.name}</div>
                    <div className="text-xs text-[color:var(--muted)]">{user.email ?? user.phone ?? "No contact"}</div>
                  </td>
                  <td className="px-3 py-3">{user.primaryBranch?.name ?? "Not set"}</td>
                  <td className="px-3 py-3">
                    <div className="flex flex-wrap gap-1.5">
                      {user.userRoles?.length ? (
                        user.userRoles.map((grant) => (
                          <Badge key={grant.id ?? `${user.id}-${grant.role.name}-${grant.branchId ?? "org"}`} tone="neutral">
                            {grant.role.name} · {grant.branch?.name ?? "Org-wide"}
                          </Badge>
                        ))
                      ) : (
                        <span className="text-[color:var(--muted)]">No role grants</span>
                      )}
                    </div>
                  </td>
                  <td className="px-3 py-3">
                    <Badge tone={user.isActive === false ? "danger" : "safe"}>
                      {user.isActive === false ? "Inactive" : "Active"}
                    </Badge>
                  </td>
                  <td className="px-3 py-3">
                    <button
                      type="button"
                      className={user.isActive === false ? "btn-secondary px-3 py-1.5 text-xs" : "btn-secondary px-3 py-1.5 text-xs text-[color:var(--danger)]"}
                      onClick={() => toggleActive(user)}
                      disabled={busy}
                    >
                      {user.isActive === false ? "Reactivate" : "Deactivate"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
