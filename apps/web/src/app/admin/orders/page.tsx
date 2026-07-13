"use client";

import { useEffect, useState } from "react";
import {
  listBranches,
  listBranchOrders,
  updateOrderStatus,
  type Branch,
  type OrderRow,
} from "@/lib/firebase/callables";
import { Alert, Badge, Button, Select } from "@/components/ui";

const NEXT_STATUS: Record<OrderRow["status"], OrderRow["status"][]> = {
  NEW: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["PICKING", "CANCELLED"],
  PICKING: ["READY", "CANCELLED"],
  READY: ["OUT_FOR_DELIVERY", "DELIVERED", "CANCELLED"],
  OUT_FOR_DELIVERY: ["DELIVERED", "CANCELLED"],
  DELIVERED: [],
  CANCELLED: [],
};

export default function AdminOrdersPage() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [branchId, setBranchId] = useState("");
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [status, setStatus] = useState<OrderRow["status"] | "ALL">("ALL");
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
    try {
      const result = await listBranchOrders(branchId, status === "ALL" ? undefined : status);
      setOrders(result.data.orders);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load orders.");
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [branchId, status]);

  async function mark(orderId: string, newStatus: OrderRow["status"]) {
    setError(null);
    try {
      await updateOrderStatus(orderId, newStatus);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update order.");
    }
  }

  return (
    <main className="page-wrap py-8">
      <div className="mb-6">
        <p className="text-sm font-semibold uppercase text-[color:var(--primary)]">Super Admin</p>
        <h1 className="mt-1 text-3xl font-semibold text-[color:var(--secondary)]">Order control</h1>
        <p className="mt-2 max-w-2xl text-sm text-[color:var(--muted)]">
          Monitor customer fulfilment and intervene when a branch queue is blocked.
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
        <Select value={status} onChange={(e) => setStatus(e.target.value as OrderRow["status"] | "ALL")}>
          <option value="ALL">All statuses</option>
          {Object.keys(NEXT_STATUS).map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </Select>
        <Button variant="secondary" onClick={refresh} disabled={!branchId}>
          Refresh
        </Button>
      </div>

      {orders.length === 0 ? (
        <p className="text-[color:var(--muted)]">No orders match this view.</p>
      ) : (
        <div className="grid gap-3">
          {orders.map((order) => (
            <article key={order.id} className="clinical-card rounded-xl p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="font-semibold text-[color:var(--secondary)]">
                    {order.customer?.phone ?? "Guest customer"} · GHS {order.total}
                  </div>
                  <div className="mt-1 text-sm text-[color:var(--muted)]">
                    {order.fulfilmentType} · {new Date(order.createdAt).toLocaleString()}
                  </div>
                </div>
                <Badge tone={order.status === "CANCELLED" ? "danger" : order.status === "DELIVERED" ? "safe" : "info"}>
                  {order.status}
                </Badge>
              </div>
              <ul className="mt-3 text-sm text-[color:var(--muted)]">
                {order.items.map((item) => (
                  <li key={item.id}>
                    {item.product.name} x {item.quantity}
                  </li>
                ))}
              </ul>
              <div className="mt-3 flex flex-wrap gap-2">
                {NEXT_STATUS[order.status].map((next) => (
                  <button key={next} type="button" onClick={() => mark(order.id, next)} className="btn-secondary px-3 py-1 text-sm">
                    Mark {next}
                  </button>
                ))}
              </div>
            </article>
          ))}
        </div>
      )}
    </main>
  );
}
