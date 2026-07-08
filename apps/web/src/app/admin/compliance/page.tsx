"use client";

import { useEffect, useState } from "react";
import {
  listBranches,
  listProducts,
  getSuspiciousActivityAlerts,
  listDrugRecalls,
  initiateDrugRecall,
  resolveDrugRecall,
  listAdverseReactionReports,
  reportAdverseReaction,
  listAuditLog,
  type Branch,
  type Product,
  type SuspiciousActivityAlert,
  type DrugRecallRow,
  type AdverseReactionReportRow,
  type AuditLogEntry,
} from "@/lib/firebase/callables";

// Phase 11 skeleton — recall initiation takes a raw batch ID (no
// batch-picker UI yet). Branch selection for alerts is manual, same
// follow-up as earlier phases.
export default function CompliancePage() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [branchId, setBranchId] = useState("");
  const [alerts, setAlerts] = useState<SuspiciousActivityAlert[]>([]);
  const [recalls, setRecalls] = useState<DrugRecallRow[]>([]);
  const [reactions, setReactions] = useState<AdverseReactionReportRow[]>([]);
  const [auditEntries, setAuditEntries] = useState<AuditLogEntry[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [recallForm, setRecallForm] = useState({ batchId: "", reason: "" });
  const [reactionForm, setReactionForm] = useState({ productId: "", reactionDescription: "" });

  useEffect(() => {
    listBranches().then((r) => setBranches(r.data.branches)).catch(() => undefined);
    listProducts().then((r) => setProducts(r.data.products)).catch(() => undefined);
    refreshRecalls();
    refreshReactions();
    refreshAuditLog();
  }, []);

  useEffect(() => {
    if (!branchId) return;
    getSuspiciousActivityAlerts(branchId)
      .then((r) => setAlerts(r.data.alerts))
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load alerts."));
  }, [branchId]);

  async function refreshRecalls() {
    try {
      const r = await listDrugRecalls();
      setRecalls(r.data.recalls);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load recalls.");
    }
  }

  async function refreshReactions() {
    try {
      const r = await listAdverseReactionReports();
      setReactions(r.data.reports);
    } catch {
      /* ignore */
    }
  }

  async function refreshAuditLog() {
    try {
      const r = await listAuditLog();
      setAuditEntries(r.data.entries);
    } catch {
      /* ignore */
    }
  }

  async function handleInitiateRecall(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    try {
      await initiateDrugRecall(recallForm.batchId, recallForm.reason);
      setRecallForm({ batchId: "", reason: "" });
      await refreshRecalls();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to initiate recall.");
    }
  }

  async function handleResolveRecall(recallId: string) {
    setError(null);
    try {
      await resolveDrugRecall(recallId);
      await refreshRecalls();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to resolve recall.");
    }
  }

  async function handleReportReaction(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    try {
      await reportAdverseReaction(reactionForm);
      setReactionForm({ productId: "", reactionDescription: "" });
      await refreshReactions();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to report reaction.");
    }
  }

  return (
    <main className="mx-auto max-w-3xl p-8">
      <h1 className="mb-6 text-2xl font-semibold">Compliance</h1>
      {error && <p className="mb-4 text-red-600">{error}</p>}

      <h2 className="mb-2 font-medium">Suspicious activity alerts</h2>
      <select
        className="mb-3 rounded border px-3 py-2"
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
      {branchId && (
        <ul className="mb-6 text-sm">
          {alerts.length === 0 ? (
            <li className="text-gray-500">No alerts.</li>
          ) : (
            alerts.map((a, i) => (
              <li key={i} className={a.severity === "CRITICAL" ? "text-red-600" : "text-orange-600"}>
                [{a.severity}] {a.description}
              </li>
            ))
          )}
        </ul>
      )}

      <h2 className="mb-2 font-medium">Drug recalls</h2>
      <form onSubmit={handleInitiateRecall} className="mb-3 flex gap-2">
        <input
          required
          placeholder="Batch ID"
          className="rounded border px-2 py-1 text-sm"
          value={recallForm.batchId}
          onChange={(e) => setRecallForm({ ...recallForm, batchId: e.target.value })}
        />
        <input
          required
          placeholder="Reason"
          className="flex-1 rounded border px-2 py-1 text-sm"
          value={recallForm.reason}
          onChange={(e) => setRecallForm({ ...recallForm, reason: e.target.value })}
        />
        <button type="submit" className="rounded bg-black px-3 py-1 text-sm text-white">
          Initiate recall
        </button>
      </form>
      <ul className="mb-6 text-sm">
        {recalls.map((r) => (
          <li key={r.id} className="mb-1 flex items-center justify-between">
            <span>
              {r.batch.product.name} (batch {r.batch.batchNumber}): {r.reason} — {r.status}
            </span>
            {r.status === "ACTIVE" && (
              <button onClick={() => handleResolveRecall(r.id)} className="rounded border px-2 py-0.5 text-xs">
                Resolve
              </button>
            )}
          </li>
        ))}
      </ul>

      <h2 className="mb-2 font-medium">Adverse reaction reports</h2>
      <form onSubmit={handleReportReaction} className="mb-3 flex flex-col gap-2">
        <select
          required
          className="rounded border px-2 py-1 text-sm"
          value={reactionForm.productId}
          onChange={(e) => setReactionForm({ ...reactionForm, productId: e.target.value })}
        >
          <option value="">Select product...</option>
          {products.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
        <textarea
          required
          placeholder="Reaction description"
          className="rounded border px-2 py-1 text-sm"
          value={reactionForm.reactionDescription}
          onChange={(e) => setReactionForm({ ...reactionForm, reactionDescription: e.target.value })}
        />
        <button type="submit" className="self-start rounded bg-black px-3 py-1 text-sm text-white">
          Report reaction
        </button>
      </form>
      <ul className="mb-6 text-sm">
        {reactions.map((r) => (
          <li key={r.id}>
            {r.product.name}: {r.reactionDescription} (reported by {r.reportedBy.name})
          </li>
        ))}
      </ul>

      <h2 className="mb-2 font-medium">Audit log (last 200 entries)</h2>
      <ul className="text-sm">
        {auditEntries.map((e) => (
          <li key={e.id}>
            {new Date(e.createdAt).toLocaleString()} — {e.action} on {e.resourceType}
            {e.user && ` by ${e.user.name}`}
            {e.branch && ` at ${e.branch.name}`}
          </li>
        ))}
      </ul>
    </main>
  );
}
