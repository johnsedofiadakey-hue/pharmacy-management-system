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
      .catch(() => setError("Products are not available right now. Please try again shortly or contact a branch."));
    publicListBranches(ORG_ID)
      .then((r) => {
        setBranches(r.data.branches);
        const savedBranchId = window.localStorage.getItem("selectedBranchId");
        const fallbackBranchId = r.data.branches[0]?.id ?? "";
        setBranchId(r.data.branches.some((branch) => branch.id === savedBranchId) ? savedBranchId ?? "" : fallbackBranchId);
      })
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
    <main className="app-shell min-h-screen pb-12">
      <section className="border-b border-[color:var(--border)] bg-white/82">
        <div className="page-wrap flex items-center justify-between py-5">
          <Link href="/" className="text-xl font-semibold text-[color:var(--secondary)]">
            Nexus Pharma
          </Link>
          {user ? (
            <Link href="/store/account" className="btn-secondary px-4 py-2 text-sm">
              My account
            </Link>
          ) : (
            <div className="flex gap-3 text-sm">
              <Link href="/store/login" className="btn-secondary px-4 py-2">
                Log in
              </Link>
              <Link href="/store/signup" className="btn-primary px-4 py-2">
                Sign up
              </Link>
            </div>
          )}
        </div>
      </section>

      <section className="page-wrap grid gap-8 py-10 lg:grid-cols-[1fr_380px]">
        <div>
          <p className="text-sm font-semibold uppercase text-[color:var(--primary)]">Storefront</p>
          <h1 className="mt-2 text-4xl font-semibold text-[color:var(--secondary)]">
            Trusted pharmacy products with branch fulfilment.
          </h1>
          <p className="mt-3 max-w-2xl text-[color:var(--muted)]">
            Choose medicines and wellness products, select pickup or delivery, then pay securely or complete with branch support.
          </p>

          {error && <p className="mt-5 rounded bg-red-50 p-3 text-sm text-[color:var(--danger)]">{error}</p>}
          {message && <p className="mt-5 rounded bg-green-50 p-3 text-sm text-green-700">{message}</p>}

          {products.length === 0 ? (
            <div className="clinical-card mt-8 rounded-lg p-5">
              <p className="font-semibold text-[color:var(--secondary)]">Catalogue is being prepared.</p>
              <p className="mt-2 text-sm text-[color:var(--muted)]">
                Products will appear here after branch stock and public pricing are published.
              </p>
            </div>
          ) : (
            <ul className="mt-8 grid gap-3 sm:grid-cols-2">
              {products.map((product) => (
                <li key={product.id}>
                  <button
                    onClick={() => addToCart(product)}
                    className="clinical-card min-h-32 w-full rounded-lg p-4 text-left transition hover:-translate-y-0.5"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="font-semibold text-[color:var(--secondary)]">{product.name}</div>
                      <span className="status-pill status-info">Stock</span>
                    </div>
                    <div className="mt-3 text-sm text-[color:var(--muted)]">
                      GHS {product.retailPrice ?? "—"}
                      {product.prescriptionClassification === "RESTRICTED" && (
                        <span className="ml-2 text-[color:var(--danger)]">Rx required</span>
                      )}
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <aside className="clinical-card h-fit rounded-lg p-5">
          <h2 className="mb-3 text-lg font-semibold text-[color:var(--secondary)]">Cart</h2>
          {cart.length === 0 ? (
            <p className="text-sm text-[color:var(--muted)]">No items yet.</p>
          ) : (
            <ul className="mb-3 flex flex-col gap-1 text-sm">
              {cart.map((l) => (
                <li key={l.productId} className="flex justify-between gap-3">
                  <span>
                    {l.name} × {l.quantity}
                  </span>
                  <span>GHS {(l.unitPrice * l.quantity).toFixed(2)}</span>
                </li>
              ))}
            </ul>
          )}

          <select
            className="field mb-2 w-full px-3 py-3"
            value={branchId}
            onChange={(e) => {
              setBranchId(e.target.value);
              window.localStorage.setItem("selectedBranchId", e.target.value);
            }}
          >
            <option value="">Select branch...</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>

          <div className="mb-3 grid grid-cols-2 gap-2 text-sm">
            <label className="field px-3 py-2">
              <input
                type="radio"
                checked={fulfilmentType === "PICKUP"}
                onChange={() => setFulfilmentType("PICKUP")}
              />{" "}
              Pickup
            </label>
            <label className="field px-3 py-2">
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
              className="field mb-2 w-full px-3 py-3"
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
            className="field mb-2 w-full px-3 py-3"
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
            className="btn-primary w-full px-4 py-3 disabled:opacity-50"
          >
            {user ? "Place order" : "Sign up to check out"}
          </button>
        </aside>
      </section>
    </main>
  );
}
