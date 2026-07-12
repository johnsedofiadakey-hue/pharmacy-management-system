"use client";

import { useEffect, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { getFirebaseDb } from "./client";

// Shape written by functions/src/dashboard/refreshBranchDashboard.ts to
// `branch_live/{branchId}` — keep the two in sync.
export type BranchLive = {
  organisationId: string;
  todaySalesTotal: number;
  todaySalesCount: number;
  cashCollectedToday: number;
  pendingApprovalsCount: number;
  staffClockedInCount: number;
  lowStockCount: number;
  updatedAt: string;
};

export function useBranchLive(branchId: string | null): BranchLive | null {
  const [live, setLive] = useState<BranchLive | null>(null);

  useEffect(() => {
    if (!branchId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLive(null);
      return;
    }
    return onSnapshot(
      doc(getFirebaseDb(), "branch_live", branchId),
      (snapshot) => setLive(snapshot.exists() ? (snapshot.data() as BranchLive) : null),
      () => setLive(null)
    );
  }, [branchId]);

  return live;
}
