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

  const [branchForm, setBranchForm] = useState({
    name: "",
    code: "",
    phone: "",
    email: "",
    physicalAddress: "",
    gpsLat: "",
    gpsLng: "",
  });
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
        physicalAddress: branchForm.physicalAddress || undefined,
        gpsLat: branchForm.gpsLat ? Number(branchForm.gpsLat) : undefined,
        gpsLng: branchForm.gpsLng ? Number(branchForm.gpsLng) : undefined,
      });
      setBranchForm({ name: "", code: "", phone: "", email: "", physicalAddress: "", gpsLat: "", gpsLng: "" });
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
    <main className="page-wrap py-8">
      <div className="mb-6">
        <p className="text-sm font-semibold uppercase text-[color:var(--primary)]">Super Admin</p>
        <h1 className="mt-1 text-3xl font-semibold text-[color:var(--secondary)]">Branches and staff access</h1>
        <p className="mt-2 max-w-2xl text-sm text-[color:var(--muted)]">
          Create multiple pharmacy branches, add exact coordinates for nearest-branch discovery, then assign branch managers and staff.
        </p>
      </div>

      <form
        onSubmit={handleCreateBranch}
        className="mb-8 grid gap-3 clinical-card rounded-xl p-5 md:grid-cols-2"
      >
        <h2 className="font-medium text-[color:var(--secondary)] md:col-span-2">Add branch</h2>
        <input
          required
          placeholder="Branch name"
          className="field px-3 py-2"
          value={branchForm.name}
          onChange={(e) => setBranchForm({ ...branchForm, name: e.target.value })}
        />
        <input
          required
          placeholder="Branch code (e.g. EL01)"
          className="field px-3 py-2"
          value={branchForm.code}
          onChange={(e) => setBranchForm({ ...branchForm, code: e.target.value })}
        />
        <input
          placeholder="Phone"
          className="field px-3 py-2"
          value={branchForm.phone}
          onChange={(e) => setBranchForm({ ...branchForm, phone: e.target.value })}
        />
        <input
          placeholder="Email"
          className="field px-3 py-2"
          value={branchForm.email}
          onChange={(e) => setBranchForm({ ...branchForm, email: e.target.value })}
        />
        <input
          placeholder="Physical address"
          className="field px-3 py-2 md:col-span-2"
          value={branchForm.physicalAddress}
          onChange={(e) => setBranchForm({ ...branchForm, physicalAddress: e.target.value })}
        />
        <input
          type="number"
          step="any"
          placeholder="Latitude, e.g. 5.6037"
          className="field px-3 py-2"
          value={branchForm.gpsLat}
          onChange={(e) => setBranchForm({ ...branchForm, gpsLat: e.target.value })}
        />
        <input
          type="number"
          step="any"
          placeholder="Longitude, e.g. -0.1870"
          className="field px-3 py-2"
          value={branchForm.gpsLng}
          onChange={(e) => setBranchForm({ ...branchForm, gpsLng: e.target.value })}
        />
        <button
          type="submit"
          disabled={creatingBranch}
          className="btn-primary px-4 py-2 disabled:opacity-50 md:col-span-2"
        >
          {creatingBranch ? "Creating..." : "Create branch"}
        </button>
      </form>

      {error && <p className="mb-4 rounded bg-red-50 p-3 text-sm text-[color:var(--danger)]">{error}</p>}

      {loading ? (
        <p>Loading branches...</p>
      ) : branches.length === 0 ? (
        <p className="text-[color:var(--muted)]">No branches yet.</p>
      ) : (
        <ul className="mb-8 flex flex-col gap-2">
          {branches.map((branch) => (
            <li key={branch.id} className="clinical-card flex items-center justify-between rounded-xl p-4">
              <div>
                <div className="font-medium">
                  {branch.name}{" "}
                  {!branch.isActive && (
                    <span className="status-pill status-warn">Inactive</span>
                  )}
                </div>
                <div className="text-sm text-[color:var(--muted)]">
                  {branch.code}
                  {branch.physicalAddress ? ` • ${branch.physicalAddress}` : ""}
                </div>
                {branch.gpsLat != null && branch.gpsLng != null && (
                  <div className="text-xs text-[color:var(--muted)]">
                    {branch.gpsLat.toFixed(5)}, {branch.gpsLng.toFixed(5)}
                  </div>
                )}
              </div>
              <button
                onClick={() => handleToggleActive(branch)}
                className="btn-secondary px-3 py-1 text-sm"
              >
                {branch.isActive ? "Deactivate" : "Reactivate"}
              </button>
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={handleInvite} className="flex flex-col gap-3 clinical-card rounded-xl p-4">
        <h2 className="font-medium">Invite staff member</h2>
        <input
          required
          placeholder="Full name"
          className="field px-3 py-2"
          value={inviteForm.name}
          onChange={(e) => setInviteForm({ ...inviteForm, name: e.target.value })}
        />
        <input
          required
          type="email"
          placeholder="Email"
          className="field px-3 py-2"
          value={inviteForm.email}
          onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
        />
        <select
          required
          className="field px-3 py-2"
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
          className="field px-3 py-2"
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
          className="btn-primary px-4 py-2 disabled:opacity-50"
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
