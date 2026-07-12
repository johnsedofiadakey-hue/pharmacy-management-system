import Link from "next/link";
import {
  Search,
  FileUp,
  ShoppingCart,
  Truck,
  ShieldCheck,
  Stethoscope,
  Tag,
  Pill,
  HeartPulse,
  Sparkles,
  Baby,
  MonitorSmartphone,
  Leaf,
  Zap,
  Moon,
  Dumbbell,
  ArrowRight,
} from "lucide-react";
import { Logo } from "@/components/Logo";
import { HeroIllustration } from "@/components/HeroIllustration";
import { PublicBranchEntry } from "@/components/PublicBranchEntry";
import { Footer } from "@/components/Footer";

const categoryLinks = [
  "Medicines",
  "Health Products",
  "Personal Care",
  "Baby Care",
  "Devices",
  "Pet Care",
  "Health Services",
  "Offers",
];

// Task-shortcut chips in the hero — customers arriving with a specific need
// jump straight to it instead of scrolling past marketing content first.
const shopByNeed = [
  { label: "Pain Relief", href: "/store" },
  { label: "Cold & Flu", href: "/store" },
  { label: "Vitamins", href: "/store" },
];

const trustStrip = [
  { icon: Truck, title: "Fast Delivery", copy: "Express delivery from your nearest branch" },
  { icon: ShieldCheck, title: "100% Genuine", copy: "Authentic medicines, guaranteed" },
  { icon: Stethoscope, title: "Health Consult", copy: "Pharmacist-reviewed guidance" },
  { icon: Tag, title: "Best Offers", copy: "Save more with regular deals" },
];

const shopByCategory = [
  { icon: Pill, label: "Medicines" },
  { icon: Leaf, label: "Vitamins & Supplements" },
  { icon: HeartPulse, label: "Health Products" },
  { icon: Sparkles, label: "Personal Care" },
  { icon: Baby, label: "Baby Care" },
  { icon: MonitorSmartphone, label: "Devices" },
];

const deals = [
  { title: "Vitamin Week", copy: "Up to 25% off all supplements", tag: "25% OFF", tone: "primary" as const },
  { title: "Wellness Bundle", copy: "Buy 2 get 1 free on the wellness range", tag: "B2G1", tone: "coral" as const },
  { title: "First Order", copy: "New customers get GHS 10 off checkout", tag: "GHS 10", tone: "sky" as const },
];

const dealTone = {
  primary: "bg-[color:var(--primary)]",
  coral: "bg-[color:var(--coral)]",
  sky: "bg-[color:var(--sky)]",
};

// Wellness/supplements range, framed for a younger, self-care-first customer.
const wellnessPicks = [
  { name: "Energy & Focus Gummies", size: "30 gummies", price: 38, was: 46, discount: "17% OFF", icon: Zap },
  { name: "Glow Collagen Powder", size: "150g", price: 79, was: null, discount: null, icon: Sparkles },
  { name: "Sleep & Calm Melatonin", size: "60 capsules", price: 42, was: 52, discount: "19% OFF", icon: Moon },
  { name: "Whey Protein Booster", size: "500g", price: 95, was: null, discount: null, icon: Dumbbell },
];

// Generic demo listings for the marketing page — no real brand names, no
// stock photos; each card renders an icon tile instead of a product photo.
const popularProducts = [
  { name: "Omega-3 Fish Oil Capsules", size: "60 capsules", price: 59.9, was: 74.9, discount: "20% OFF", icon: Pill },
  { name: "Pain & Fever Relief Tablets", size: "15 tablets", price: 12, was: null, discount: null, icon: Pill },
  { name: "Blood Glucose Monitor", size: "1 unit", price: 274, was: 349, discount: "15% OFF", icon: MonitorSmartphone },
  { name: "Gentle Skin Cleanser", size: "125ml", price: 34.9, was: null, discount: null, icon: Sparkles },
  { name: "Nutrition Support Powder", size: "200g", price: 67.5, was: 75, discount: "10% OFF", icon: HeartPulse },
];

