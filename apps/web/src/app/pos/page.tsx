"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  listBranches,
  listProducts,
  openTill,
  closeTill,
  createSale,
  type Branch,
  type Product,
  type TillSession,
  type Sale,
} from "@/lib/firebase/callables";
import {
  getQueuedSales,
  queueSale,
  removeQueuedSale,
  isNetworkError,
  type QueuedSale,
} from "@/lib/offlineSalesQueue";
import { Receipt } from "@/components/Receipt";

type CartLine = { productId: string; name: string; quantity: number; unitPrice: number };

// Phase 3 skeleton, hardened in Phase 12 — branch is manually selected rather
// than auto-detected from the cashier's assigned branch (that needs the
// Firestore mirror-doc read, a follow-up). Not yet exercisable end-to-end
// without a real Firebase/Supabase project (see phase build logs).
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
  const [queuedCount, setQueuedCount] = useState(0);
  const [isOnline, setIsOnline] = useState(true);
  const [lastSale, setLastSale] = useState<Sale | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

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

  // Barcode scanners act as fast keyboard input — keep the search box
  // focused by default so a scan lands there without the cashier clicking
  // first (BLUEPRINT.md §51).
  useEffect(() => {
    searchInputRef.current?.focus();
  }, [tillSession]);

  useEffect(() => {
    setIsOnline(navigator.onLine);
    setQueuedCount(getQueuedSales().length);

    function handleOnline() {
      setIsOnline(true);
      drainQueue();
    }
    function handleOffline() {
      setIsOnline(false);
    }
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    drainQueue();
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function drainQueue() {
    const queue = getQueuedSales();
    for (const item of queue) {
      try {
        await createSale(item.payload);
        removeQueuedSale(item.localId);
      } catch (err) {
        if (!isNetworkError(err)) {
          // A queued sale that now fails for a business reason (e.g. stock
          // changed while offline) — drop it rather than retry forever;
          // the cashier already moved on and this needs human review, not
          // a silent infinite retry.
          removeQueuedSale(item.localId);
        }
        break;
      }
    }
    setQueuedCount(getQueuedSales().length);
  }

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

  // A scanner types the barcode then sends Enter — if it's an exact barcode
  // match, add it straight to the cart instead of leaving it in the search box.
  function handleSearchKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key !== "Enter") return;
    const exactMatch = products.find((p) => p.barcode && p.barcode === search.trim());
    if (exactMatch) {
      addToCart(exactMatch);
      setSearch("");
    }
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

    const saleInput = {
      branchId,
      tillSessionId: tillSession.id,
      items: cart.map((line) => ({
        productId: line.productId,
        quantity: line.quantity,
        unitPrice: line.unitPrice,
      })),
      payments: [{ paymentMethod: "CASH" as const, amount: total }],
    };

    if (!navigator.onLine) {
      queueSale(saleInput);
      setQueuedCount(getQueuedSales().length);
      setMessage("Offline — sale queued and will sync automatically once back online.");
      setCart([]);
      setBusy(false);
      return;
    }

    try {
      const result = await createSale(saleInput);
      setMessage(`Sale completed: GHS ${result.data.sale.total}`);
      setLastSale(result.data.sale);
      setCart([]);
    } catch (err) {
      if (isNetworkError(err)) {
        queueSale(saleInput);
        setQueuedCount(getQueuedSales().length);
        setMessage("Network unreachable — sale queued and will sync automatically.");
        setCart([]);
      } else {
        setError(err instanceof Error ? err.message : "Checkout failed.");
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
    <main className="mx-auto max-w-3xl p-8 print:hidden">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">POS</h1>
        <div className="flex items-center gap-2 text-sm">
          {!isOnline && <span className="rounded bg-yellow-100 px-2 py-1 text-yellow-800">Offline</span>}
          {queuedCount > 0 && (
            <span className="rounded bg-blue-100 px-2 py-1 text-blue-800">
              {queuedCount} sale{queuedCount > 1 ? "s" : ""} queued
            </span>
          )}
        </div>
      </div>

      {error && <p className="mb-4 text-red-600">{error}</p>}
      {message && <p className="mb-4 text-green-700">{message}</p>}
      {lastSale && (
        <button onClick={() => window.print()} className="mb-4 rounded border px-3 py-1 text-sm">
          Print last receipt
        </button>
      )}

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
            ref={searchInputRef}
            placeholder="Scan barcode or search product name..."
            className="mb-3 w-full rounded border px-3 py-2"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={handleSearchKeyDown}
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
    {lastSale && <Receipt sale={lastSale} />}
    </>
  );
}
