"use client";

import { useEffect, useState } from "react";
import {
  listBranches,
  clockIn,
  clockOut,
  listPendingStockAdjustmentRequests,
  reviewStockAdjustmentRequest,
  type Branch,
  type StockAdjustmentRequestRow,
} from "@/lib/firebase/callables";
import { useBranchLive } from "@/lib/firebase/useBranchLive";

// Phase 4 skeleton — branch is manually selected (same follow-up noted in the
// POS page: auto-detecting from the user's assigned branch needs a read of
// the Firestore users/{uid} mirror doc, not built yet). Not yet exercisable
// end-to-end without a real Firebase/Supabase project.
export default function BranchDashboardPage() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [branchId, setBranchId] = useState("");
  const [shiftId, setShiftId] = useState<string | null>(null);
  const [requests, setRequests] = useState<StockAdjustmentRequestRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  const live = useBranchLive(branchId || null);

  useEffect(() => {
    listBranches()
      .then((r) => setBranches(r.data.branches))
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load branches."));
  }, []);

  async function refreshRequests() {
    if (!branchId) return;
    try {
      const result = await listPendingStockAdjustmentRequests(branchId);
      setRequests(result.data.requests);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load pending approvals.");
    }
  }

  useEffect(() => {
    refreshRequests();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [branchId]);

  async function handleClockIn() {
    setError(null);
    try {
      const result = await clockIn(branchId);
      setShiftId((result.data.shift as { id: string }).id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Clock-in failed.");
    }
  }

  async function handleClockOut() {
    if (!shiftId) return;
    setError(null);
    try {
      await clockOut(shiftId);
      setShiftId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Clock-out failed.");
    }
  }

  async function handleReview(requestId: string, decision: "APPROVED" | "REJECTED") {
    setError(null);
    try {
      await reviewStockAdjustmentRequest(requestId, decision);
      await refreshRequests();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Review failed.");
    }
  }

  return (
    <main className="page-wrap py-8">
      <div className="mb-6">
        <p className="text-sm font-semibold uppercase text-[color:var(--primary)]">Branch Workspace</p>
        <h1 className="mt-1 text-3xl font-semibold text-[color:var(--secondary)]">Branch dashboard</h1>
        <p className="mt-2 max-w-2xl text-sm text-[color:var(--muted)]">
          Live sales, staffing, and approvals for the selected branch.
        </p>
      </div>

      {error && <p className="mb-4 rounded bg-red-50 p-3 text-sm text-[color:var(--danger)]">{error}</p>}

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <select
          className="field px-3 py-2"
          value={branchId}
          onChange={(e) => setBranchId(e.target.value)}
        >
          <option value="">Select branch...</option>
          {branches.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>
        {!shiftId ? (
          <button onClick={handleClockIn} disabled={!branchId} className="btn-secondary px-4 py-2">
            Clock in
          </button>
        ) : (
          <button onClick={handleClockOut} className="btn-secondary px-4 py-2">
            Clock out
          </button>
        )}
      </div>

      {branchId && (
        <>
          <div className="mb-8 grid gap-3 sm:grid-cols-3">
            <div className="stat-card">
              <div className="stat-card-label">Today&apos;s sales</div>
              <div className="stat-card-value">GHS {live?.todaySalesTotal.toFixed(2) ?? "—"}</div>
              <div className="mt-1 text-xs text-[color:var(--muted)]">{live?.todaySalesCount ?? 0} transactions</div>
            </div>
            <div className="stat-card">
              <div className="stat-card-label">Cash collected</div>
              <div className="stat-card-value">GHS {live?.cashCollectedToday.toFixed(2) ?? "—"}</div>
            </div>
            <div className="stat-card">
              <div className="stat-card-label">Staff clocked in</div>
              <div className="stat-card-value">{live?.staffClockedInCount ?? "—"}</div>
            </div>
            <div className="stat-card">
              <div className="stat-card-label">Pending approvals</div>
              <div className="stat-card-value">{live?.pendingApprovalsCount ?? "—"}</div>
            </div>
            <div className="stat-card">
              <div className="stat-card-label">Low stock products</div>
              <div className="stat-card-value">{live?.lowStockCount ?? "—"}</div>
            </div>
          </div>

          <h2 className="mb-3 font-semibold text-[color:var(--secondary)]">Pending stock adjustment approvals</h2>
          {requests.length === 0 ? (
            <p className="text-[color:var(--muted)]">Nothing pending.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {requests.map((req) => (
                <li key={req.id} className="clinical-card rounded-xl p-4">
                  <div className="font-semibold text-[color:var(--secondary)]">
                    {req.batch.product.name} — batch {req.batch.batchNumber}
                  </div>
                  <div className="text-sm text-[color:var(--muted)]">
                    {req.movementType} · {req.quantityDelta} units · requested by{" "}
                    {req.requestedBy.name}
                  </div>
                  {req.note && <div className="text-sm italic text-[color:var(--muted)]">&quot;{req.note}&quot;</div>}
                  <div className="mt-3 flex gap-2">
                    <button
                      onClick={() => handleReview(req.id, "APPROVED")}
                      className="btn-primary px-3 py-1 text-sm"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => handleReview(req.id, "REJECTED")}
                      className="btn-secondary px-3 py-1 text-sm"
                    >
                      Reject
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </main>
  );
}
