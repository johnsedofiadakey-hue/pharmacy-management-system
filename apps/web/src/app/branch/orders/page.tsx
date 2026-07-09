"use client";

import { useEffect, useState } from "react";
import {
  listBranches,
  listBranchOrders,
  updateOrderStatus,
  assignDeliveryRider,
  updateDeliveryStatus,
  type Branch,
  type OrderRow,
} from "@/lib/firebase/callables";

const NEXT_STATUS: Record<string, string[]> = {
  NEW: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["PICKING", "CANCELLED"],
  PICKING: ["READY", "CANCELLED"],
  READY: ["OUT_FOR_DELIVERY", "DELIVERED", "CANCELLED"],
  OUT_FOR_DELIVERY: ["DELIVERED", "CANCELLED"],
  DELIVERED: [],
  CANCELLED: [],
};

// Phase 9 skeleton — rider assignment takes a raw user ID (no staff picker
// UI yet); branch selection is manual, same follow-up as earlier phases.
export default function BranchOrdersPage() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [branchId, setBranchId] = useState("");
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [riderIdByOrder, setRiderIdByOrder] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listBranches()
      .then((r) => setBranches(r.data.branches))
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load branches."));
  }, []);

  async function refresh() {
    if (!branchId) return;
    try {
      const result = await listBranchOrders(branchId);
      setOrders(result.data.orders);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load orders.");
    }
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [branchId]);

  async function handleStatusChange(orderId: string, newStatus: string) {
    setError(null);
    try {
      await updateOrderStatus(orderId, newStatus);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Status update failed.");
    }
  }

  async function handleAssignRider(order: OrderRow) {
    const riderId = riderIdByOrder[order.id];
    if (!riderId) return;
    setError(null);
    try {
      await assignDeliveryRider(order.id, riderId);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Rider assignment failed.");
    }
  }

  async function handleMarkDelivered(deliveryId: string) {
    setError(null);
    try {
      await updateDeliveryStatus(deliveryId, "DELIVERED");
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delivery update failed.");
    }
  }

  return (
    <main className="page-wrap py-8">
      <div className="mb-6">
        <p className="text-sm font-semibold uppercase text-[color:var(--primary)]">Branch Workspace</p>
        <h1 className="mt-1 text-3xl font-semibold text-[color:var(--secondary)]">Online orders</h1>
        <p className="mt-2 max-w-2xl text-sm text-[color:var(--muted)]">
          Move orders through fulfilment and manage delivery riders for this branch.
        </p>
      </div>

      {error && <p className="mb-4 rounded bg-red-50 p-3 text-sm text-[color:var(--danger)]">{error}</p>}

      <select
        className="field mb-6 px-3 py-2"
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

      {orders.length === 0 ? (
        <p className="text-[color:var(--muted)]">No orders yet.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {orders.map((order) => (
            <li key={order.id} className="clinical-card rounded-xl p-4">
              <div className="font-semibold text-[color:var(--secondary)]">
                {order.customer?.phone} — {order.fulfilmentType}{" "}
                <span className="status-pill status-info">{order.status}</span>{" "}
                <span className="text-sm text-[color:var(--muted)]">GHS {order.total}</span>
              </div>
              <ul className="mb-2 mt-1 text-sm text-[color:var(--muted)]">
                {order.items.map((item) => (
                  <li key={item.id}>
                    {item.product.name} × {item.quantity}
                  </li>
                ))}
              </ul>

              <div className="flex flex-wrap gap-2">
                {NEXT_STATUS[order.status]?.map((next) => (
                  <button
                    key={next}
                    onClick={() => handleStatusChange(order.id, next)}
                    className="btn-secondary px-3 py-1 text-sm"
                  >
                    Mark {next}
                  </button>
                ))}
              </div>

              {order.fulfilmentType === "DELIVERY" && order.delivery && (
                <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-[color:var(--border)] pt-3">
                  <span className="status-pill status-safe">Delivery: {order.delivery.status}</span>
                  {!order.delivery.riderId && (
                    <>
                      <input
                        placeholder="Rider user ID"
                        className="field px-2 py-1 text-sm"
                        value={riderIdByOrder[order.id] ?? ""}
                        onChange={(e) =>
                          setRiderIdByOrder((prev) => ({ ...prev, [order.id]: e.target.value }))
                        }
                      />
                      <button
                        onClick={() => handleAssignRider(order)}
                        className="btn-secondary px-3 py-1 text-sm"
                      >
                        Assign rider
                      </button>
                    </>
                  )}
                  {order.delivery.riderId && order.delivery.status !== "DELIVERED" && (
                    <button
                      onClick={() => handleMarkDelivered(order.delivery!.id)}
                      className="btn-secondary px-3 py-1 text-sm"
                    >
                      Mark delivered
                    </button>
                  )}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
