"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Search, WifiOff, Printer } from "lucide-react";
import {
  listBranches,
  listProducts,
  openTill,
  closeTill,
  createSale,
  getActiveTillSession,
  type Branch,
  type Product,
  type TillSession,
  type Sale,
  type PaymentMethodValue,
} from "@/lib/firebase/callables";
import {
  getQueuedSales,
  getFailedSales,
  queueSale,
  removeQueuedSale,
  markSaleFailed,
  retryFailedSale,
  discardFailedSale,
  isNetworkError,
  type QueuedSale,
} from "@/lib/offlineSalesQueue";
import { useStoredCart } from "@/lib/useStoredCart";
import { Alert, Badge, Button, EmptyState, Input, Select } from "@/components/ui";
import { Receipt } from "@/components/Receipt";

type PosPaymentMethod = Extract<PaymentMethodValue, "CASH" | "MOMO" | "CARD">;

// Phase 3 skeleton, hardened in Phase 12, redesigned as a true till layout:
// full-width split pane (products left, always-visible cart right), large
// touch targets, and single-tender payment selection (split tender is a
// backend capability the UI doesn't expose yet). The open till session is
// rehydrated from the backend on mount so a page refresh mid-shift doesn't
// forget a till that is still open server-side.
export default function PosPage() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [branchId, setBranchId] = useState("");
  const [tillSession, setTillSession] = useState<TillSession | null>(null);
  const [rehydrating, setRehydrating] = useState(true);
  const [openingFloat, setOpeningFloat] = useState("500");
  const [closingActual, setClosingActual] = useState("");
  const [search, setSearch] = useState("");
  const { cart, addLine, setQuantity, removeLine, clearCart, total } = useStoredCart("pos_cart_v1");
  const [paymentMethod, setPaymentMethod] = useState<PosPaymentMethod>("CASH");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [queuedCount, setQueuedCount] = useState(0);
  const [failedSales, setFailedSales] = useState<QueuedSale[]>([]);
  const [isOnline, setIsOnline] = useState(true);
  const [lastSale, setLastSale] = useState<Sale | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const cartPaneRef = useRef<HTMLElement>(null);

  useEffect(() => {
    (async () => {
      try {
        const [branchResult, productResult, activeResult] = await Promise.all([
          listBranches(),
          listProducts(),
          getActiveTillSession(),
        ]);
        setBranches(branchResult.data.branches);
        setProducts(productResult.data.products);
        const activeTill = activeResult.data.tillSession;
        if (activeTill) {
          setTillSession(activeTill);
          setBranchId(activeTill.branchId);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load data.");
      } finally {
        setRehydrating(false);
      }
    })();
  }, []);

  // Barcode scanners act as fast keyboard input — keep the search box
  // focused by default so a scan lands there without the cashier clicking
  // first (BLUEPRINT.md §51).
  useEffect(() => {
    searchInputRef.current?.focus();
  }, [tillSession]);

  async function drainQueue() {
    const queue = getQueuedSales();
    for (const item of queue) {
      try {
        await createSale(item.payload);
        removeQueuedSale(item.localId);
      } catch (err) {
        if (!isNetworkError(err)) {
          // A queued sale the backend now rejects for a business reason
          // (e.g. stock changed while offline). Never silently dropped —
          // it moves to a FAILED state that stays visible until a human
          // retries or deliberately discards it.
          markSaleFailed(item.localId, err instanceof Error ? err.message : "Rejected by the server.");
        }
        break;
      }
    }
    setQueuedCount(getQueuedSales().length);
    setFailedSales(getFailedSales());
  }

  useEffect(() => {
    // Initial online/queue state has to be read on the client after mount.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsOnline(navigator.onLine);
    setQueuedCount(getQueuedSales().length);
    setFailedSales(getFailedSales());

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
  }, []);

  function handleRetryFailed(localId: string) {
    retryFailedSale(localId);
    setFailedSales(getFailedSales());
    setQueuedCount(getQueuedSales().length);
    drainQueue();
  }

  function handleDiscardFailed(localId: string) {
    discardFailedSale(localId);
    setFailedSales(getFailedSales());
  }

  const filteredProducts = useMemo(() => {
    if (!search) return products;
    const q = search.toLowerCase();
    return products.filter(
      (p) => p.name.toLowerCase().includes(q) || p.barcode?.toLowerCase().includes(q)
    );
  }, [products, search]);

  function addToCart(product: Product) {
    addLine({ productId: product.id, name: product.name, unitPrice: Number(product.retailPrice ?? 0) });
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
      clientSaleId: crypto.randomUUID(),
      items: cart.map((line) => ({
        productId: line.productId,
        quantity: line.quantity,
        unitPrice: line.unitPrice,
      })),
      payments: [{ paymentMethod, amount: total }],
    };

    if (!navigator.onLine) {
      queueSale(saleInput);
      setQueuedCount(getQueuedSales().length);
      setMessage("Offline — sale queued and will sync automatically once back online.");
      clearCart();
      setBusy(false);
      return;
    }

    try {
      const result = await createSale(saleInput);
      setMessage(`Sale completed: GHS ${result.data.sale.total}`);
      setLastSale(result.data.sale);
      clearCart();
    } catch (err) {
      if (isNetworkError(err)) {
        queueSale(saleInput);
        setQueuedCount(getQueuedSales().length);
        setMessage("Network unreachable — sale queued and will sync automatically.");
        clearCart();
      } else {
        setError(err instanceof Error ? err.message : "Checkout failed.");
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <main className="flex min-h-screen flex-col print:hidden">
        {/* Till bar */}
        <div className="border-b border-[color:var(--border)] bg-white px-4 py-3 md:px-6">
          <div className="flex flex-wrap items-center gap-3">
            <Select
              className="min-w-44"
              value={branchId}
              onChange={(e) => setBranchId(e.target.value)}
              disabled={!!tillSession || rehydrating}
              aria-label="Branch"
            >
              <option value="">Select branch...</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </Select>

            {rehydrating ? (
              <span className="text-sm text-[color:var(--muted)]">Checking for an open till...</span>
            ) : !tillSession ? (
              <>
                <Input
                  type="number"
                  className="w-36"
                  placeholder="Opening float"
                  aria-label="Opening float"
                  value={openingFloat}
                  onChange={(e) => setOpeningFloat(e.target.value)}
                />
                <Button onClick={handleOpenTill} disabled={!branchId || busy}>
                  Open till
                </Button>
              </>
            ) : (
              <>
                <Badge tone="safe">Till open</Badge>
                <Input
                  type="number"
                  className="w-36"
                  placeholder="Closing actual"
                  aria-label="Closing actual cash"
                  value={closingActual}
                  onChange={(e) => setClosingActual(e.target.value)}
                />
                <Button variant="secondary" onClick={handleCloseTill} disabled={busy}>
                  Close till
                </Button>
              </>
            )}

            <div className="ml-auto flex items-center gap-2 text-sm">
              {!isOnline && (
                <span className="status-pill status-warn inline-flex items-center gap-1">
                  <WifiOff size={13} /> Offline
                </span>
              )}
              {queuedCount > 0 && (
                <Badge tone="info">
                  {queuedCount} queued
                </Badge>
              )}
              {failedSales.length > 0 && (
                <Badge tone="danger">
                  {failedSales.length} need review
                </Badge>
              )}
              {lastSale && (
                <Button variant="ghost" size="sm" onClick={() => window.print()}>
                  <span className="inline-flex items-center gap-1.5">
                    <Printer size={14} /> Last receipt
                  </span>
                </Button>
              )}
            </div>
          </div>

          {error && <Alert tone="error" className="mt-3">{error}</Alert>}
          {message && <Alert tone="success" className="mt-3">{message}</Alert>}

          {failedSales.length > 0 && (
            <div className="clinical-card mt-3 border-l-4 border-l-[color:var(--danger)] p-4">
              <h2 className="font-semibold text-[color:var(--secondary)]">Sales needing review</h2>
              <p className="mt-1 text-sm text-[color:var(--muted)]">
                These offline sales were rejected when syncing (e.g. stock changed while offline). They stay
                here until you retry or discard them — check with your manager before discarding.
              </p>
              <ul className="mt-3 flex flex-col gap-2">
                {failedSales.map((item) => (
                  <li
                    key={item.localId}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-[color:var(--danger-soft)] p-3 text-sm"
                  >
                    <div className="min-w-0">
                      <div className="font-medium text-[color:var(--secondary)]">
                        {item.payload.items.length} item{item.payload.items.length > 1 ? "s" : ""} — GHS{" "}
                        {item.payload.payments.reduce((sum, p) => sum + p.amount, 0).toFixed(2)} · queued{" "}
                        {new Date(item.queuedAt).toLocaleString()}
                      </div>
                      {item.failureReason && (
                        <div className="mt-0.5 text-xs text-[color:var(--danger)]">{item.failureReason}</div>
                      )}
                    </div>
                    <div className="flex shrink-0 gap-2">
                      <Button variant="secondary" size="sm" onClick={() => handleRetryFailed(item.localId)}>
                        Retry
                      </Button>
                      <button
                        onClick={() => handleDiscardFailed(item.localId)}
                        className="rounded-lg px-3 py-1 text-xs font-semibold text-[color:var(--danger)] hover:bg-red-100"
                      >
                        Discard
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {!tillSession && !rehydrating ? (
          <div className="flex flex-1 items-center justify-center p-8">
            <EmptyState
              title="Open a till to start selling"
              hint="Select your branch, confirm the opening float, and open the till. If you had a till open, it will be restored automatically."
            />
          </div>
        ) : tillSession ? (
          <div className="grid flex-1 gap-0 lg:grid-cols-[1fr_400px]">
            {/* Product pane */}
            <div className="min-w-0 p-4 md:p-6">
              <div className="field flex items-center gap-2 px-3 py-3">
                <Search size={18} className="shrink-0 text-[color:var(--muted)]" />
                <input
                  ref={searchInputRef}
                  placeholder="Scan barcode or search product name..."
                  aria-label="Scan barcode or search products"
                  className="w-full bg-transparent text-base outline-none placeholder:text-[color:var(--muted)]"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={handleSearchKeyDown}
                />
              </div>

              <ul className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
                {filteredProducts.map((product) => (
                  <li key={product.id} className="min-w-0">
                    <button
                      onClick={() => addToCart(product)}
                      className="clinical-card min-h-24 w-full p-3.5 text-left transition hover:-translate-y-0.5 hover:border-[color:var(--primary)] active:translate-y-0"
                    >
                      <div className="truncate font-semibold text-[color:var(--secondary)]">{product.name}</div>
                      <div className="mt-1.5 text-base font-bold tabular-nums text-[color:var(--primary-strong)]">
                        {product.retailPrice != null ? `GHS ${product.retailPrice}` : "—"}
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
              {filteredProducts.length === 0 && (
                <p className="mt-6 text-center text-sm text-[color:var(--muted)]">
                  No products match &quot;{search}&quot;.
                </p>
              )}
              {/* Below lg the cart pane sits under the product grid, not beside it —
                  this keeps the total and a way to reach checkout in view while
                  scrolling a long product list, instead of always-visible-beside. */}
              {cart.length > 0 && (
                <div className="sticky bottom-3 z-20 mt-4 lg:hidden">
                  <button
                    type="button"
                    onClick={() => cartPaneRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}
                    className="btn-primary flex w-full items-center justify-between px-5 py-3.5 shadow-lg"
                  >
                    <span>
                      {cart.reduce((sum, l) => sum + l.quantity, 0)} item
                      {cart.reduce((sum, l) => sum + l.quantity, 0) === 1 ? "" : "s"}
                    </span>
                    <span className="tabular-nums">Review & pay · GHS {total.toFixed(2)}</span>
                  </button>
                </div>
              )}
            </div>

            {/* Cart pane — always visible beside products at lg+; below the product
                grid (reached via the mobile sticky bar above) below lg. */}
            <aside
              ref={cartPaneRef}
              className="flex flex-col border-t border-[color:var(--border)] bg-white lg:sticky lg:top-0 lg:h-screen lg:border-l lg:border-t-0"
            >
              <div className="border-b border-[color:var(--border)] px-4 py-3">
                <h2 className="font-semibold text-[color:var(--secondary)]">Current sale</h2>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
                {cart.length === 0 ? (
                  <p className="py-8 text-center text-sm text-[color:var(--muted)]">
                    Scan or tap products to add them.
                  </p>
                ) : (
                  <ul className="flex flex-col gap-2.5">
                    {cart.map((line) => (
                      <li key={line.productId} className="flex items-center justify-between gap-3 text-sm">
                        <div className="min-w-0 flex-1">
                          <div className="truncate font-medium text-[color:var(--secondary)]">{line.name}</div>
                          <div className="text-xs tabular-nums text-[color:var(--muted)]">
                            GHS {(line.unitPrice * line.quantity).toFixed(2)}
                          </div>
                        </div>
                        <div className="flex shrink-0 items-center gap-1">
                          <button
                            type="button"
                            aria-label={`Decrease quantity of ${line.name}`}
                            onClick={() => setQuantity(line.productId, line.quantity - 1)}
                            className="btn-secondary grid size-10 place-items-center text-lg leading-none"
                          >
                            −
                          </button>
                          <span className="w-8 text-center text-base font-semibold tabular-nums">{line.quantity}</span>
                          <button
                            type="button"
                            aria-label={`Increase quantity of ${line.name}`}
                            onClick={() => setQuantity(line.productId, line.quantity + 1)}
                            className="btn-secondary grid size-10 place-items-center text-lg leading-none"
                          >
                            +
                          </button>
                          <button
                            type="button"
                            aria-label={`Remove ${line.name} from cart`}
                            onClick={() => removeLine(line.productId)}
                            className="ml-1 grid size-10 place-items-center rounded-lg text-[color:var(--muted)] hover:bg-[color:var(--danger-soft)] hover:text-[color:var(--danger)]"
                          >
                            ×
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="flex flex-col gap-3 border-t border-[color:var(--border)] px-4 py-4">
                <label className="flex flex-col gap-1.5">
                  <span className="text-xs font-semibold uppercase tracking-wide text-[color:var(--muted)]">
                    Payment method
                  </span>
                  <Select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value as PosPaymentMethod)}>
                    <option value="CASH">Cash</option>
                    <option value="MOMO">Mobile money</option>
                    <option value="CARD">Card</option>
                  </Select>
                </label>
                <div className="flex items-baseline justify-between">
                  <span className="text-sm font-semibold uppercase tracking-wide text-[color:var(--muted)]">Total</span>
                  <span className="text-3xl font-bold tabular-nums text-[color:var(--secondary)]">
                    GHS {total.toFixed(2)}
                  </span>
                </div>
                <Button size="lg" onClick={handleCheckout} disabled={cart.length === 0 || busy}>
                  {busy ? "Completing..." : "Complete sale"}
                </Button>
              </div>
            </aside>
          </div>
        ) : null}
      </main>
      {lastSale && <Receipt sale={lastSale} />}
    </>
  );
}
