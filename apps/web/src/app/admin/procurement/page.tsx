"use client";

import { useEffect, useState } from "react";
import {
  approvePurchaseOrder,
  getPurchaseSuggestions,
  listBranches,
  listPurchaseOrders,
  listSuppliers,
  type Branch,
  type PurchaseOrder,
  type PurchaseSuggestion,
  type Supplier,
} from "@/lib/firebase/callables";
import { Alert, Badge, Button, Select, Stat } from "@/components/ui";

export default function AdminProcurementPage() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [branchId, setBranchId] = useState("");
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [suggestions, setSuggestions] = useState<PurchaseSuggestion[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listBranches()
      .then((result) => {
        setBranches(result.data.branches);
        setBranchId(result.data.branches[0]?.id ?? "");
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load branches."));
    listSuppliers()
      .then((result) => setSuppliers(result.data.suppliers))
      .catch(() => undefined);
  }, []);

  async function refresh() {
    if (!branchId) return;
    try {
      const [poResult, suggestionResult] = await Promise.all([
        listPurchaseOrders(branchId),
        getPurchaseSuggestions(branchId),
      ]);
      setPurchaseOrders(poResult.data.purchaseOrders);
      setSuggestions(suggestionResult.data.suggestions);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load procurement data.");
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [branchId]);

  async function approve(poId: string) {
    setError(null);
    try {
      await approvePurchaseOrder(poId);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to approve purchase order.");
    }
  }

  const pendingCount = purchaseOrders.filter((po) => po.status === "SUBMITTED").length;

  return (
    <main className="page-wrap py-8">
      <div className="mb-6">
        <p className="text-sm font-semibold uppercase text-[color:var(--primary)]">Super Admin</p>
        <h1 className="mt-1 text-3xl font-semibold text-[color:var(--secondary)]">Procurement oversight</h1>
        <p className="mt-2 max-w-2xl text-sm text-[color:var(--muted)]">
          Review supplier coverage, purchase orders, and reorder pressure across branches.
        </p>
      </div>

      {error && <Alert tone="error" className="mb-4">{error}</Alert>}

      <div className="mb-6 flex flex-wrap gap-3">
        <Select value={branchId} onChange={(e) => setBranchId(e.target.value)} className="w-72">
          <option value="">Select branch...</option>
          {branches.map((branch) => (
            <option key={branch.id} value={branch.id}>
              {branch.name}
            </option>
          ))}
        </Select>
        <Button variant="secondary" onClick={refresh} disabled={!branchId}>
          Refresh
        </Button>
      </div>

      <div className="mb-8 grid gap-3 md:grid-cols-3">
        <Stat label="Suppliers" value={suppliers.length} />
        <Stat label="Purchase orders" value={purchaseOrders.length} />
        <Stat label="Pending approval" value={pendingCount} />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <section className="clinical-card rounded-xl p-5">
          <h2 className="mb-3 font-semibold text-[color:var(--secondary)]">Purchase orders</h2>
          {purchaseOrders.length === 0 ? (
            <p className="text-sm text-[color:var(--muted)]">No purchase orders for this branch.</p>
          ) : (
            <ul className="space-y-3">
              {purchaseOrders.map((po) => (
                <li key={po.id} className="rounded-xl border border-[color:var(--border)] p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="font-semibold text-[color:var(--secondary)]">
                        {po.supplier?.companyName ?? "Supplier"}
                      </div>
                      <div className="text-sm text-[color:var(--muted)]">
                        {po.items.length} line item{po.items.length === 1 ? "" : "s"} ·{" "}
                        {new Date(po.createdAt).toLocaleString()}
                      </div>
                    </div>
                    <Badge tone={po.status === "SUBMITTED" ? "warn" : po.status === "RECEIVED" ? "safe" : "info"}>
                      {po.status}
                    </Badge>
                  </div>
                  <ul className="mt-3 text-sm text-[color:var(--muted)]">
                    {po.items.map((item) => (
                      <li key={item.id}>
                        {item.product.name}: ordered {item.quantityOrdered}, received {item.quantityReceived}
                      </li>
                    ))}
                  </ul>
                  {po.status === "SUBMITTED" && (
                    <button type="button" onClick={() => approve(po.id)} className="btn-primary mt-3 px-3 py-1.5 text-sm">
                      Approve PO
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="clinical-card rounded-xl p-5">
          <h2 className="mb-3 font-semibold text-[color:var(--secondary)]">Reorder pressure</h2>
          {suggestions.length === 0 ? (
            <p className="text-sm text-[color:var(--muted)]">No reorder suggestions.</p>
          ) : (
            <ul className="space-y-2 text-sm text-[color:var(--muted)]">
              {suggestions.slice(0, 12).map((suggestion) => (
                <li key={suggestion.productId} className="rounded-lg bg-[color:var(--surface-muted)] p-3">
                  <div className="font-medium text-[color:var(--secondary)]">{suggestion.productName}</div>
                  <div>
                    {suggestion.currentStock} on hand · reorder at {suggestion.reorderLevel} · suggest{" "}
                    {suggestion.suggestedOrderQuantity}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}
