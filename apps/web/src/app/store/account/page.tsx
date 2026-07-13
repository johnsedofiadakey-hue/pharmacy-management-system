"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { RequireAuth } from "@/components/RequireAuth";
import {
  listMyOrders,
  listMyAddresses,
  addCustomerAddress,
  verifyPaystackPayment,
  type OrderRow,
  type CustomerAddressRow,
} from "@/lib/firebase/callables";

function AccountContent() {
  const searchParams = useSearchParams();
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [addresses, setAddresses] = useState<CustomerAddressRow[]>([]);
  const [form, setForm] = useState({ label: "", addressText: "" });
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function refresh() {
    try {
      const [orderResult, addressResult] = await Promise.all([listMyOrders(), listMyAddresses()]);
      setOrders(orderResult.data.orders);
      setAddresses(addressResult.data.addresses);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load account.");
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refresh();
  }, []);

  useEffect(() => {
    const reference = searchParams.get("reference");
    if (!reference) return;

    verifyPaystackPayment(reference)
      .then(async (result) => {
        setMessage(
          result.data.providerStatus === "success"
            ? "Payment verified."
            : `Payment status: ${result.data.providerStatus}`
        );
        await refresh();
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Payment verification failed."));
  }, [searchParams]);

  async function handleAddAddress(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    try {
      await addCustomerAddress(form);
      setForm({ label: "", addressText: "" });
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add address.");
    }
  }

  return (
    <main className="app-shell min-h-screen">
      <div className="page-wrap max-w-2xl py-10">
        <p className="text-sm font-semibold uppercase text-[color:var(--primary)]">Customer portal</p>
        <h1 className="font-display mt-1 text-3xl font-semibold text-[color:var(--secondary)]">My account</h1>

        {error && <p className="mt-4 rounded bg-red-50 p-3 text-sm text-[color:var(--danger)]">{error}</p>}
        {message && <p className="mt-4 rounded bg-green-50 p-3 text-sm text-green-700">{message}</p>}

        <h2 className="mb-2 mt-8 font-semibold text-[color:var(--secondary)]">Order history</h2>
        {orders.length === 0 ? (
          <p className="mb-6 text-[color:var(--muted)]">No orders yet.</p>
        ) : (
          <ul className="mb-6 flex flex-col gap-2">
            {orders.map((order) => (
              <li key={order.id} className="clinical-card rounded-xl p-4 text-sm">
                <div className="font-semibold text-[color:var(--secondary)]">
                  {order.fulfilmentType} — <span className="status-pill status-info">{order.status}</span>{" "}
                  <span className="text-[color:var(--muted)]">(GHS {order.total})</span>
                </div>
                <ul className="mt-1 text-[color:var(--muted)]">
                  {order.items.map((item) => (
                    <li key={item.id}>
                      {item.product.name} × {item.quantity}
                    </li>
                  ))}
                </ul>
                {order.payments?.map((payment) => (
                  <div key={payment.id} className="text-[color:var(--muted)]">
                    Payment: {payment.paymentMethod} / {payment.status}
                  </div>
                ))}
                {order.delivery && <div className="text-[color:var(--muted)]">Delivery: {order.delivery.status}</div>}
              </li>
            ))}
          </ul>
        )}

        <h2 className="mb-2 font-semibold text-[color:var(--secondary)]">Delivery addresses</h2>
        <ul className="mb-3 text-sm text-[color:var(--muted)]">
          {addresses.map((a) => (
            <li key={a.id}>
              {a.label}: {a.addressText}
            </li>
          ))}
        </ul>
        <form onSubmit={handleAddAddress} className="flex gap-2">
          <input
            required
            placeholder="Label (e.g. Home)"
            className="field px-3 py-2 text-sm"
            value={form.label}
            onChange={(e) => setForm({ ...form, label: e.target.value })}
          />
          <input
            required
            placeholder="Address"
            className="field flex-1 px-3 py-2 text-sm"
            value={form.addressText}
            onChange={(e) => setForm({ ...form, addressText: e.target.value })}
          />
          <button type="submit" className="btn-primary px-3 py-2 text-sm">
            Add
          </button>
        </form>
      </div>
    </main>
  );
}

export default function CustomerAccountPage() {
  return (
    <RequireAuth redirectTo="/store/login">
      <AccountContent />
    </RequireAuth>
  );
}
