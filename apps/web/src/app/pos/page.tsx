"use client";

import { useEffect, useMemo, useState } from "react";
import {
  listBranches,
  listProducts,
  openTill,
  closeTill,
  createSale,
  type Branch,
  type Product,
  type TillSession,
} from "@/lib/firebase/callables";

type CartLine = { productId: string; name: string; quantity: number; unitPrice: number };

// Phase 3 skeleton — branch is manually selected rather than auto-detected
// from the cashier's assigned branch (that needs the Firestore mirror-doc
// read, a follow-up). Not yet exercisable end-to-end without a real
// Firebase/Supabase project (see phase build logs).
export default function PosPage() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [branchId, setBranchId] = useState("");
  const [tillSession, setTillSession] = useState<TillSession | null>(null);
  const [openingFloat, setOpeningFloat] = useState("500");
  const [closingActual, setClosingActual] = useState("");
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState<CartLine[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [branchResult, productResult] = await Promise.all([listBranches(), listProducts()]);
        setBranches(branchResult.data.branches);
        setProducts(productResult.data.products);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load data.");
      }
    })();
  }, []);

  const filteredProducts = useMemo(() => {
    if (!search) return products;
    const q = search.toLowerCase();
    return products.filter(
      (p) => p.name.toLowerCase().includes(q) || p.barcode?.toLowerCase().includes(q)
    );
  }, [products, search]);

  const total = cart.reduce((sum, line) => sum + line.unitPrice * line.quantity, 0);

  function addToCart(product: Product) {
    setCart((prev) => {
      const existing = prev.find((l) => l.productId === product.id);
      if (existing) {
        return prev.map((l) =>
          l.productId === product.id ? { ...l, quantity: l.quantity + 1 } : l
        );
      }
      return [
        ...prev,
        {
          productId: product.id,
          name: product.name,
          quantity: 1,
          unitPrice: Number(product.retailPrice ?? 0),
        },
      ];
    });
  }

  async function handleOpenTill() {
    setError(null);
    setBusy(true);
    try {
      const result = await openTill({ branchId, openingFloat: Number(openingFloat) });
      setTillSession(result.data.tillSession);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to open till.");
    } finally {
      setBusy(false);
    }
  }

  async function handleCloseTill() {
    if (!tillSession) return;
    setError(null);
    setBusy(true);
    try {
      await closeTill({ tillSessionId: tillSession.id, closingActual: Number(closingActual) });
      setTillSession(null);
      setClosingActual("");
      setMessage("Till closed.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to close till.");
    } finally {
      setBusy(false);
    }
  }

  async function handleCheckout() {
    if (!tillSession || cart.length === 0) return;
    setError(null);
    setMessage(null);
    setBusy(true);
    try {
      const result = await createSale({
        branchId,
        tillSessionId: tillSession.id,
        items: cart.map((line) => ({
          productId: line.productId,
          quantity: line.quantity,
          unitPrice: line.unitPrice,
        })),
        payments: [{ paymentMethod: "CASH", amount: total }],
      });
      setMessage(`Sale completed: GHS ${result.data.sale.total}`);
      setCart([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Checkout failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto max-w-3xl p-8">
      <h1 className="mb-6 text-2xl font-semibold">POS</h1>

      {error && <p className="mb-4 text-red-600">{error}</p>}
      {message && <p className="mb-4 text-green-700">{message}</p>}

      <div className="mb-6 flex flex-wrap items-center gap-3 rounded-lg border p-4">
        <select
          className="rounded border px-3 py-2"
          value={branchId}
          onChange={(e) => setBranchId(e.target.value)}
          disabled={!!tillSession}
        >
          <option value="">Select branch...</option>
          {branches.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>

        {!tillSession ? (
          <>
            <input
              type="number"
              className="w-32 rounded border px-3 py-2"
              placeholder="Opening float"
              value={openingFloat}
              onChange={(e) => setOpeningFloat(e.target.value)}
            />
            <button
              onClick={handleOpenTill}
              disabled={!branchId || busy}
              className="rounded bg-black px-4 py-2 text-white disabled:opacity-50"
            >
              Open till
            </button>
          </>
        ) : (
          <>
            <span className="text-sm text-green-700">Till open</span>
            <input
              type="number"
              className="w-32 rounded border px-3 py-2"
              placeholder="Closing actual"
              value={closingActual}
              onChange={(e) => setClosingActual(e.target.value)}
            />
            <button
              onClick={handleCloseTill}
              disabled={busy}
              className="rounded border px-4 py-2"
            >
              Close till
            </button>
          </>
        )}
      </div>

      {tillSession && (
        <>
          <input
            placeholder="Search product name or barcode..."
            className="mb-3 w-full rounded border px-3 py-2"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <ul className="mb-6 grid grid-cols-2 gap-2">
            {filteredProducts.map((product) => (
              <li key={product.id}>
                <button
                  onClick={() => addToCart(product)}
                  className="w-full rounded border p-2 text-left hover:bg-gray-50"
                >
                  <div className="font-medium">{product.name}</div>
                  <div className="text-sm text-gray-500">GHS {product.retailPrice ?? "—"}</div>
                </button>
              </li>
            ))}
          </ul>

          <div className="rounded-lg border p-4">
            <h2 className="mb-3 font-medium">Cart</h2>
            {cart.length === 0 ? (
              <p className="text-gray-500">No items yet.</p>
            ) : (
              <ul className="mb-3 flex flex-col gap-1">
                {cart.map((line) => (
                  <li key={line.productId} className="flex justify-between text-sm">
                    <span>
                      {line.name} × {line.quantity}
                    </span>
                    <span>GHS {(line.unitPrice * line.quantity).toFixed(2)}</span>
                  </li>
                ))}
              </ul>
            )}
            <div className="mb-3 flex justify-between font-medium">
              <span>Total</span>
              <span>GHS {total.toFixed(2)}</span>
            </div>
            <button
              onClick={handleCheckout}
              disabled={cart.length === 0 || busy}
              className="w-full rounded bg-black px-4 py-2 text-white disabled:opacity-50"
            >
              Complete sale (cash)
            </button>
          </div>
        </>
      )}
    </main>
  );
}
