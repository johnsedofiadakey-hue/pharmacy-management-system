"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  listBranches,
  getCompanyDashboard,
  getBranchBenchmarking,
  type Branch,
  type CompanyDashboard,
  type BranchBenchmarking,
} from "@/lib/firebase/callables";
import { Badge } from "@/components/ui";

// Super Admin command centre — computed on demand (not a live Firestore
// projection like the branch dashboard, see getCompanyDashboard.ts for why).
export default function CompanyDashboardPage() {
  const [data, setData] = useState<CompanyDashboard | null>(null);
  const [benchmarking, setBenchmarking] = useState<BranchBenchmarking | null>(null);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listBranches()
      .then((r) => setBranches(r.data.branches))
      .catch(() => undefined);
    getCompanyDashboard()
      .then((r) => setData(r.data))
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load dashboard."));
    getBranchBenchmarking()
      .then((r) => setBenchmarking(r.data))
      .catch(() => undefined);
  }, []);

  return (
    <main className="page-wrap py-8">
      <div className="mb-6">
        <p className="text-sm font-semibold uppercase text-[color:var(--primary)]">Super Admin</p>
        <h1 className="mt-1 text-3xl font-semibold text-[color:var(--secondary)]">Company dashboard</h1>
        <p className="mt-2 max-w-2xl text-sm text-[color:var(--muted)]">
          Company-wide sales, expiry risk, branch readiness, and branch benchmarking.
        </p>
      </div>

      {error && <p className="mb-4 rounded bg-red-50 p-3 text-sm text-[color:var(--danger)]">{error}</p>}

      <section className="clinical-card mb-8 rounded-xl p-5">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="font-semibold text-[color:var(--secondary)]">Branch control map</h2>
            <p className="mt-1 text-sm text-[color:var(--muted)]">
              Keep every branch ready for customer discovery, fulfilment, and clinical operations.
            </p>
          </div>
          <Link href="/admin/branches" className="btn-primary px-4 py-2 text-sm">
            Manage branches
          </Link>
        </div>

        {branches.length === 0 ? (
          <p className="text-sm text-[color:var(--muted)]">No branches are available yet.</p>
        ) : (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {branches.map((branch) => {
              const missing: string[] = [];
              if (branch.gpsLat == null || branch.gpsLng == null) missing.push("coordinates");
              if (!branch.phone) missing.push("phone");
              if (!branch.physicalAddress) missing.push("address");
              const ready = branch.isActive && missing.length === 0;

              return (
                <div key={branch.id} className="rounded-xl border border-[color:var(--border)] bg-white p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="truncate font-semibold text-[color:var(--secondary)]">{branch.name}</div>
                      <div className="text-xs text-[color:var(--muted)]">{branch.code}</div>
                    </div>
                    <Badge tone={ready ? "safe" : branch.isActive ? "warn" : "danger"}>
                      {ready ? "Ready" : branch.isActive ? "Needs setup" : "Inactive"}
                    </Badge>
                  </div>
                  <div className="mt-3 text-sm text-[color:var(--muted)]">
                    {branch.physicalAddress ?? "No address recorded"}
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2 text-xs">
                    <span className="status-pill status-info">
                      {branch.clinicalCareEnabled ? "Clinical care on" : "Retail only"}
                    </span>
                    {missing.map((item) => (
                      <span key={item} className="status-pill status-warn">
                        Missing {item}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {data && (
        <>
          <div className="mb-8 grid gap-3 sm:grid-cols-3">
            <div className="stat-card">
              <div className="stat-card-label">Total sales today</div>
              <div className="stat-card-value">GHS {data.totalSalesToday.toFixed(2)}</div>
            </div>
            <div className="stat-card">
              <div className="stat-card-label">Transactions today</div>
              <div className="stat-card-value">{data.totalTransactionsToday}</div>
            </div>
            <div className="stat-card">
              <div className="stat-card-label">Active branches</div>
              <div className="stat-card-value">{data.activeBranchesCount}</div>
            </div>
          </div>

          <h2 className="mb-3 font-semibold text-[color:var(--secondary)]">Branch breakdown</h2>
          <div className="clinical-card mb-8 overflow-x-auto rounded-xl">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[color:var(--border)] text-left text-[color:var(--muted)]">
                  <th className="px-4 py-3 font-medium">Branch</th>
                  <th className="px-4 py-3 font-medium">Sales</th>
                  <th className="px-4 py-3 font-medium">Transactions</th>
                </tr>
              </thead>
              <tbody>
                {data.branchBreakdown.map((b) => (
                  <tr key={b.branchId} className="border-b border-[color:var(--border)] last:border-0">
                    <td className="px-4 py-3">{b.name}</td>
                    <td className="px-4 py-3">GHS {b.salesToday.toFixed(2)}</td>
                    <td className="px-4 py-3">{b.transactionsToday}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <h2 className="mb-3 font-semibold text-[color:var(--secondary)]">Expiry risk (stock value)</h2>
          <div className="mb-8 grid gap-3 sm:grid-cols-4">
            <div className="stat-card">
              <div className="stat-card-label">Expired</div>
              <div className="stat-card-value text-[color:var(--danger)]">GHS {data.expiryRisk.expired.toFixed(2)}</div>
            </div>
            <div className="stat-card">
              <div className="stat-card-label">Within 30 days</div>
              <div className="stat-card-value">GHS {data.expiryRisk.within30Days.toFixed(2)}</div>
            </div>
            <div className="stat-card">
              <div className="stat-card-label">Within 90 days</div>
              <div className="stat-card-value">GHS {data.expiryRisk.within90Days.toFixed(2)}</div>
            </div>
            <div className="stat-card">
              <div className="stat-card-label">Within 180 days</div>
              <div className="stat-card-value">GHS {data.expiryRisk.within180Days.toFixed(2)}</div>
            </div>
          </div>

          {benchmarking && (
            <>
              <h2 className="mb-3 font-semibold text-[color:var(--secondary)]">
                Branch benchmarking (last {benchmarking.windowDays} days)
              </h2>
              <div className="clinical-card overflow-x-auto rounded-xl">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[color:var(--border)] text-left text-[color:var(--muted)]">
                      <th className="px-4 py-3 font-medium">Branch</th>
                      <th className="px-4 py-3 font-medium">Sales</th>
                      <th className="px-4 py-3 font-medium">Margin</th>
                      <th className="px-4 py-3 font-medium">Stock loss</th>
                      <th className="px-4 py-3 font-medium">Expiry loss</th>
                    </tr>
                  </thead>
                  <tbody>
                    {benchmarking.benchmarking.map((b) => (
                      <tr key={b.branchId} className="border-b border-[color:var(--border)] last:border-0">
                        <td className="px-4 py-3">{b.branchName}</td>
                        <td className="px-4 py-3">GHS {b.sales.toFixed(2)}</td>
                        <td className="px-4 py-3">{b.grossMarginPercent.toFixed(1)}%</td>
                        <td className="px-4 py-3">GHS {b.stockLossValue.toFixed(2)}</td>
                        <td className="px-4 py-3">GHS {b.expiryLossValue.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </>
      )}
    </main>
  );
}
