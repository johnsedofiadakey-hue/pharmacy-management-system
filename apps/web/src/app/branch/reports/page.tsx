"use client";

import { useEffect, useState } from "react";
import {
  listBranches,
  getSalesReport,
  getProfitabilityReport,
  getInventoryReport,
  getProcurementReport,
  getOperationsReport,
  getDemandForecast,
  type Branch,
  type SalesReport,
  type ProfitabilityReport,
  type InventoryReport,
  type ProcurementReport,
  type OperationsReport,
  type DemandForecast,
} from "@/lib/firebase/callables";

type ReportType = "sales" | "profitability" | "inventory" | "procurement" | "operations" | "forecast";

function daysAgo(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString();
}

// Phase 10 skeleton — branch selection manual (same follow-up as earlier
// phases). Date range defaults to the trailing 30 days for reports that take
// one.
export default function ReportsPage() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [branchId, setBranchId] = useState("");
  const [reportType, setReportType] = useState<ReportType>("sales");
  const [error, setError] = useState<string | null>(null);

  const [sales, setSales] = useState<SalesReport | null>(null);
  const [profitability, setProfitability] = useState<ProfitabilityReport | null>(null);
  const [inventory, setInventory] = useState<InventoryReport | null>(null);
  const [procurement, setProcurement] = useState<ProcurementReport | null>(null);
  const [operations, setOperations] = useState<OperationsReport | null>(null);
  const [forecast, setForecast] = useState<DemandForecast | null>(null);

  useEffect(() => {
    listBranches()
      .then((r) => setBranches(r.data.branches))
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load branches."));
  }, []);

  useEffect(() => {
    if (!branchId) return;
    setError(null);
    const start = daysAgo(30);
    const end = new Date().toISOString();

    const run = async () => {
      try {
        if (reportType === "sales") setSales((await getSalesReport(branchId, start, end)).data);
        if (reportType === "profitability")
          setProfitability((await getProfitabilityReport(branchId, start, end)).data);
        if (reportType === "inventory") setInventory((await getInventoryReport(branchId)).data);
        if (reportType === "procurement") setProcurement((await getProcurementReport(branchId)).data);
        if (reportType === "operations")
          setOperations((await getOperationsReport(branchId, start, end)).data);
        if (reportType === "forecast") setForecast((await getDemandForecast(branchId)).data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load report.");
      }
    };
    run();
  }, [branchId, reportType]);

  return (
    <main className="mx-auto max-w-3xl p-8">
      <h1 className="mb-6 text-2xl font-semibold">Reports (last 30 days)</h1>
      {error && <p className="mb-4 text-red-600">{error}</p>}

      <div className="mb-6 flex gap-3">
        <select
          className="rounded border px-3 py-2"
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
        <select
          className="rounded border px-3 py-2"
          value={reportType}
          onChange={(e) => setReportType(e.target.value as ReportType)}
        >
          <option value="sales">Sales</option>
          <option value="profitability">Profitability</option>
          <option value="inventory">Inventory</option>
          <option value="procurement">Procurement</option>
          <option value="operations">Operations</option>
          <option value="forecast">Demand forecast</option>
        </select>
      </div>

      {reportType === "sales" && sales && (
        <div className="text-sm">
          <p className="mb-2 font-medium">
            Revenue: GHS {sales.totalRevenue.toFixed(2)} ({sales.totalTransactions} transactions)
          </p>
          <p className="mb-1 font-medium">Top products</p>
          <ul className="mb-3">
            {sales.byProduct.slice(0, 5).map((p) => (
              <li key={p.productId}>
                {p.name}: GHS {p.revenue.toFixed(2)} ({p.unitsSold} units)
              </li>
            ))}
          </ul>
          <p className="mb-1 font-medium">By payment method</p>
          <ul>
            {sales.byPaymentMethod.map((p) => (
              <li key={p.method}>
                {p.method}: GHS {p.amount.toFixed(2)}
              </li>
            ))}
          </ul>
        </div>
      )}

      {reportType === "profitability" && profitability && (
        <div className="text-sm">
          <p className="mb-2 font-medium">
            Revenue GHS {profitability.totalRevenue.toFixed(2)} — Profit GHS{" "}
            {profitability.totalProfit.toFixed(2)} ({profitability.overallMarginPercent.toFixed(1)}% margin)
          </p>
          <ul>
            {profitability.byProduct.slice(0, 10).map((p) => (
              <li key={p.productId}>
                {p.name}: profit GHS {p.profit.toFixed(2)} ({p.marginPercent.toFixed(1)}%)
              </li>
            ))}
          </ul>
        </div>
      )}

      {reportType === "inventory" && inventory && (
        <div className="text-sm">
          <p className="mb-2 font-medium">Total stock value: GHS {inventory.totalStockValue.toFixed(2)}</p>
          <p className="mb-1 font-medium">Low stock ({inventory.lowStock.length})</p>
          <ul className="mb-3">
            {inventory.lowStock.map((p) => (
              <li key={p.productId}>
                {p.name}: {p.quantityOnHand} on hand
              </li>
            ))}
          </ul>
          <p className="mb-1 font-medium">Expiry risk</p>
          <ul>
            <li>Expired: GHS {inventory.expiryRisk.expired.toFixed(2)}</li>
            <li>Within 30 days: GHS {inventory.expiryRisk.within30Days.toFixed(2)}</li>
            <li>Within 90 days: GHS {inventory.expiryRisk.within90Days.toFixed(2)}</li>
          </ul>
        </div>
      )}

      {reportType === "procurement" && procurement && (
        <div className="text-sm">
          <p className="mb-1 font-medium">Supplier spend</p>
          <ul className="mb-3">
            {procurement.supplierSpend.map((s) => (
              <li key={s.supplierId}>
                {s.name}: GHS {s.total.toFixed(2)}
              </li>
            ))}
          </ul>
          <p className="mb-1 font-medium">Pending POs ({procurement.pendingPurchaseOrders.length})</p>
        </div>
      )}

      {reportType === "operations" && operations && (
        <div className="text-sm">
          <p>Total discounts: GHS {operations.totalDiscounts.toFixed(2)}</p>
          <p>
            Cash variance: GHS {operations.cashVariance.totalVariance.toFixed(2)} across{" "}
            {operations.cashVariance.totalSessions} sessions
          </p>
        </div>
      )}

      {reportType === "forecast" && forecast && (
        <ul className="text-sm">
          {forecast.forecast.slice(0, 15).map((f) => (
            <li key={f.productId}>
              {f.productName}: {f.avgDailySales}/day — {f.trend} ({f.percentChange > 0 ? "+" : ""}
              {f.percentChange}%)
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
