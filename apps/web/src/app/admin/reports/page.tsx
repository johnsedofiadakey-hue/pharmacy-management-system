"use client";

import { useEffect, useState } from "react";
import {
  getInventoryReport,
  getOperationsReport,
  getSalesReport,
  listBranches,
  type Branch,
  type InventoryReport,
  type OperationsReport,
  type SalesReport,
} from "@/lib/firebase/callables";
import { Alert, Button, Select, Stat } from "@/components/ui";

function daysAgo(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString();
}

export default function AdminReportsPage() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [branchId, setBranchId] = useState("");
  const [sales, setSales] = useState<SalesReport | null>(null);
  const [inventory, setInventory] = useState<InventoryReport | null>(null);
  const [operations, setOperations] = useState<OperationsReport | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listBranches()
      .then((result) => {
        setBranches(result.data.branches);
        setBranchId(result.data.branches[0]?.id ?? "");
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load branches."));
  }, []);

  async function refresh() {
    if (!branchId) return;
    setError(null);
    const start = daysAgo(30);
    const end = new Date().toISOString();
    try {
      const [salesResult, inventoryResult, operationsResult] = await Promise.all([
        getSalesReport(branchId, start, end),
        getInventoryReport(branchId),
        getOperationsReport(branchId, start, end),
      ]);
      setSales(salesResult.data);
      setInventory(inventoryResult.data);
      setOperations(operationsResult.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load reports.");
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [branchId]);

  return (
    <main className="page-wrap py-8">
      <div className="mb-6">
        <p className="text-sm font-semibold uppercase text-[color:var(--primary)]">Super Admin</p>
        <h1 className="mt-1 text-3xl font-semibold text-[color:var(--secondary)]">Reports</h1>
        <p className="mt-2 max-w-2xl text-sm text-[color:var(--muted)]">
          Branch-level performance, inventory risk, and operational controls for the last 30 days.
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
        <Stat label="Revenue" value={sales ? `GHS ${sales.totalRevenue.toFixed(2)}` : "—"} />
        <Stat label="Transactions" value={sales?.totalTransactions ?? "—"} />
        <Stat label="Stock value" value={inventory ? `GHS ${inventory.totalStockValue.toFixed(2)}` : "—"} />
        <Stat label="Low-stock products" value={inventory?.lowStock.length ?? "—"} />
        <Stat label="Expired stock value" value={inventory ? `GHS ${inventory.expiryRisk.expired.toFixed(2)}` : "—"} />
        <Stat label="Cash variance" value={operations ? `GHS ${operations.cashVariance.totalVariance.toFixed(2)}` : "—"} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="clinical-card rounded-xl p-5">
          <h2 className="mb-3 font-semibold text-[color:var(--secondary)]">Top products</h2>
          <ul className="space-y-2 text-sm text-[color:var(--muted)]">
            {sales?.byProduct.slice(0, 8).map((product) => (
              <li key={product.productId} className="flex justify-between gap-3">
                <span>{product.name}</span>
                <span className="tabular-nums">GHS {product.revenue.toFixed(2)}</span>
              </li>
            )) ?? <li>No sales data loaded.</li>}
          </ul>
        </section>

        <section className="clinical-card rounded-xl p-5">
          <h2 className="mb-3 font-semibold text-[color:var(--secondary)]">Low stock</h2>
          <ul className="space-y-2 text-sm text-[color:var(--muted)]">
            {inventory?.lowStock.slice(0, 8).map((product) => (
              <li key={product.productId} className="flex justify-between gap-3">
                <span>{product.name}</span>
                <span className="tabular-nums">{product.quantityOnHand} on hand</span>
              </li>
            )) ?? <li>No inventory data loaded.</li>}
          </ul>
        </section>
      </div>
    </main>
  );
}
