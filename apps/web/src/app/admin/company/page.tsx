"use client";

import { useEffect, useState } from "react";
import {
  getCompanyDashboard,
  getBranchBenchmarking,
  type CompanyDashboard,
  type BranchBenchmarking,
} from "@/lib/firebase/callables";

// Super Admin command centre — computed on demand (not a live Firestore
// projection like the branch dashboard, see getCompanyDashboard.ts for why).
export default function CompanyDashboardPage() {
  const [data, setData] = useState<CompanyDashboard | null>(null);
  const [benchmarking, setBenchmarking] = useState<BranchBenchmarking | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getCompanyDashboard()
      .then((r) => setData(r.data))
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load dashboard."));
    getBranchBenchmarking()
      .then((r) => setBenchmarking(r.data))
      .catch(() => undefined);
  }, []);

  return (
    <main className="mx-auto max-w-3xl p-8">
      <h1 className="mb-6 text-2xl font-semibold">Company Dashboard</h1>
      {error && <p className="mb-4 text-red-600">{error}</p>}

      {data && (
        <>
          <div className="mb-6 grid grid-cols-3 gap-3">
            <div className="rounded border p-3">
              <div className="text-xs text-gray-500">Total sales today</div>
              <div className="text-lg font-semibold">GHS {data.totalSalesToday.toFixed(2)}</div>
            </div>
            <div className="rounded border p-3">
              <div className="text-xs text-gray-500">Transactions today</div>
              <div className="text-lg font-semibold">{data.totalTransactionsToday}</div>
            </div>
            <div className="rounded border p-3">
              <div className="text-xs text-gray-500">Active branches</div>
              <div className="text-lg font-semibold">{data.activeBranchesCount}</div>
            </div>
          </div>

          <h2 className="mb-3 font-medium">Branch breakdown</h2>
          <table className="mb-6 w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500">
                <th className="pb-2">Branch</th>
                <th className="pb-2">Sales</th>
                <th className="pb-2">Transactions</th>
              </tr>
            </thead>
            <tbody>
              {data.branchBreakdown.map((b) => (
                <tr key={b.branchId} className="border-t">
                  <td className="py-2">{b.name}</td>
                  <td className="py-2">GHS {b.salesToday.toFixed(2)}</td>
                  <td className="py-2">{b.transactionsToday}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <h2 className="mb-3 font-medium">Expiry risk (stock value)</h2>
          <div className="grid grid-cols-4 gap-3">
            <div className="rounded border p-3">
              <div className="text-xs text-gray-500">Expired</div>
              <div className="font-semibold text-red-600">GHS {data.expiryRisk.expired.toFixed(2)}</div>
            </div>
            <div className="rounded border p-3">
              <div className="text-xs text-gray-500">Within 30 days</div>
              <div className="font-semibold">GHS {data.expiryRisk.within30Days.toFixed(2)}</div>
            </div>
            <div className="rounded border p-3">
              <div className="text-xs text-gray-500">Within 90 days</div>
              <div className="font-semibold">GHS {data.expiryRisk.within90Days.toFixed(2)}</div>
            </div>
            <div className="rounded border p-3">
              <div className="text-xs text-gray-500">Within 180 days</div>
              <div className="font-semibold">GHS {data.expiryRisk.within180Days.toFixed(2)}</div>
            </div>
          </div>

          {benchmarking && (
            <>
              <h2 className="mb-3 mt-6 font-medium">
                Branch benchmarking (last {benchmarking.windowDays} days)
              </h2>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-500">
                    <th className="pb-2">Branch</th>
                    <th className="pb-2">Sales</th>
                    <th className="pb-2">Margin</th>
                    <th className="pb-2">Stock loss</th>
                    <th className="pb-2">Expiry loss</th>
                  </tr>
                </thead>
                <tbody>
                  {benchmarking.benchmarking.map((b) => (
                    <tr key={b.branchId} className="border-t">
                      <td className="py-2">{b.branchName}</td>
                      <td className="py-2">GHS {b.sales.toFixed(2)}</td>
                      <td className="py-2">{b.grossMarginPercent.toFixed(1)}%</td>
                      <td className="py-2">GHS {b.stockLossValue.toFixed(2)}</td>
                      <td className="py-2">GHS {b.expiryLossValue.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
        </>
      )}
    </main>
  );
}
