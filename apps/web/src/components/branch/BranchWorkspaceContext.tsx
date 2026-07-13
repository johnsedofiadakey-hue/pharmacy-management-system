"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { MapPin, RefreshCw } from "lucide-react";
import { listBranches, type Branch } from "@/lib/firebase/callables";
import { Alert, Badge, Select } from "@/components/ui";

export const STAFF_BRANCH_STORAGE_KEY = "staffSelectedBranchId";

type BranchWorkspaceState = {
  branches: Branch[];
  branchId: string;
  selectedBranch: Branch | null;
  loading: boolean;
  error: string | null;
  setBranchId: (branchId: string) => void;
  refreshBranches: () => Promise<void>;
};

const BranchWorkspaceContext = createContext<BranchWorkspaceState | null>(null);

function pickInitialBranch(branches: Branch[]): string {
  const savedBranchId = window.localStorage.getItem(STAFF_BRANCH_STORAGE_KEY);
  if (savedBranchId && branches.some((branch) => branch.id === savedBranchId)) {
    return savedBranchId;
  }
  return branches.find((branch) => branch.isActive)?.id ?? branches[0]?.id ?? "";
}

export function BranchWorkspaceProvider({ children }: { children: React.ReactNode }) {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [branchId, setBranchIdState] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshBranches = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await listBranches();
      const nextBranches = result.data.branches;
      setBranches(nextBranches);
      setBranchIdState((current) => {
        if (current && nextBranches.some((branch) => branch.id === current)) {
          return current;
        }
        const nextBranchId = pickInitialBranch(nextBranches);
        if (nextBranchId) {
          window.localStorage.setItem(STAFF_BRANCH_STORAGE_KEY, nextBranchId);
        }
        return nextBranchId;
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load branches.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refreshBranches();
  }, [refreshBranches]);

  const setBranchId = useCallback((nextBranchId: string) => {
    setBranchIdState(nextBranchId);
    if (nextBranchId) {
      window.localStorage.setItem(STAFF_BRANCH_STORAGE_KEY, nextBranchId);
    }
  }, []);

  const selectedBranch = useMemo(
    () => branches.find((branch) => branch.id === branchId) ?? null,
    [branches, branchId]
  );

  const value = useMemo(
    () => ({
      branches,
      branchId,
      selectedBranch,
      loading,
      error,
      setBranchId,
      refreshBranches,
    }),
    [branches, branchId, selectedBranch, loading, error, setBranchId, refreshBranches]
  );

  return <BranchWorkspaceContext.Provider value={value}>{children}</BranchWorkspaceContext.Provider>;
}

export function useBranchWorkspace(): BranchWorkspaceState {
  const value = useContext(BranchWorkspaceContext);
  if (!value) {
    throw new Error("useBranchWorkspace must be used inside BranchWorkspaceProvider.");
  }
  return value;
}

export function BranchContextBar() {
  const { branches, branchId, selectedBranch, loading, error, setBranchId, refreshBranches } =
    useBranchWorkspace();

  return (
    <section className="border-b border-[color:var(--border)] bg-white/90 px-4 py-3 md:px-6">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <span className="icon-tile size-9 shrink-0">
            <MapPin size={17} />
          </span>
          <div className="min-w-0">
            <div className="text-[11px] font-bold uppercase tracking-wide text-[color:var(--muted)]">
              Active branch
            </div>
            <div className="truncate text-sm font-semibold text-[color:var(--secondary)]">
              {loading ? "Loading branches..." : selectedBranch?.name ?? "No branch selected"}
            </div>
          </div>
          {selectedBranch && (
            <Badge tone={selectedBranch.isActive ? "safe" : "warn"}>
              {selectedBranch.isActive ? "Active" : "Inactive"}
            </Badge>
          )}
        </div>

        <Select
          className="w-full sm:w-72"
          value={branchId}
          onChange={(event) => setBranchId(event.target.value)}
          disabled={loading || branches.length === 0}
          aria-label="Active branch"
        >
          <option value="">Select branch...</option>
          {branches.map((branch) => (
            <option key={branch.id} value={branch.id}>
              {branch.name}
            </option>
          ))}
        </Select>

        <button
          type="button"
          onClick={() => refreshBranches()}
          className="btn-secondary inline-flex items-center gap-1.5 px-3 py-2 text-sm"
          disabled={loading}
        >
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>
      {error && <Alert tone="error" className="mt-3">{error}</Alert>}
    </section>
  );
}
