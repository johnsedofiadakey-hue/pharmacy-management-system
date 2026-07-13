"use client";

import { useEffect, useState } from "react";
import {
  listBranches,
  listBranchStock,
  listProducts,
  receiveStock,
  type Branch,
  type BranchStockRow,
  type Product,
} from "@/lib/firebase/callables";
import { Alert, Badge, Button, EmptyState } from "@/components/ui";

function isoDate(value: string): string | undefined {
  return value ? new Date(`${value}T00:00:00.000Z`).toISOString() : undefined;
}

export default function AdminInventoryPage() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [stock, setStock] = useState<BranchStockRow[]>([]);
  const [selectedBranchId, setSelectedBranchId] = useState("");
  const [form, setForm] = useState({
    branchId: "",
    productId: "",
    batchNumber: "",
    quantity: "",
    expiryDate: "",
    manufacturingDate: "",
    costPriceAtReceipt: "",
  });
  const [receiving, setReceiving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function refreshStock(branchId: string) {
    if (!branchId) {
      setStock([]);
      return;
    }
    try {
      const result = await listBranchStock(branchId);
      setStock(result.data.stock);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load branch stock.");
    }
  }

  useEffect(() => {
    async function load() {
      try {
        const [branchResult, productResult] = await Promise.all([listBranches(), listProducts()]);
        setBranches(branchResult.data.branches);
        setProducts(productResult.data.products);
        const firstBranch = branchResult.data.branches[0]?.id ?? "";
        const firstProduct = productResult.data.products[0]?.id ?? "";
        setSelectedBranchId(firstBranch);
        setForm((current) => ({ ...current, branchId: firstBranch, productId: firstProduct }));
        await refreshStock(firstBranch);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load inventory data.");
      }
    }
    void load();
  }, []);

  async function handleReceive(event: React.FormEvent) {
    event.preventDefault();
    setReceiving(true);
    setError(null);
    setMessage(null);
    try {
      await receiveStock({
        branchId: form.branchId,
        productId: form.productId,
        batchNumber: form.batchNumber,
        quantity: Number(form.quantity),
        expiryDate: isoDate(form.expiryDate),
        manufacturingDate: isoDate(form.manufacturingDate),
        costPriceAtReceipt: form.costPriceAtReceipt ? Number(form.costPriceAtReceipt) : undefined,
      });
      setMessage("Stock received and ledger movement recorded.");
      setSelectedBranchId(form.branchId);
      setForm((current) => ({
        ...current,
        batchNumber: "",
        quantity: "",
        expiryDate: "",
        manufacturingDate: "",
        costPriceAtReceipt: "",
      }));
      await refreshStock(form.branchId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to receive stock.");
    } finally {
      setReceiving(false);
    }
  }

  return (
    <main className="page-wrap py-8">
      <div className="mb-6">
        <p className="text-sm font-semibold uppercase text-[color:var(--primary)]">Super Admin</p>
        <h1 className="mt-1 text-3xl font-semibold text-[color:var(--secondary)]">Inventory receiving</h1>
        <p className="mt-2 max-w-2xl text-sm text-[color:var(--muted)]">
          Receive stock into branch batches with expiry dates and cost captured in the immutable stock ledger.
        </p>
      </div>

      {error && <Alert tone="error" className="mb-4">{error}</Alert>}
      {message && <Alert tone="success" className="mb-4">{message}</Alert>}

      <form onSubmit={handleReceive} className="clinical-card mb-8 grid gap-3 rounded-xl p-5 md:grid-cols-3">
        <h2 className="font-semibold text-[color:var(--secondary)] md:col-span-3">Receive stock</h2>
        <select
          required
          className="field px-3 py-2"
          value={form.branchId}
          onChange={(e) => setForm({ ...form, branchId: e.target.value })}
        >
          <option value="">Select branch...</option>
          {branches.map((branch) => (
            <option key={branch.id} value={branch.id}>
              {branch.name}
            </option>
          ))}
        </select>
        <select
          required
          className="field px-3 py-2"
          value={form.productId}
          onChange={(e) => setForm({ ...form, productId: e.target.value })}
        >
          <option value="">Select product...</option>
          {products.map((product) => (
            <option key={product.id} value={product.id}>
              {product.name}
            </option>
          ))}
        </select>
        <input
          required
          className="field px-3 py-2"
          placeholder="Batch number"
          value={form.batchNumber}
          onChange={(e) => setForm({ ...form, batchNumber: e.target.value })}
        />
        <input
          required
          type="number"
          min={1}
          className="field px-3 py-2"
          placeholder="Quantity received"
          value={form.quantity}
          onChange={(e) => setForm({ ...form, quantity: e.target.value })}
        />
        <input
          type="date"
          className="field px-3 py-2"
          value={form.expiryDate}
          onChange={(e) => setForm({ ...form, expiryDate: e.target.value })}
        />
        <input
          type="date"
          className="field px-3 py-2"
          value={form.manufacturingDate}
          onChange={(e) => setForm({ ...form, manufacturingDate: e.target.value })}
        />
        <input
          type="number"
          min={0}
          step="0.01"
          className="field px-3 py-2"
          placeholder="Cost at receipt"
          value={form.costPriceAtReceipt}
          onChange={(e) => setForm({ ...form, costPriceAtReceipt: e.target.value })}
        />
        <Button type="submit" disabled={receiving || !form.branchId || !form.productId} className="md:col-span-2">
          {receiving ? "Receiving..." : "Receive stock"}
        </Button>
      </form>

      <section className="clinical-card rounded-xl p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-semibold text-[color:var(--secondary)]">Branch stock</h2>
          <div className="flex items-center gap-2">
            <select
              className="field px-3 py-2 text-sm"
              value={selectedBranchId}
              onChange={(e) => {
                setSelectedBranchId(e.target.value);
                void refreshStock(e.target.value);
              }}
            >
              {branches.map((branch) => (
                <option key={branch.id} value={branch.id}>
                  {branch.name}
                </option>
              ))}
            </select>
            <Badge tone="info">{stock.length} batches</Badge>
          </div>
        </div>

        {stock.length === 0 ? (
          <EmptyState title="No stock for this branch yet" hint="Receive stock above or select another branch." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="border-b border-[color:var(--border)] text-left text-[color:var(--muted)]">
                  <th className="px-3 py-2 font-medium">Product</th>
                  <th className="px-3 py-2 font-medium">Batch</th>
                  <th className="px-3 py-2 font-medium">Expiry</th>
                  <th className="px-3 py-2 font-medium">On hand</th>
                </tr>
              </thead>
              <tbody>
                {stock.map((row) => (
                  <tr key={row.id} className="border-b border-[color:var(--border)] last:border-0">
                    <td className="px-3 py-3 font-medium text-[color:var(--secondary)]">{row.batch.product.name}</td>
                    <td className="px-3 py-3">{row.batch.batchNumber}</td>
                    <td className="px-3 py-3">
                      {row.batch.expiryDate ? new Date(row.batch.expiryDate).toLocaleDateString() : "Not set"}
                    </td>
                    <td className="px-3 py-3 font-semibold tabular-nums">{row.quantityOnHand}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
