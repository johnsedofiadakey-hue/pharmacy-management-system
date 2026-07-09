"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { publicListBranches, type PublicBranch } from "@/lib/firebase/callables";

const ORG_ID = process.env.NEXT_PUBLIC_ORGANISATION_ID ?? "";

export function PublicBranchEntry() {
  const [branches, setBranches] = useState<PublicBranch[]>([]);
  const [branchId, setBranchId] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!ORG_ID) return;
    publicListBranches(ORG_ID)
      .then((result) => {
        setBranches(result.data.branches);
        setBranchId(result.data.branches[0]?.id ?? "");
      })
      .catch(() => setError("Branches are not available right now. You can still continue to login."));
  }, []);

  useEffect(() => {
    if (branchId) {
      window.localStorage.setItem("selectedBranchId", branchId);
    }
  }, [branchId]);

  return (
    <section id="login" className="relative -mt-10 pb-12">
      <div className="page-wrap">
        <div className="clinical-card grid gap-5 rounded-lg p-5 md:grid-cols-[1.2fr_1fr] md:p-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-normal text-[color:var(--primary)]">
              Secure access
            </p>
            <h2 className="mt-1 text-2xl font-semibold text-[color:var(--secondary)]">
              Choose your branch and continue
            </h2>
            <p className="mt-2 max-w-xl text-sm text-[color:var(--muted)]">
              Customers, pharmacists, managers, and staff all enter through the same trusted gateway.
            </p>
          </div>

          <div className="grid gap-3">
            <select
              className="field w-full px-3 py-3"
              value={branchId}
              onChange={(event) => setBranchId(event.target.value)}
            >
              {branches.length === 0 ? (
                <option value="">Select branch</option>
              ) : (
                branches.map((branch) => (
                  <option key={branch.id} value={branch.id}>
                    {branch.name}
                  </option>
                ))
              )}
            </select>
            {error && <p className="text-sm text-[color:var(--danger)]">{error}</p>}
            <div className="grid grid-cols-2 gap-2">
              <Link href="/login" className="btn-primary px-4 py-3 text-center">
                Staff login
              </Link>
              <Link href="/store/login" className="btn-secondary px-4 py-3 text-center">
                Customer login
              </Link>
            </div>
            <Link href="/store" className="text-center text-sm font-medium text-[color:var(--primary)] underline">
              Browse medicines and delivery options
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
