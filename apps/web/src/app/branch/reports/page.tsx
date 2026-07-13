"use client";

import { useEffect, useState } from "react";
import {
  getSalesReport,
  getProfitabilityReport,
  getInventoryReport,
  getProcurementReport,
  getOperationsReport,
  getDemandForecast,
  type SalesReport,
  type ProfitabilityReport,
  type InventoryReport,
  type ProcurementReport,
  type OperationsReport,
  type DemandForecast,
} from "@/lib/firebase/callables";
import { useBranchWorkspace } from "@/components/branch/BranchWorkspaceContext";

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
  const { branchId, selectedBranch } = useBranchWorkspace();
  const [reportType, setReportType] = useState<ReportType>("sales");
  const [error, setError] = useState<string | null>(null);

  const [sales, setSales] = useState<SalesReport | null>(null);
  const [profitability, setProfitability] = useState<ProfitabilityReport | null>(null);
  const [inventory, setInventory] = useState<InventoryReport | null>(null);
  const [procurement, setProcurement] = useState<ProcurementReport | null>(null);
  const [operations, setOperations] = useState<OperationsReport | null>(null);
  const [forecast, setForecast] = useState<DemandForecast | null>(null);

  useEffect(() => {
    if (!branchId) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
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
    <main className="page-wrap py-8">
      <div className="mb-6">
        <p className="text-sm font-semibold uppercase text-[color:var(--primary)]">Branch Workspace</p>
        <h1 className="mt-1 text-3xl font-semibold text-[color:var(--secondary)]">Reports</h1>
        <p className="mt-2 max-w-2xl text-sm text-[color:var(--muted)]">
          Trailing 30-day operational reports for {selectedBranch?.name ?? "the active branch"}.
        </p>
      </div>

      {error && <p className="mb-4 rounded bg-red-50 p-3 text-sm text-[color:var(--danger)]">{error}</p>}

      <div className="mb-6 flex flex-wrap gap-3">
        <select
          className="field px-3 py-2"
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
        <div className="clinical-card rounded-xl p-5 text-sm">
          <p className="mb-3 font-semibold text-[color:var(--secondary)]">
            Revenue: GHS {sales.totalRevenue.toFixed(2)} ({sales.totalTransactions} transactions)
          </p>
          <p className="mb-1 font-medium text-[color:var(--secondary)]">Top products</p>
          <ul className="mb-3 text-[color:var(--muted)]">
            {sales.byProduct.slice(0, 5).map((p) => (
              <li key={p.productId}>
                {p.name}: GHS {p.revenue.toFixed(2)} ({p.unitsSold} units)
              </li>
            ))}
          </ul>
          <p className="mb-1 font-medium text-[color:var(--secondary)]">By payment method</p>
          <ul className="text-[color:var(--muted)]">
            {sales.byPaymentMethod.map((p) => (
              <li key={p.method}>
                {p.method}: GHS {p.amount.toFixed(2)}
              </li>
            ))}
          </ul>
        </div>
      )}

      {reportType === "profitability" && profitability && (
        <div className="clinical-card rounded-xl p-5 text-sm">
          <p className="mb-3 font-semibold text-[color:var(--secondary)]">
            Revenue GHS {profitability.totalRevenue.toFixed(2)} — Profit GHS{" "}
            {profitability.totalProfit.toFixed(2)} ({profitability.overallMarginPercent.toFixed(1)}% margin)
          </p>
          <ul className="text-[color:var(--muted)]">
            {profitability.byProduct.slice(0, 10).map((p) => (
              <li key={p.productId}>
                {p.name}: profit GHS {p.profit.toFixed(2)} ({p.marginPercent.toFixed(1)}%)
              </li>
            ))}
          </ul>
        </div>
      )}

      {reportType === "inventory" && inventory && (
        <div className="clinical-card rounded-xl p-5 text-sm">
          <p className="mb-3 font-semibold text-[color:var(--secondary)]">
            Total stock value: GHS {inventory.totalStockValue.toFixed(2)}
          </p>
          <p className="mb-1 font-medium text-[color:var(--secondary)]">Low stock ({inventory.lowStock.length})</p>
          <ul className="mb-3 text-[color:var(--muted)]">
            {inventory.lowStock.map((p) => (
              <li key={p.productId}>
                {p.name}: {p.quantityOnHand} on hand
              </li>
            ))}
          </ul>
          <p className="mb-1 font-medium text-[color:var(--secondary)]">Expiry risk</p>
          <ul className="text-[color:var(--muted)]">
            <li>Expired: GHS {inventory.expiryRisk.expired.toFixed(2)}</li>
            <li>Within 30 days: GHS {inventory.expiryRisk.within30Days.toFixed(2)}</li>
            <li>Within 90 days: GHS {inventory.expiryRisk.within90Days.toFixed(2)}</li>
          </ul>
        </div>
      )}

      {reportType === "procurement" && procurement && (
        <div className="clinical-card rounded-xl p-5 text-sm">
          <p className="mb-1 font-medium text-[color:var(--secondary)]">Supplier spend</p>
          <ul className="mb-3 text-[color:var(--muted)]">
            {procurement.supplierSpend.map((s) => (
              <li key={s.supplierId}>
                {s.name}: GHS {s.total.toFixed(2)}
              </li>
            ))}
          </ul>
          <p className="font-medium text-[color:var(--secondary)]">
            Pending POs ({procurement.pendingPurchaseOrders.length})
          </p>
        </div>
      )}

      {reportType === "operations" && operations && (
        <div className="clinical-card rounded-xl p-5 text-sm text-[color:var(--muted)]">
          <p>Total discounts: GHS {operations.totalDiscounts.toFixed(2)}</p>
          <p>
            Cash variance: GHS {operations.cashVariance.totalVariance.toFixed(2)} across{" "}
            {operations.cashVariance.totalSessions} sessions
          </p>
        </div>
      )}

      {reportType === "forecast" && forecast && (
        <div className="clinical-card rounded-xl p-5">
          <ul className="text-sm text-[color:var(--muted)]">
            {forecast.forecast.slice(0, 15).map((f) => (
              <li key={f.productId}>
                {f.productName}: {f.avgDailySales}/day — {f.trend} ({f.percentChange > 0 ? "+" : ""}
                {f.percentChange}%)
              </li>
            ))}
          </ul>
        </div>
      )}
    </main>
  );
}