function ProductGrid({ products }: { products: typeof popularProducts }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-5">
      {products.map((product) => (
        <div key={product.name} className="product-card overflow-hidden">
          <div className="product-media relative">
            {product.discount && (
              <span className="discount-badge absolute left-2 top-2 sm:left-3 sm:top-3">{product.discount}</span>
            )}
            <product.icon size={44} className="size-8 text-[color:var(--primary)] sm:size-11" />
          </div>
          <div className="p-2.5 sm:p-4">
            <div className="line-clamp-2 text-xs font-semibold text-[color:var(--secondary)] sm:text-sm">
              {product.name}
            </div>
            <div className="mt-0.5 text-[10px] text-[color:var(--muted)] sm:mt-1 sm:text-xs">{product.size}</div>
            <div className="mt-2 flex items-center justify-between sm:mt-3">
              <div className="flex items-baseline gap-1 sm:gap-1.5">
                <span className="text-sm font-bold tabular-nums text-[color:var(--secondary)] sm:text-base">
                  GHS {product.price}
                </span>
                {product.was && (
                  <span className="text-[10px] tabular-nums text-[color:var(--muted)] line-through sm:text-xs">
                    GHS {product.was}
                  </span>
                )}
              </div>
              <span className="cart-fab size-7 sm:size-9">
                <ShoppingCart size={14} className="size-3.5 sm:size-4" />
              </span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function Home() {
  return (
    <main className="app-shell">
      {/* Icon-led utility bar */}
      <header className="sticky top-0 z-30 border-b border-[color:var(--border)] bg-white/95 backdrop-blur">
        <div className="page-wrap flex flex-wrap items-center gap-3 py-3.5 md:flex-nowrap md:gap-4">
          <Logo />
          <nav className="ml-auto flex items-center gap-5 text-xs font-medium text-[color:var(--secondary)] md:order-3">
            <Link href="/store" className="relative flex flex-col items-center gap-1">
              <ShoppingCart size={20} />
              <span className="absolute -right-1.5 -top-1 grid size-4 place-items-center rounded-full bg-[color:var(--primary)] text-[10px] font-bold text-white">
                0
              </span>
              Cart
            </Link>
          </nav>
          {/* Search links to the storefront, where live search actually runs — always
              visible (not just md+) since search is core mobile behaviour, not decoration. */}
          <Link
            href="/store"
            className="field-pill order-last flex w-full items-center gap-2 px-4 py-2.5 md:order-2 md:w-auto md:flex-1"
          >
            <Search size={18} className="shrink-0 text-[color:var(--muted)]" />
            <span className="text-sm text-[color:var(--muted)]">Search medicines, health products...</span>
          </Link>
        </div>
        <div className="page-wrap flex gap-6 overflow-x-auto border-t border-[color:var(--border)] py-2.5 text-sm font-medium text-[color:var(--secondary)]">
          {categoryLinks.map((item) => (
            <Link key={item} href="/store" className="shrink-0 hover:text-[color:var(--primary)]">
              {item}
            </Link>
          ))}
        </div>
      </header>

      {/* Location resolution comes first, above the marketing hero — fulfilment
          (where/how fast) is the anxiety a pharmacy visitor needs resolved
          before anything else, not after scrolling past brand copy. */}
      <PublicBranchEntry />

      {/* Split hero */}
      <section className="trust-hero">
        <div className="hero-grid" />
        <div className="page-wrap relative z-10 grid items-center gap-10 py-10 lg:grid-cols-2 lg:py-16">
          <div>
            <h1 className="font-display text-4xl font-bold leading-[1.1] text-[color:var(--secondary)] md:text-6xl">
              Your Health,
              <br />
              <span className="text-[color:var(--primary)]">Our Priority</span>
            </h1>
            <p className="mt-5 max-w-md text-lg text-[color:var(--muted)]">
              Trusted medicines, advanced care, delivered from the branch near you.
            </p>

            {/* Shop-by-need shortcuts — task-first, for customers who already know what they need */}
            <div className="mt-5 flex flex-wrap gap-2">
              {shopByNeed.map((item) => (
                <Link key={item.label} href={item.href} className="btn-secondary px-4 py-2 text-sm">
                  {item.label}
                </Link>
              ))}
            </div>

            <div className="mt-5 flex flex-wrap gap-3">
              <Link href="/store" className="btn-primary inline-flex items-center gap-2 px-6 py-3.5 text-base">
                Shop Medicines <ArrowRight size={17} />
              </Link>
              <Link href="/store" className="btn-primary inline-flex items-center gap-2 px-6 py-3.5 text-base">
                <FileUp size={17} /> Upload Prescription
              </Link>
            </div>

            {/* Thin trust line in the hero — the fuller version lives in the
                strip below, after the customer has already found their branch. */}
            <p className="mt-6 text-sm text-[color:var(--muted)]">
              Trusted by 2M+ customers · 100% genuine medicines · Pharmacist-reviewed
            </p>
          </div>
          <HeroIllustration />
        </div>
      </section>

      {/* Trust strip */}
      <section className="page-wrap -mt-6 pb-4">
        <div className="clinical-card grid grid-cols-2 gap-6 p-6 md:grid-cols-4">
          {trustStrip.map((item) => (
            <div key={item.title} className="flex items-center gap-3">
              <span className="icon-tile size-11 shrink-0">
                <item.icon size={20} />
              </span>
              <div className="min-w-0">
                <div className="text-sm font-semibold text-[color:var(--secondary)]">{item.title}</div>
                <div className="text-xs text-[color:var(--muted)] md:truncate">{item.copy}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Shop by category */}
      <section className="page-wrap py-10 sm:py-12">
        <div className="mb-5 flex items-end justify-between sm:mb-6">
          <h2 className="font-display text-xl font-bold text-[color:var(--secondary)] sm:text-2xl">
            Shop by Category
          </h2>
          <Link href="/store" className="inline-flex items-center gap-1 text-sm font-semibold text-[color:var(--primary)]">
            View all <ArrowRight size={14} />
          </Link>
        </div>
        <div className="grid grid-cols-3 gap-2.5 sm:gap-3 md:grid-cols-6">
          {shopByCategory.map((cat) => (
            <a
              key={cat.label}
              href="/store"
              className="clinical-card service-pop flex flex-col items-center gap-2 p-3 text-center sm:gap-2.5 sm:p-5"
            >
              <span className="icon-tile size-10 sm:size-14">
                <cat.icon size={26} className="size-5 sm:size-6" />
              </span>
              <span className="text-xs font-semibold text-[color:var(--secondary)] sm:text-sm">{cat.label}</span>
            </a>
          ))}
        </div>
      </section>

      {/* Deals & offers — promotional cut cards */}
      <section className="page-wrap pb-10 sm:pb-12">
        <div className="mb-5 flex items-center justify-between sm:mb-6">
          <h2 className="font-display text-xl font-bold text-[color:var(--secondary)] sm:text-2xl">
            Deals & Offers
          </h2>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {deals.map((deal) => (
            <Link
              key={deal.title}
              href="/store"
              className={`${dealTone[deal.tone]} service-pop flex items-center justify-between gap-3 rounded-2xl p-5 text-white`}
            >
              <div>
                <div className="font-display text-lg font-bold">{deal.title}</div>
                <p className="mt-1 text-sm text-white/85">{deal.copy}</p>
              </div>
              <span className="shrink-0 rounded-full bg-white/20 px-3 py-1.5 text-sm font-bold">{deal.tag}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* Wellness & supplements — promoted for a younger, self-care-first audience */}
      <section className="bg-[color:var(--surface-muted)] py-10 sm:py-12">
        <div className="page-wrap">
          <div className="mb-5 flex items-end justify-between sm:mb-6">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-[color:var(--primary)]">
                For your daily routine
              </p>
              <h2 className="font-display mt-1 text-xl font-bold text-[color:var(--secondary)] sm:text-2xl">
                Wellness & Supplements
              </h2>
              <p className="mt-1 text-sm text-[color:var(--muted)]">
                Energy, focus, sleep, and fitness essentials — build your routine.
              </p>
            </div>
            <Link href="/store" className="hidden shrink-0 items-center gap-1 text-sm font-semibold text-[color:var(--primary)] sm:inline-flex">
              View all <ArrowRight size={14} />
            </Link>
          </div>
          <ProductGrid products={wellnessPicks} />
        </div>
      </section>

      {/* Popular products */}
      <section className="page-wrap py-10 sm:py-14">
        <div className="mb-5 flex items-end justify-between sm:mb-6">
          <h2 className="font-display text-xl font-bold text-[color:var(--secondary)] sm:text-2xl">
            Popular Products
          </h2>
          <Link href="/store" className="inline-flex items-center gap-1 text-sm font-semibold text-[color:var(--primary)]">
            View all <ArrowRight size={14} />
          </Link>
        </div>
        <ProductGrid products={popularProducts} />
      </section>

      {/* Prescription upload banner */}
      <section className="page-wrap pb-10 sm:pb-14">
        <div className="clinical-card flex flex-col items-center justify-between gap-5 bg-[color:var(--surface-muted)] p-5 sm:flex-row sm:p-7">
          <div className="flex items-center gap-4">
            <span className="icon-tile size-12 shrink-0 sm:size-14">
              <FileUp size={26} className="size-5 sm:size-6" />
            </span>
            <div>
              <div className="font-display text-base font-bold text-[color:var(--secondary)] sm:text-lg">
                Upload Prescription, Get Medicines Delivered
              </div>
              <p className="text-sm text-[color:var(--muted)]">Upload your prescription and we&apos;ll take care of the rest.</p>
            </div>
          </div>
          <Link href="/store" className="btn-primary inline-flex w-full shrink-0 items-center justify-center gap-2 px-6 py-3 sm:w-auto">
            Upload Now <FileUp size={16} />
          </Link>
        </div>
      </section>

      <Footer />
    </main>
  );
}
