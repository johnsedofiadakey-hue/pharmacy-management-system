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
    <main className="mx-auto max-w-3xl p-8">
      <h1 className="mb-6 text-2xl font-semibold">Online Orders</h1>
      {error && <p className="mb-4 text-red-600">{error}</p>}

      <select
        className="mb-6 rounded border px-3 py-2"
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
        <p className="text-gray-500">No orders yet.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {orders.map((order) => (
            <li key={order.id} className="rounded border p-3">
              <div className="font-medium">
                {order.customer?.phone} — {order.fulfilmentType}{" "}
                <span className="text-sm text-gray-500">({order.status}) GHS {order.total}</span>
              </div>
              <ul className="mb-2 text-sm text-gray-600">
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
                    className="rounded border px-3 py-1 text-sm"
                  >
                    Mark {next}
                  </button>
                ))}
              </div>

              {order.fulfilmentType === "DELIVERY" && order.delivery && (
                <div className="mt-2 flex items-center gap-2">
                  <span className="text-sm text-gray-500">Delivery: {order.delivery.status}</span>
                  {!order.delivery.riderId && (
                    <>
                      <input
                        placeholder="Rider user ID"
                        className="rounded border px-2 py-1 text-sm"
                        value={riderIdByOrder[order.id] ?? ""}
                        onChange={(e) =>
                          setRiderIdByOrder((prev) => ({ ...prev, [order.id]: e.target.value }))
                        }
                      />
                      <button
                        onClick={() => handleAssignRider(order)}
                        className="rounded border px-3 py-1 text-sm"
                      >
                        Assign rider
                      </button>
                    </>
                  )}
                  {order.delivery.riderId && order.delivery.status !== "DELIVERED" && (
                    <button
                      onClick={() => handleMarkDelivered(order.delivery!.id)}
                      className="rounded border px-3 py-1 text-sm"
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
