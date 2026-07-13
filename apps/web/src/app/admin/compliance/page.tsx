"use client";

import { useEffect, useState } from "react";
import {
  listBranches,
  listProducts,
  getSuspiciousActivityAlerts,
  listBranchStock,
  listDrugRecalls,
  initiateDrugRecall,
  resolveDrugRecall,
  listAdverseReactionReports,
  reportAdverseReaction,
  listAuditLog,
  type Branch,
  type BranchStockRow,
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
  const [recallBranchId, setRecallBranchId] = useState("");
  const [recallBatches, setRecallBatches] = useState<BranchStockRow[]>([]);
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
    if (!recallBranchId) {
      return;
    }
    listBranchStock(recallBranchId)
      .then((r) => setRecallBatches(r.data.stock))
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load branch batches."));
  }, [recallBranchId]);

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
    <main className="page-wrap py-8">
      <div className="mb-6">
        <p className="text-sm font-semibold uppercase text-[color:var(--primary)]">Super Admin</p>
        <h1 className="mt-1 text-3xl font-semibold text-[color:var(--secondary)]">Compliance</h1>
        <p className="mt-2 max-w-2xl text-sm text-[color:var(--muted)]">
          Suspicious activity, drug recalls, adverse reactions, and the audit trail in one place.
        </p>
      </div>

      {error && <p className="mb-4 rounded bg-red-50 p-3 text-sm text-[color:var(--danger)]">{error}</p>}

      <section className="clinical-card mb-6 rounded-xl p-5">
        <h2 className="mb-3 font-semibold text-[color:var(--secondary)]">Suspicious activity alerts</h2>
        <select
          className="field mb-3 px-3 py-2"
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
          <ul className="flex flex-col gap-1 text-sm">
            {alerts.length === 0 ? (
              <li className="text-[color:var(--muted)]">No alerts.</li>
            ) : (
              alerts.map((a, i) => (
                <li key={i}>
                  <span className={a.severity === "CRITICAL" ? "status-pill status-warn" : "status-pill status-info"}>
                    {a.severity}
                  </span>{" "}
                  {a.description}
                </li>
              ))
            )}
          </ul>
        )}
      </section>

      <section className="clinical-card mb-6 rounded-xl p-5">
        <h2 className="mb-3 font-semibold text-[color:var(--secondary)]">Drug recalls</h2>
        <form onSubmit={handleInitiateRecall} className="mb-4 grid gap-2 md:grid-cols-[220px_1fr_1fr_auto]">
          <select
            required
            className="field px-3 py-2 text-sm"
            value={recallBranchId}
            onChange={(e) => {
              setRecallBranchId(e.target.value);
              setRecallBatches([]);
              setRecallForm((current) => ({ ...current, batchId: "" }));
            }}
          >
            <option value="">Branch...</option>
            {branches.map((branch) => (
              <option key={branch.id} value={branch.id}>
                {branch.name}
              </option>
            ))}
          </select>
          <select
            required
            className="field px-3 py-2 text-sm"
            value={recallForm.batchId}
            onChange={(e) => setRecallForm({ ...recallForm, batchId: e.target.value })}
            disabled={!recallBranchId || recallBatches.length === 0}
          >
            <option value="">Product batch...</option>
            {recallBatches.map((stock) => (
              <option key={stock.batchId} value={stock.batchId}>
                {stock.batch.product.name} — {stock.batch.batchNumber} ({stock.quantityOnHand} on hand)
              </option>
            ))}
          </select>
          <input
            required
            placeholder="Reason"
            className="field px-3 py-2 text-sm"
            value={recallForm.reason}
            onChange={(e) => setRecallForm({ ...recallForm, reason: e.target.value })}
          />
          <button type="submit" className="btn-primary px-4 py-2 text-sm">
            Initiate recall
          </button>
        </form>
        <ul className="flex flex-col gap-2 text-sm">
          {recalls.map((r) => (
            <li key={r.id} className="flex items-center justify-between gap-3 border-b border-[color:var(--border)] pb-2 last:border-0">
              <span>
                {r.batch.product.name} (batch {r.batch.batchNumber}): {r.reason} — {r.status}
              </span>
              {r.status === "ACTIVE" && (
                <button onClick={() => handleResolveRecall(r.id)} className="btn-secondary shrink-0 px-3 py-1 text-xs">
                  Resolve
                </button>
              )}
            </li>
          ))}
        </ul>
      </section>

      <section className="clinical-card mb-6 rounded-xl p-5">
        <h2 className="mb-3 font-semibold text-[color:var(--secondary)]">Adverse reaction reports</h2>
        <form onSubmit={handleReportReaction} className="mb-4 flex flex-col gap-2">
          <select
            required
            className="field px-3 py-2 text-sm"
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
            className="field px-3 py-2 text-sm"
            value={reactionForm.reactionDescription}
            onChange={(e) => setReactionForm({ ...reactionForm, reactionDescription: e.target.value })}
          />
          <button type="submit" className="btn-primary self-start px-4 py-2 text-sm">
            Report reaction
          </button>
        </form>
        <ul className="flex flex-col gap-1 text-sm">
          {reactions.map((r) => (
            <li key={r.id}>
              {r.product.name}: {r.reactionDescription} (reported by {r.reportedBy.name})
            </li>
          ))}
        </ul>
      </section>

      <section className="clinical-card rounded-xl p-5">
        <h2 className="mb-3 font-semibold text-[color:var(--secondary)]">Audit log (last 200 entries)</h2>
        <ul className="flex flex-col gap-1 text-sm text-[color:var(--muted)]">
          {auditEntries.map((e) => (
            <li key={e.id}>
              {new Date(e.createdAt).toLocaleString()} — {e.action} on {e.resourceType}
              {e.user && ` by ${e.user.name}`}
              {e.branch && ` at ${e.branch.name}`}
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
