"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Search, MapPin, ShoppingBag, ShoppingCart, Pill, HeartPulse, Sparkles, Baby, Stethoscope, Phone, UserCircle } from "lucide-react";
import { Logo } from "@/components/Logo";
import { PublicBrandTheme } from "@/components/PublicBrandTheme";
import { useAuth } from "@/lib/firebase/authContext";
import {
  publicListProducts,
  publicListBranches,
  placeOrder,
  initializePaystackPayment,
  type PublicProduct,
  type PublicBranch,
} from "@/lib/firebase/callables";
import { useStoredCart } from "@/lib/useStoredCart";
import { useTenantBranding } from "@/lib/tenant/useTenantBranding";
import { showcaseBranches, showcaseProducts } from "@/lib/showcaseData";
import { Alert, Badge, Button, EmptyState, Select, SkeletonGrid } from "@/components/ui";
import { Footer } from "@/components/Footer";

type StorePaymentMethod = "CASH" | "MOMO" | "CARD" | "BANK_TRANSFER";

const baseCategories = ["All", "Pain & fever", "Cold & flu", "Vitamins", "Baby care", "Personal care", "Prescription review"];

function productCategory(product: PublicProduct): string {
  if (product.storefrontCategoryName) return product.storefrontCategoryName;
  if (product.category?.name) return product.category.name;
  const name = `${product.name} ${product.genericName ?? ""} ${product.brandName ?? ""}`.toLowerCase();
  if (product.prescriptionClassification === "RESTRICTED" || product.prescriptionClassification === "POM") return "Prescription review";
  if (/(pain|fever|para|ibuprofen|diclofenac|analgesic)/.test(name)) return "Pain & fever";
  if (/(cold|flu|cough|catarrh|sinus|throat)/.test(name)) return "Cold & flu";
  if (/(vitamin|supplement|zinc|iron|calcium|omega)/.test(name)) return "Vitamins";
  if (/(baby|infant|diaper|nappy|child|kids)/.test(name)) return "Baby care";
  if (/(soap|cream|lotion|sanitizer|tooth|skin|hair)/.test(name)) return "Personal care";
  return "All";
}

const categoryIcon: Record<string, typeof Pill> = {
  All: Pill,
  "Pain & fever": Pill,
  "Cold & flu": Stethoscope,
  Vitamins: HeartPulse,
  "Baby care": Baby,
  "Personal care": Sparkles,
  "Prescription review": Stethoscope,
};

