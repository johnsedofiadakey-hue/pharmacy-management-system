"use client";

import { useEffect, useState } from "react";
import {
  listBranches,
  listProducts,
  listSuppliers,
  createSupplier,
  createPurchaseOrder,
  approvePurchaseOrder,
  listPurchaseOrders,
  receiveGoods,
  getPurchaseSuggestions,
  type Branch,
  type Product,
  type Supplier,
  type PurchaseOrder,
  type PurchaseSuggestion,
} from "@/lib/firebase/callables";

// Phase 6 skeleton — receiving always uses the full ordered quantity in one
// call (no partial-receipt or per-line batch-number UI yet, though the
// Cloud Function supports both). Branch selection is manual, same follow-up
// noted in Phases 3-5.
export default function ProcurementPage() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [branchId, setBranchId] = useState("");
  const [products, setProducts] = useState<Product[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [suggestions, setSuggestions] = useState<PurchaseSuggestion[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [supplierForm, setSupplierForm] = useState({ companyName: "", phone: "" });
  const [poSupplierId, setPoSupplierId] = useState("");
  const [poProductId, setPoProductId] = useState("");
  const [poQuantity, setPoQuantity] = useState("10");
  const [poUnitCost, setPoUnitCost] = useState("0");

  useEffect(() => {
    listBranches()
      .then((r) => setBranches(r.data.branches))
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load branches."));
    listProducts()
      .then((r) => setProducts(r.data.products))
      .catch(() => undefined);
    listSuppliers()
      .then((r) => setSuppliers(r.data.suppliers))
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
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [branchId]);

  async function handleCreateSupplier(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    try {
      const result = await createSupplier(supplierForm);
      setSuppliers((prev) => [...prev, result.data.supplier]);
      setSupplierForm({ companyName: "", phone: "" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create supplier.");
    }
  }

  async function handleCreatePO(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    try {
      await createPurchaseOrder({
        branchId,
        supplierId: poSupplierId,
        items: [{ productId: poProductId, quantityOrdered: Number(poQuantity), unitCost: Number(poUnitCost) }],
      });
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create purchase order.");
    }
  }

  async function handleApprove(poId: string) {
    setError(null);
    try {
      await approvePurchaseOrder(poId);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to approve purchase order.");
    }
  }

  async function handleReceive(po: PurchaseOrder) {
    setError(null);
    try {
      await receiveGoods(
        po.id,
        po.items
          .filter((i) => i.quantityReceived < i.quantityOrdered)
          .map((i) => ({
            purchaseOrderItemId: i.id,
            batchNumber: `PO-${po.id.slice(0, 8)}`,
            receivedQuantity: i.quantityOrdered - i.quantityReceived,
          }))
      );
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to receive goods.");
    }
  }

  return (
    <main className="page-wrap py-8">
      <div className="mb-6">
        <p className="text-sm font-semibold uppercase text-[color:var(--primary)]">Branch Workspace</p>
        <h1 className="mt-1 text-3xl font-semibold text-[color:var(--secondary)]">Procurement</h1>
        <p className="mt-2 max-w-2xl text-sm text-[color:var(--muted)]">
          Manage suppliers, raise purchase orders, and receive incoming stock.
        </p>
      </div>

      {error && <p className="mb-4 rounded bg-red-50 p-3 text-sm text-[color:var(--danger)]">{error}</p>}

      <select
        className="field mb-6 px-3 py-2"
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

      <form onSubmit={handleCreateSupplier} className="clinical-card mb-6 flex flex-wrap gap-2 rounded-xl p-4">
        <h2 className="w-full font-semibold text-[color:var(--secondary)]">Add supplier</h2>
        <input
          required
          placeholder="Company name"
          className="field px-3 py-2"
          value={supplierForm.companyName}
          onChange={(e) => setSupplierForm({ ...supplierForm, companyName: e.target.value })}
        />
        <input
          placeholder="Phone"
          className="field px-3 py-2"
          value={supplierForm.phone}
          onChange={(e) => setSupplierForm({ ...supplierForm, phone: e.target.value })}
        />
        <button type="submit" className="btn-primary px-4 py-2">
          Add
        </button>
      </form>

      {branchId && (
        <>
          {suggestions.length > 0 && (
            <div className="clinical-card mb-6 rounded-xl p-4">
              <h2 className="mb-2 font-semibold text-[color:var(--secondary)]">Reorder suggestions</h2>
              <p className="mb-2 text-xs text-[color:var(--muted)]">
                Based on current stock vs. reorder level only — not full demand forecasting.
              </p>
              <ul className="text-sm">
                {suggestions.map((s) => (
                  <li key={s.productId}>
                    {s.productName}: {s.currentStock} on hand (reorder at {s.reorderLevel}) — suggest
                    ordering {s.suggestedOrderQuantity}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <form onSubmit={handleCreatePO} className="clinical-card mb-8 flex flex-col gap-3 rounded-xl p-4">
            <h2 className="font-semibold text-[color:var(--secondary)]">Create purchase order</h2>
            <select
              required
              className="field px-3 py-2"
              value={poSupplierId}
              onChange={(e) => setPoSupplierId(e.target.value)}
            >
              <option value="">Select supplier...</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.companyName}
                </option>
              ))}
            </select>
            <select
              required
              className="field px-3 py-2"
              value={poProductId}
              onChange={(e) => setPoProductId(e.target.value)}
            >
              <option value="">Select product...</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
            <input
              type="number"
              min={1}
              placeholder="Quantity"
              className="field px-3 py-2"
              value={poQuantity}
              onChange={(e) => setPoQuantity(e.target.value)}
            />
            <input
              type="number"
              min={0}
              placeholder="Unit cost"
              className="field px-3 py-2"
              value={poUnitCost}
              onChange={(e) => setPoUnitCost(e.target.value)}
            />
            <button type="submit" className="btn-primary px-4 py-2">
              Create purchase order
            </button>
          </form>

          <h2 className="mb-3 font-semibold text-[color:var(--secondary)]">Purchase orders</h2>
          {purchaseOrders.length === 0 ? (
            <p className="text-[color:var(--muted)]">None yet.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {purchaseOrders.map((po) => (
                <li key={po.id} className="clinical-card rounded-xl p-4">
                  <div className="font-semibold text-[color:var(--secondary)]">
                    {po.supplier?.companyName} <span className="status-pill status-info">{po.status}</span>
                  </div>
                  <ul className="mt-1 text-sm text-[color:var(--muted)]">
                    {po.items.map((item) => (
                      <li key={item.id}>
                        {item.product.name}: ordered {item.quantityOrdered}, received{" "}
                        {item.quantityReceived}
                      </li>
                    ))}
                  </ul>
                  <div className="mt-3 flex gap-2">
                    {po.status === "SUBMITTED" && (
                      <button onClick={() => handleApprove(po.id)} className="btn-primary px-3 py-1 text-sm">
                        Approve
                      </button>
                    )}
                    {(po.status === "APPROVED" || po.status === "PARTIALLY_RECEIVED") && (
                      <button onClick={() => handleReceive(po)} className="btn-secondary px-3 py-1 text-sm">
                        Receive goods (full remaining qty)
                      </button>
                    )}
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
