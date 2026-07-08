"use client";

import { useEffect, useState } from "react";
import { RequireAuth } from "@/components/RequireAuth";
import {
  listMyOrders,
  listMyAddresses,
  addCustomerAddress,
  type OrderRow,
  type CustomerAddressRow,
} from "@/lib/firebase/callables";

function AccountContent() {
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [addresses, setAddresses] = useState<CustomerAddressRow[]>([]);
  const [form, setForm] = useState({ label: "", addressText: "" });
  const [error, setError] = useState<string | null>(null);

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
    refresh();
  }, []);

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
    <main className="mx-auto max-w-2xl p-8">
      <h1 className="mb-6 text-2xl font-semibold">My Account</h1>
      {error && <p className="mb-4 text-red-600">{error}</p>}

      <h2 className="mb-2 font-medium">Order history</h2>
      {orders.length === 0 ? (
        <p className="mb-6 text-gray-500">No orders yet.</p>
      ) : (
        <ul className="mb-6 flex flex-col gap-2">
          {orders.map((order) => (
            <li key={order.id} className="rounded border p-3 text-sm">
              <div className="font-medium">
                {order.fulfilmentType} — {order.status}{" "}
                <span className="text-gray-500">(GHS {order.total})</span>
              </div>
              <ul className="text-gray-600">
                {order.items.map((item) => (
                  <li key={item.id}>
                    {item.product.name} × {item.quantity}
                  </li>
                ))}
              </ul>
              {order.delivery && <div className="text-gray-500">Delivery: {order.delivery.status}</div>}
            </li>
          ))}
        </ul>
      )}

      <h2 className="mb-2 font-medium">Delivery addresses</h2>
      <ul className="mb-3 text-sm">
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
          className="rounded border px-2 py-1 text-sm"
          value={form.label}
          onChange={(e) => setForm({ ...form, label: e.target.value })}
        />
        <input
          required
          placeholder="Address"
          className="flex-1 rounded border px-2 py-1 text-sm"
          value={form.addressText}
          onChange={(e) => setForm({ ...form, addressText: e.target.value })}
        />
        <button type="submit" className="rounded bg-black px-3 py-1 text-sm text-white">
          Add
        </button>
      </form>
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
