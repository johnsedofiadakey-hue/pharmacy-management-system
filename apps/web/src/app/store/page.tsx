"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/firebase/authContext";
import {
  publicListProducts,
  publicListBranches,
  listMyAddresses,
  placeOrder,
  initializePaystackPayment,
  type PublicProduct,
  type PublicBranch,
  type CustomerAddressRow,
} from "@/lib/firebase/callables";

type CartLine = { productId: string; name: string; quantity: number; unitPrice: number };
type StorePaymentMethod = "CASH" | "MOMO" | "CARD" | "BANK_TRANSFER";

const ORG_ID = process.env.NEXT_PUBLIC_ORGANISATION_ID ?? "";

// Phase 9 skeleton — public browsing needs no sign-in; checkout does
// (placeOrder is customer-auth-gated), so an unauthenticated checkout
// attempt redirects to /store/signup.
export default function StorePage() {
  const { user } = useAuth();
  const router = useRouter();
  const [products, setProducts] = useState<PublicProduct[]>([]);
  const [branches, setBranches] = useState<PublicBranch[]>([]);
  const [addresses, setAddresses] = useState<CustomerAddressRow[]>([]);
  const [cart, setCart] = useState<CartLine[]>([]);
  const [branchId, setBranchId] = useState("");
  const [fulfilmentType, setFulfilmentType] = useState<"PICKUP" | "DELIVERY">("PICKUP");
  const [deliveryAddressId, setDeliveryAddressId] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<StorePaymentMethod>("MOMO");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!ORG_ID) {
      setError("NEXT_PUBLIC_ORGANISATION_ID is not configured for this deployment.");
      return;
    }
    publicListProducts(ORG_ID)
      .then((r) => setProducts(r.data.products))
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load products."));
    publicListBranches(ORG_ID)
      .then((r) => setBranches(r.data.branches))
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!user) return;
    listMyAddresses()
      .then((r) => setAddresses(r.data.addresses))
      .catch(() => undefined);
  }, [user]);

  function addToCart(product: PublicProduct) {
    if (product.prescriptionClassification === "RESTRICTED") {
      setError(`"${product.name}" requires a prescription — please visit a branch.`);
      return;
    }
    setCart((prev) => {
      const existing = prev.find((l) => l.productId === product.id);
      if (existing) {
        return prev.map((l) => (l.productId === product.id ? { ...l, quantity: l.quantity + 1 } : l));
      }
      return [
        ...prev,
        { productId: product.id, name: product.name, quantity: 1, unitPrice: Number(product.retailPrice ?? 0) },
      ];
    });
  }

  const total = cart.reduce((sum, l) => sum + l.unitPrice * l.quantity, 0);

  async function handleCheckout() {
    if (!user) {
      router.push("/store/signup");
      return;
    }
    setError(null);
    setMessage(null);
    try {
      const result = await placeOrder({
        branchId,
        fulfilmentType,
        deliveryAddressId: fulfilmentType === "DELIVERY" ? deliveryAddressId : undefined,
        paymentMethod,
        items: cart.map((l) => ({ productId: l.productId, quantity: l.quantity })),
      });

      if (paymentMethod !== "CASH") {
        const paystack = await initializePaystackPayment({
          orderId: result.data.order.id,
          callbackUrl: `${window.location.origin}/store/account`,
        });
        if (paystack.data.authorizationUrl) {
          window.location.href = paystack.data.authorizationUrl;
          return;
        }
      }

      setMessage(`Order placed! Total GHS ${result.data.order.total}`);
      setCart([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Checkout failed.");
    }
  }

  return (
    <main className="mx-auto max-w-3xl p-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Storefront</h1>
        {user ? (
          <Link href="/store/account" className="text-sm underline">
            My account
          </Link>
        ) : (
          <div className="flex gap-3 text-sm">
            <Link href="/store/login" className="underline">
              Log in
            </Link>
            <Link href="/store/signup" className="underline">
              Sign up
            </Link>
          </div>
        )}
      </div>

      {error && <p className="mb-4 text-red-600">{error}</p>}
      {message && <p className="mb-4 text-green-700">{message}</p>}

      <ul className="mb-6 grid grid-cols-2 gap-2">
        {products.map((product) => (
          <li key={product.id}>
            <button
              onClick={() => addToCart(product)}
              className="w-full rounded border p-2 text-left hover:bg-gray-50"
            >
              <div className="font-medium">{product.name}</div>
              <div className="text-sm text-gray-500">
                GHS {product.retailPrice ?? "—"}
                {product.prescriptionClassification === "RESTRICTED" && (
                  <span className="ml-2 text-red-600">Rx required</span>
                )}
              </div>
            </button>
          </li>
        ))}
      </ul>

      <div className="rounded-lg border p-4">
        <h2 className="mb-3 font-medium">Cart</h2>
        {cart.length === 0 ? (
          <p className="text-gray-500">No items yet.</p>
        ) : (
          <ul className="mb-3 flex flex-col gap-1 text-sm">
            {cart.map((l) => (
              <li key={l.productId} className="flex justify-between">
                <span>
                  {l.name} × {l.quantity}
                </span>
                <span>GHS {(l.unitPrice * l.quantity).toFixed(2)}</span>
              </li>
            ))}
          </ul>
        )}

        <select
          className="mb-2 w-full rounded border px-3 py-2"
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

        <div className="mb-2 flex gap-3 text-sm">
          <label>
            <input
              type="radio"
              checked={fulfilmentType === "PICKUP"}
              onChange={() => setFulfilmentType("PICKUP")}
            />{" "}
            Pickup
          </label>
          <label>
            <input
              type="radio"
              checked={fulfilmentType === "DELIVERY"}
              onChange={() => setFulfilmentType("DELIVERY")}
            />{" "}
            Delivery
          </label>
        </div>

        {fulfilmentType === "DELIVERY" && (
          <select
            className="mb-2 w-full rounded border px-3 py-2"
            value={deliveryAddressId}
            onChange={(e) => setDeliveryAddressId(e.target.value)}
          >
            <option value="">Select delivery address...</option>
            {addresses.map((a) => (
              <option key={a.id} value={a.id}>
                {a.label}
              </option>
            ))}
          </select>
        )}

        <select
          className="mb-2 w-full rounded border px-3 py-2"
          value={paymentMethod}
          onChange={(e) => setPaymentMethod(e.target.value as StorePaymentMethod)}
        >
          <option value="MOMO">Mobile money via Paystack</option>
          <option value="CARD">Card via Paystack</option>
          <option value="BANK_TRANSFER">Bank transfer via Paystack</option>
          <option value="CASH">Cash on pickup/delivery</option>
        </select>

        <div className="mb-3 flex justify-between font-medium">
          <span>Total</span>
          <span>GHS {total.toFixed(2)}</span>
        </div>
        <button
          onClick={handleCheckout}
          disabled={cart.length === 0 || !branchId || (fulfilmentType === "DELIVERY" && !deliveryAddressId)}
          className="w-full rounded bg-black px-4 py-2 text-white disabled:opacity-50"
        >
          {user ? "Place order" : "Sign up to check out"}
        </button>
      </div>
    </main>
  );
}
