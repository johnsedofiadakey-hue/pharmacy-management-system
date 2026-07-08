"use client";

import { useEffect, useState } from "react";
import {
  listBranches,
  createBranch,
  setBranchActive,
  listRoles,
  inviteStaffMember,
  type Branch,
  type Role,
} from "@/lib/firebase/callables";

// Super Admin: create/deactivate branches and invite staff.
// Phase 1 skeleton — not yet exercisable end-to-end without a real Firebase
// project (see BLUEPRINT.md Phase 0/1 build logs), but the wiring is complete.
export default function BranchesPage() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [branchForm, setBranchForm] = useState({ name: "", code: "", phone: "", email: "" });
  const [creatingBranch, setCreatingBranch] = useState(false);

  const [inviteForm, setInviteForm] = useState({ name: "", email: "", roleId: "", branchId: "" });
  const [inviting, setInviting] = useState(false);
  const [inviteLink, setInviteLink] = useState<string | null>(null);

  async function refresh() {
    setLoading(true);
    setError(null);
    try {
      const [branchResult, roleResult] = await Promise.all([listBranches(), listRoles()]);
      setBranches(branchResult.data.branches);
      setRoles(roleResult.data.roles);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load data.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  async function handleCreateBranch(event: React.FormEvent) {
    event.preventDefault();
    setCreatingBranch(true);
    setError(null);
    try {
      await createBranch({
        name: branchForm.name,
        code: branchForm.code,
        phone: branchForm.phone || undefined,
        email: branchForm.email || undefined,
      });
      setBranchForm({ name: "", code: "", phone: "", email: "" });
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create branch.");
    } finally {
      setCreatingBranch(false);
    }
  }

  async function handleToggleActive(branch: Branch) {
    setError(null);
    try {
      await setBranchActive({ branchId: branch.id, isActive: !branch.isActive });
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update branch status.");
    }
  }

  async function handleInvite(event: React.FormEvent) {
    event.preventDefault();
    setInviting(true);
    setError(null);
    setInviteLink(null);
    try {
      const result = await inviteStaffMember({
        name: inviteForm.name,
        email: inviteForm.email,
        roleId: inviteForm.roleId,
        branchId: inviteForm.branchId || null,
      });
      setInviteLink(result.data.inviteLink);
      setInviteForm({ name: "", email: "", roleId: "", branchId: "" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to invite staff member.");
    } finally {
      setInviting(false);
    }
  }

  return (
    <main className="mx-auto max-w-2xl p-8">
      <h1 className="text-2xl font-semibold mb-6">Branches</h1>

      <form
        onSubmit={handleCreateBranch}
        className="mb-8 flex flex-col gap-3 rounded-lg border p-4"
      >
        <h2 className="font-medium">Add branch</h2>
        <input
          required
          placeholder="Branch name"
          className="rounded border px-3 py-2"
          value={branchForm.name}
          onChange={(e) => setBranchForm({ ...branchForm, name: e.target.value })}
        />
        <input
          required
          placeholder="Branch code (e.g. EL01)"
          className="rounded border px-3 py-2"
          value={branchForm.code}
          onChange={(e) => setBranchForm({ ...branchForm, code: e.target.value })}
        />
        <input
          placeholder="Phone"
          className="rounded border px-3 py-2"
          value={branchForm.phone}
          onChange={(e) => setBranchForm({ ...branchForm, phone: e.target.value })}
        />
        <input
          placeholder="Email"
          className="rounded border px-3 py-2"
          value={branchForm.email}
          onChange={(e) => setBranchForm({ ...branchForm, email: e.target.value })}
        />
        <button
          type="submit"
          disabled={creatingBranch}
          className="rounded bg-black px-4 py-2 text-white disabled:opacity-50"
        >
          {creatingBranch ? "Creating..." : "Create branch"}
        </button>
      </form>

      {error && <p className="mb-4 text-red-600">{error}</p>}

      {loading ? (
        <p>Loading branches...</p>
      ) : branches.length === 0 ? (
        <p className="text-gray-500">No branches yet.</p>
      ) : (
        <ul className="mb-8 flex flex-col gap-2">
          {branches.map((branch) => (
            <li
              key={branch.id}
              className="flex items-center justify-between rounded border p-3"
            >
              <div>
                <div className="font-medium">
                  {branch.name}{" "}
                  {!branch.isActive && (
                    <span className="text-xs text-red-600">(inactive)</span>
                  )}
                </div>
                <div className="text-sm text-gray-500">{branch.code}</div>
              </div>
              <button
                onClick={() => handleToggleActive(branch)}
                className="rounded border px-3 py-1 text-sm"
              >
                {branch.isActive ? "Deactivate" : "Reactivate"}
              </button>
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={handleInvite} className="flex flex-col gap-3 rounded-lg border p-4">
        <h2 className="font-medium">Invite staff member</h2>
        <input
          required
          placeholder="Full name"
          className="rounded border px-3 py-2"
          value={inviteForm.name}
          onChange={(e) => setInviteForm({ ...inviteForm, name: e.target.value })}
        />
        <input
          required
          type="email"
          placeholder="Email"
          className="rounded border px-3 py-2"
          value={inviteForm.email}
          onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
        />
        <select
          required
          className="rounded border px-3 py-2"
          value={inviteForm.roleId}
          onChange={(e) => setInviteForm({ ...inviteForm, roleId: e.target.value })}
        >
          <option value="">Select role...</option>
          {roles.map((role) => (
            <option key={role.id} value={role.id}>
              {role.name}
            </option>
          ))}
        </select>
        <select
          className="rounded border px-3 py-2"
          value={inviteForm.branchId}
          onChange={(e) => setInviteForm({ ...inviteForm, branchId: e.target.value })}
        >
          <option value="">Org-wide (no specific branch)</option>
          {branches.map((branch) => (
            <option key={branch.id} value={branch.id}>
              {branch.name}
            </option>
          ))}
        </select>
        <button
          type="submit"
          disabled={inviting}
          className="rounded bg-black px-4 py-2 text-white disabled:opacity-50"
        >
          {inviting ? "Inviting..." : "Send invite"}
        </button>
        {inviteLink && (
          <p className="break-all rounded bg-gray-100 p-2 text-sm">
            Invite link (no email/SMS provider wired up yet — share manually): {inviteLink}
          </p>
        )}
      </form>
    </main>
  );
}
