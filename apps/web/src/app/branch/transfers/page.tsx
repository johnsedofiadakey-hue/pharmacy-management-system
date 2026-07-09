"use client";

import { useEffect, useState } from "react";
import {
  listBranches,
  listBranchStock,
  requestTransfer,
  approveTransfer,
  rejectTransfer,
  cancelTransfer,
  dispatchTransfer,
  receiveTransfer,
  listTransfers,
  type Branch,
  type BranchStockRow,
  type Transfer,
} from "@/lib/firebase/callables";

// Phase 5 skeleton — dispatch/receive always use the full requested/sent
// quantity (no partial-quantity UI yet, though the Cloud Functions support
// it). Branch selection is manual, same follow-up as Phases 3/4.
export default function TransfersPage() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [branchId, setBranchId] = useState("");
  const [sourceBranchId, setSourceBranchId] = useState("");
  const [sourceStock, setSourceStock] = useState<BranchStockRow[]>([]);
  const [selectedStockId, setSelectedStockId] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    listBranches()
      .then((r) => setBranches(r.data.branches))
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load branches."));
  }, []);

  async function refreshTransfers() {
    if (!branchId) return;
    try {
      const result = await listTransfers(branchId);
      setTransfers(result.data.transfers);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load transfers.");
    }
  }

  useEffect(() => {
    refreshTransfers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [branchId]);

  useEffect(() => {
    if (!sourceBranchId) {
      setSourceStock([]);
      return;
    }
    listBranchStock(sourceBranchId)
      .then((r) => setSourceStock(r.data.stock))
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load source stock."));
  }, [sourceBranchId]);

  async function handleRequest(event: React.FormEvent) {
    event.preventDefault();
    const stockRow = sourceStock.find((s) => s.id === selectedStockId);
    if (!stockRow) return;
    setBusy(true);
    setError(null);
    try {
      await requestTransfer({
        fromBranchId: sourceBranchId,
        toBranchId: branchId,
        items: [
          {
            productId: stockRow.productId,
            batchId: stockRow.batchId,
            quantityRequested: Number(quantity),
          },
        ],
      });
      setSelectedStockId("");
      setQuantity("1");
      await refreshTransfers();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Transfer request failed.");
    } finally {
      setBusy(false);
    }
  }

  async function handleAction(transfer: Transfer, action: string) {
    setBusy(true);
    setError(null);
    try {
      if (action === "approve") await approveTransfer(transfer.id);
      if (action === "reject") await rejectTransfer(transfer.id);
      if (action === "cancel") await cancelTransfer(transfer.id);
      if (action === "dispatch")
        await dispatchTransfer(
          transfer.id,
          transfer.items.map((i) => ({ transferItemId: i.id, quantitySent: i.quantityRequested }))
        );
      if (action === "receive")
        await receiveTransfer(
          transfer.id,
          transfer.items.map((i) => ({ transferItemId: i.id, quantityReceived: i.quantitySent ?? 0 }))
        );
      await refreshTransfers();
    } catch (err) {
      setError(err instanceof Error ? err.message : `${action} failed.`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="page-wrap py-8">
      <div className="mb-6">
        <p className="text-sm font-semibold uppercase text-[color:var(--primary)]">Branch Workspace</p>
        <h1 className="mt-1 text-3xl font-semibold text-[color:var(--secondary)]">Transfers</h1>
        <p className="mt-2 max-w-2xl text-sm text-[color:var(--muted)]">
          Request stock from other branches and track transfers in flight.
        </p>
      </div>

      {error && <p className="mb-4 rounded bg-red-50 p-3 text-sm text-[color:var(--danger)]">{error}</p>}

      <select
        className="field mb-6 px-3 py-2"
        value={branchId}
        onChange={(e) => setBranchId(e.target.value)}
      >
        <option value="">Acting as branch...</option>
        {branches.map((b) => (
          <option key={b.id} value={b.id}>
            {b.name}
          </option>
        ))}
      </select>

      {branchId && (
        <>
          <form onSubmit={handleRequest} className="clinical-card mb-8 flex flex-col gap-3 rounded-xl p-4">
            <h2 className="font-semibold text-[color:var(--secondary)]">Request transfer from another branch</h2>
            <select
              className="field px-3 py-2"
              value={sourceBranchId}
              onChange={(e) => setSourceBranchId(e.target.value)}
            >
              <option value="">Source branch...</option>
              {branches.filter((b) => b.id !== branchId).map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
            <select
              className="field px-3 py-2"
              value={selectedStockId}
              onChange={(e) => setSelectedStockId(e.target.value)}
              disabled={!sourceBranchId}
            >
              <option value="">Select product/batch...</option>
              {sourceStock.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.batch.product.name} — batch {s.batch.batchNumber} ({s.quantityOnHand} available)
                </option>
              ))}
            </select>
            <input
              type="number"
              min={1}
              className="field px-3 py-2"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
            />
            <button
              type="submit"
              disabled={!selectedStockId || busy}
              className="btn-primary px-4 py-2 disabled:opacity-50"
            >
              Request transfer
            </button>
          </form>

          <h2 className="mb-3 font-semibold text-[color:var(--secondary)]">Transfers involving this branch</h2>
          {transfers.length === 0 ? (
            <p className="text-[color:var(--muted)]">No transfers yet.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {transfers.map((t) => {
                const isSource = t.fromBranchId === branchId;
                const isDest = t.toBranchId === branchId;
                return (
                  <li key={t.id} className="clinical-card rounded-xl p-4">
                    <div className="font-semibold text-[color:var(--secondary)]">
                      {t.fromBranch?.name} → {t.toBranch?.name}{" "}
                      <span className="status-pill status-info">{t.status}</span>
                    </div>
                    <ul className="mt-1 text-sm text-[color:var(--muted)]">
                      {t.items.map((item) => (
                        <li key={item.id}>
                          {item.batch?.product.name} — requested {item.quantityRequested}
                          {item.quantitySent !== null && `, sent ${item.quantitySent}`}
                          {item.quantityReceived !== null && `, received ${item.quantityReceived}`}
                        </li>
                      ))}
                    </ul>
                    <div className="mt-3 flex gap-2">
                      {isSource && t.status === "REQUESTED" && (
                        <>
                          <button onClick={() => handleAction(t, "approve")} className="btn-primary px-3 py-1 text-sm">
                            Approve
                          </button>
                          <button onClick={() => handleAction(t, "reject")} className="btn-secondary px-3 py-1 text-sm">
                            Reject
                          </button>
                        </>
                      )}
                      {isSource && t.status === "APPROVED" && (
                        <button onClick={() => handleAction(t, "dispatch")} className="btn-primary px-3 py-1 text-sm">
                          Dispatch
                        </button>
                      )}
                      {isDest && t.status === "IN_TRANSIT" && (
                        <button onClick={() => handleAction(t, "receive")} className="btn-primary px-3 py-1 text-sm">
                          Receive
                        </button>
                      )}
                      {isDest && (t.status === "REQUESTED" || t.status === "APPROVED") && (
                        <button onClick={() => handleAction(t, "cancel")} className="btn-secondary px-3 py-1 text-sm">
                          Cancel
                        </button>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </>
      )}
    </main>
  );
}