function distanceKm(a: { lat: number; lng: number }, branch: PublicBranch): number | null {
  if (branch.gpsLat == null || branch.gpsLng == null) return null;
  const earthKm = 6371;
  const dLat = ((branch.gpsLat - a.lat) * Math.PI) / 180;
  const dLng = ((branch.gpsLng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (branch.gpsLat * Math.PI) / 180;
  const hav =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return earthKm * 2 * Math.atan2(Math.sqrt(hav), Math.sqrt(1 - hav));
}

export default function StorePage() {
  const { user } = useAuth();
  const { organisationId, branding, loading: tenantLoading, error: tenantError } = useTenantBranding();
  const [products, setProducts] = useState<PublicProduct[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [branches, setBranches] = useState<PublicBranch[]>([]);
  const { cart, addLine, setQuantity, removeLine, clearCart, total } = useStoredCart("store_cart_v1");
  const [branchId, setBranchId] = useState("");
  const [fulfilmentType, setFulfilmentType] = useState<"PICKUP" | "DELIVERY">("PICKUP");
  const [paymentMethod, setPaymentMethod] = useState<StorePaymentMethod>("CASH");
  const [guestPhone, setGuestPhone] = useState("");
  const [guestName, setGuestName] = useState("");
  const [category, setCategory] = useState("All");
  const [search, setSearch] = useState("");
  const [nearestMessage, setNearestMessage] = useState<string | null>(null);
  const [distances, setDistances] = useState<Record<string, number>>({});
  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [usingShowcaseFallback, setUsingShowcaseFallback] = useState(false);

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    if (tenantLoading) {
      return;
    }

    if (!organisationId) {
      setError(tenantError ?? "No organisation is configured for this storefront.");
      setLoadingProducts(false);
      return;
    }

    setError(null);
    setUsingShowcaseFallback(false);
    setLoadingProducts(true);
    publicListProducts(organisationId)
      .then((r) => setProducts(r.data.products))
      .catch(() => {
        setProducts(showcaseProducts);
        setUsingShowcaseFallback(true);
      })
      .finally(() => setLoadingProducts(false));
    publicListBranches(organisationId)
      .then((r) => {
        setBranches(r.data.branches);
        const savedBranchId = window.localStorage.getItem("selectedBranchId");
        const fallbackBranchId = r.data.branches[0]?.id ?? "";
        setBranchId(r.data.branches.some((branch) => branch.id === savedBranchId) ? savedBranchId ?? "" : fallbackBranchId);
      })
      .catch((err) => {
        console.error("Failed to load branches:", err);
        setBranches(showcaseBranches);
        setBranchId(showcaseBranches[0]?.id ?? "");
        window.localStorage.setItem("selectedBranchId", showcaseBranches[0]?.id ?? "");
        setUsingShowcaseFallback(true);
      });
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [organisationId, tenantError, tenantLoading]);

  function addToCart(product: PublicProduct) {
    addLine({ productId: product.id, name: product.name, unitPrice: Number(product.retailPrice ?? 0) });
  }

  const visibleProducts = useMemo(() => {
    const q = search.trim().toLowerCase();
    return products
      .filter((product) => category === "All" || productCategory(product) === category)
      .filter(
        (product) =>
          !q ||
          product.name.toLowerCase().includes(q) ||
          product.genericName?.toLowerCase().includes(q) ||
          product.brandName?.toLowerCase().includes(q)
      )
      .sort((a, b) => {
        if (a.prescriptionClassification === "OTC" && b.prescriptionClassification !== "OTC") return -1;
        if (a.prescriptionClassification !== "OTC" && b.prescriptionClassification === "OTC") return 1;
        return a.name.localeCompare(b.name);
      });
  }, [products, category, search]);

  const cartCount = cart.reduce((sum, l) => sum + l.quantity, 0);
  const selectedBranch = branches.find((b) => b.id === branchId);
  const categoryOptions = useMemo(
    () => Array.from(new Set(baseCategories.concat(products.map(productCategory).filter((item) => item !== "All")))),
    [products]
  );

  function selectNearestBranch() {
    if (!navigator.geolocation) {
      setNearestMessage("Location is not available in this browser.");
      return;
    }
    setNearestMessage("Finding the closest branch...");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const customerLocation = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };
        const ranked = branches
          .map((branch) => ({ branch, distance: distanceKm(customerLocation, branch) }))
          .filter((item): item is { branch: PublicBranch; distance: number } => item.distance != null)
          .sort((a, b) => a.distance - b.distance);
        if (!ranked[0]) {
          setNearestMessage("No branch coordinates are available yet. Please choose manually.");
          return;
        }
        setDistances(Object.fromEntries(ranked.map((item) => [item.branch.id, item.distance])));
        setBranchId(ranked[0].branch.id);
        window.localStorage.setItem("selectedBranchId", ranked[0].branch.id);
        setNearestMessage(`${ranked[0].branch.name} is closest — about ${ranked[0].distance.toFixed(1)} km away.`);
      },
      () => setNearestMessage("Location permission was not granted. Please choose manually."),
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 300000 }
    );
  }

  async function handleCheckout() {
    setError(null);
    setMessage(null);

    if (!user && !guestPhone.trim()) {
      setError("Enter a phone number so the branch can reach you.");
      return;
    }

    setPlacing(true);
    try {
      if (usingShowcaseFallback) {
        setMessage("Demo order placed. This showcase order is ready for client walkthrough; no live payment was taken.");
        clearCart();
        setGuestPhone("");
        setGuestName("");
        return;
      }

      const result = await placeOrder({
        branchId,
        fulfilmentType,
        paymentMethod,
        items: cart.map((l) => ({ productId: l.productId, quantity: l.quantity })),
        guestPhone: user ? undefined : guestPhone.trim(),
        guestName: user ? undefined : guestName.trim() || undefined,
      });

      if (paymentMethod !== "CASH") {
        const paystack = await initializePaystackPayment({
          orderId: result.data.order.id,
          callbackUrl: `${window.location.origin}/store?placed=true`,
        });
        if (paystack.data.authorizationUrl) {
          clearCart();
          window.location.href = paystack.data.authorizationUrl;
          return;
        }
      }

      setMessage(`Order placed! Your order ID: ${result.data.order.id.slice(0, 8)}. The branch will contact you.`);
      clearCart();
      setGuestPhone("");
      setGuestName("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Checkout failed.");
    } finally {
      setPlacing(false);
    }
  }

  return (
    <main className="app-shell min-h-screen pb-12">
      <PublicBrandTheme />
      <header className="sticky top-0 z-30 border-b border-[color:var(--border)] bg-white/95 backdrop-blur">
        <div className="page-wrap flex flex-wrap items-center gap-3 py-3.5 md:flex-nowrap">
          <div className="flex items-center gap-2">
            <Link href="/" className="btn-ghost grid size-9 place-items-center rounded-full" aria-label="Back to home">
              <ArrowLeft size={18} />
            </Link>
            <Logo size="sm" brandName={branding.brandName} logoUrl={branding.logoUrl} />
          </div>
          <div className="field-pill order-last flex w-full items-center gap-2 px-4 py-2.5 md:order-none md:mx-4 md:flex-1">
            <Search size={17} className="shrink-0 text-[color:var(--muted)]" />
            <input
              type="search"
              placeholder="Search medicines, vitamins, brands..."
              aria-label="Search products"
              className="w-full bg-transparent text-sm outline-none placeholder:text-[color:var(--muted)]"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="ml-auto flex shrink-0 items-center gap-3 text-sm">
            {user && (
              <Link href="/store/account" className="btn-ghost inline-flex items-center gap-1.5 px-3 py-2 text-xs">
                <UserCircle size={16} />
                Account
              </Link>
            )}
            <span className="relative text-[color:var(--secondary)] sm:inline-flex">
              <ShoppingCart size={22} />
              {cartCount > 0 && (
                <span className="absolute -right-1.5 -top-1.5 grid size-4 place-items-center rounded-full bg-[color:var(--primary)] text-[10px] font-bold text-white">
                  {cartCount}
                </span>
              )}
            </span>
          </div>
        </div>
      </header>

      {message && (
        <div className="page-wrap pt-4">
          <Alert tone="success">{message}</Alert>
        </div>
      )}

      <section className="page-wrap grid items-start gap-6 py-8 lg:grid-cols-[1fr_380px]">
        <div className="min-w-0">
          {error && <Alert tone="error" className="mb-4">{error}</Alert>}

          {/* Branch strip */}
          <div className="clinical-card flex flex-wrap items-center gap-3 p-4">
            <MapPin size={18} className="shrink-0 text-[color:var(--primary)]" />
            <div className="min-w-0 flex-1 text-sm">
              <span className="font-semibold text-[color:var(--secondary)]">
                {selectedBranch ? `Shopping from ${selectedBranch.name}` : "Choose your branch"}
              </span>
              {nearestMessage && <span className="ml-2 text-[color:var(--muted)]">{nearestMessage}</span>}
            </div>
            <Button variant="secondary" size="sm" onClick={selectNearestBranch}>
              Use my location
            </Button>
          </div>

          {/* Category chips */}
          <div className="mt-5 flex max-w-full gap-2 overflow-x-auto pb-2" role="tablist" aria-label="Product categories">
            {categoryOptions.map((item) => {
              const Icon = categoryIcon[item] ?? Pill;
              return (
                <button
                  key={item}
                  type="button"
                  role="tab"
                  aria-selected={item === category}
                  onClick={() => setCategory(item)}
                  className={
                    item === category
                      ? "btn-primary inline-flex shrink-0 items-center gap-1.5 px-4 py-2 text-sm"
                      : "btn-secondary inline-flex shrink-0 items-center gap-1.5 px-4 py-2 text-sm"
                  }
                >
                  <Icon size={14} /> {item}
                </button>
              );
            })}
          </div>

          {/* Product grid */}
          {loadingProducts ? (
            <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              <SkeletonGrid count={6} itemClassName="h-36" />
            </div>
          ) : visibleProducts.length === 0 ? (
            <div className="mt-6">
              <EmptyState
                title={search ? `No products match "${search}"` : "Catalogue is being prepared."}
                hint={
                  search
                    ? "Try a generic name (e.g. paracetamol) or a different category."
                    : "Products will appear here after branch stock and public pricing are published."
                }
                action={search ? <Button variant="secondary" size="sm" onClick={() => setSearch("")}>Clear search</Button> : undefined}
              />
            </div>
          ) : (
            <ul className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {visibleProducts.map((product) => {
                const restricted = product.prescriptionClassification === "RESTRICTED";
                const Icon = categoryIcon[productCategory(product)] ?? Pill;
                const imageUrl = product.storefrontImageUrl;
                return (
                  <li key={product.id} className="min-w-0">
                    <div className="product-card flex h-full flex-col overflow-hidden">
                      <div className="product-media relative">
                        <span className="absolute right-3 top-3">
                          <Badge tone={product.prescriptionClassification === "OTC" ? "safe" : "warn"}>
                            {product.prescriptionClassification === "OTC" ? "OTC" : "Rx"}
                          </Badge>
                        </span>
                        {imageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={imageUrl} alt={product.name} className="size-full object-cover" />
                        ) : (
                          <Icon size={40} className="text-[color:var(--primary)]" />
                        )}
                      </div>
                      <div className="flex flex-1 flex-col p-4">
                        <div className="truncate font-semibold text-[color:var(--secondary)]">{product.name}</div>
                        {(product.genericName || product.brandName) && (
                          <div className="truncate text-xs text-[color:var(--muted)]">
                            {product.genericName ?? product.brandName}
                          </div>
                        )}
                        <div className="mt-auto flex items-end justify-between gap-2 pt-4">
                          <div className="text-lg font-bold tabular-nums text-[color:var(--secondary)]">
                            {product.retailPrice != null ? `GHS ${product.retailPrice}` : "Ask in branch"}
                          </div>
                          {restricted ? (
                            <span className="max-w-32 text-right text-xs font-medium text-[color:var(--warning)]">
                              Rx required — visit a branch
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => addToCart(product)}
                              aria-label={`Add ${product.name} to cart`}
                              className="cart-fab size-9"
                            >
                              <ShoppingCart size={16} />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Cart / checkout */}
        <aside className="clinical-card h-fit min-w-0 p-5 lg:sticky lg:top-20">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div className="flex items-center gap-2">
              <ShoppingBag size={18} className="text-[color:var(--primary)]" />
              <h2 className="text-lg font-semibold text-[color:var(--secondary)]">Your order</h2>
            </div>
            <Badge tone={cartCount > 0 ? "safe" : "neutral"}>
              {cartCount} item{cartCount === 1 ? "" : "s"}
            </Badge>
          </div>

          {cart.length === 0 ? (
            <p className="text-sm text-[color:var(--muted)]">
              Your cart is empty — browse the catalogue and add products to get started.
            </p>
          ) : (
            <ul className="mb-4 flex flex-col gap-2.5 text-sm">
              {cart.map((l) => (
                <li key={l.productId} className="flex items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium text-[color:var(--secondary)]">{l.name}</div>
                    <div className="text-xs tabular-nums text-[color:var(--muted)]">
                      GHS {(l.unitPrice * l.quantity).toFixed(2)}
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <button
                      type="button"
                      aria-label={`Decrease quantity of ${l.name}`}
                      onClick={() => setQuantity(l.productId, l.quantity - 1)}
                      className="btn-secondary grid size-8 place-items-center text-base leading-none"
                    >
                      −
                    </button>
                    <span className="w-7 text-center font-semibold tabular-nums">{l.quantity}</span>
                    <button
                      type="button"
                      aria-label={`Increase quantity of ${l.name}`}
                      onClick={() => setQuantity(l.productId, l.quantity + 1)}
                      className="btn-secondary grid size-8 place-items-center text-base leading-none"
                    >
                      +
                    </button>
                    <button
                      type="button"
                      aria-label={`Remove ${l.name} from cart`}
                      onClick={() => removeLine(l.productId)}
                      className="ml-1 grid size-8 place-items-center rounded-lg text-[color:var(--muted)] hover:bg-[color:var(--danger-soft)] hover:text-[color:var(--danger)]"
                    >
                      ×
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}

          <div className="flex flex-col gap-3 border-t border-[color:var(--border)] pt-4">
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold uppercase tracking-wide text-[color:var(--muted)]">Branch</span>
              <Select
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
                    {distances[b.id] != null ? ` • ${distances[b.id].toFixed(1)} km` : ""}
                  </option>
                ))}
              </Select>
            </label>

            <div>
              <span className="text-xs font-semibold uppercase tracking-wide text-[color:var(--muted)]">Fulfilment</span>
              <div className="mt-1.5 grid grid-cols-2 gap-2 text-sm">
                {(["PICKUP", "DELIVERY"] as const).map((type) => (
                  <label
                    key={type}
                    className={`field flex cursor-pointer items-center justify-center gap-2 px-3 py-2.5 font-medium ${
                      fulfilmentType === type ? "border-[color:var(--primary)] bg-[color:var(--primary-soft)]" : ""
                    }`}
                  >
                    <input
                      type="radio"
                      name="fulfilment"
                      className="sr-only"
                      checked={fulfilmentType === type}
                      onChange={() => setFulfilmentType(type)}
                    />
                    {type === "PICKUP" ? "Pickup" : "Delivery"}
                  </label>
                ))}
              </div>
            </div>

            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold uppercase tracking-wide text-[color:var(--muted)]">Payment</span>
              <Select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value as StorePaymentMethod)}>
                <option value="CASH">Cash on pickup/delivery</option>
                {!user && (
                  <>
                    <option disabled>— Sign in for online payments —</option>
                    <option value="MOMO" disabled>Mobile money</option>
                    <option value="CARD" disabled>Card payment</option>
                    <option value="BANK_TRANSFER" disabled>Bank transfer</option>
                  </>
                )}
                {user && (
                  <>
                    <option value="MOMO">Mobile money</option>
                    <option value="CARD">Card payment</option>
                    <option value="BANK_TRANSFER">Bank transfer</option>
                  </>
                )}
              </Select>
              {!user && (
                <p className="text-xs text-[color:var(--muted)]">
                  Online payments require an account. Cash works for everyone.
                </p>
              )}
            </label>

            {!user && cart.length > 0 && (
              <div className="flex flex-col gap-2">
                <label className="flex flex-col gap-1.5">
                  <span className="text-xs font-semibold uppercase tracking-wide text-[color:var(--muted)]">
                    <Phone size={12} className="inline mr-1" />Phone number
                  </span>
                  <input
                    type="tel"
                    placeholder="e.g. 054 123 4567"
                    className="field px-3 py-2.5 text-sm"
                    value={guestPhone}
                    onChange={(e) => setGuestPhone(e.target.value)}
                  />
                </label>
                <label className="flex flex-col gap-1.5">
                  <span className="text-xs font-semibold uppercase tracking-wide text-[color:var(--muted)]">
                    Name (optional)
                  </span>
                  <input
                    type="text"
                    placeholder="Your name"
                    className="field px-3 py-2.5 text-sm"
                    value={guestName}
                    onChange={(e) => setGuestName(e.target.value)}
                  />
                </label>
              </div>
            )}

            <div className="flex justify-between text-base font-bold text-[color:var(--secondary)]">
              <span>Total</span>
              <span className="tabular-nums">GHS {total.toFixed(2)}</span>
            </div>

            <Button
              size="lg"
              onClick={handleCheckout}
              disabled={placing || cart.length === 0 || !branchId}
            >
              {placing ? "Placing order..." : "Place order"}
            </Button>
          </div>
        </aside>
      </section>

      <Footer />
    </main>
  );
}
