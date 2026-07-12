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
  PawPrint,
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

const trustStrip = [
  { icon: Truck, title: "Fast Delivery", copy: "Express delivery from your nearest branch" },
  { icon: ShieldCheck, title: "100% Genuine", copy: "Authentic medicines, guaranteed" },
  { icon: Stethoscope, title: "Health Consult", copy: "Pharmacist-reviewed guidance" },
  { icon: Tag, title: "Best Offers", copy: "Save more with regular deals" },
];

const shopByCategory = [
  { icon: Pill, label: "Medicines" },
  { icon: HeartPulse, label: "Health Products" },
  { icon: Sparkles, label: "Personal Care" },
  { icon: Baby, label: "Baby Care" },
  { icon: MonitorSmartphone, label: "Devices" },
  { icon: PawPrint, label: "Pet Care" },
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

      <PublicBranchEntry />

      {/* Split hero */}
      <section className="trust-hero">
        <div className="hero-grid" />
        <div className="page-wrap relative z-10 grid items-center gap-10 py-14 lg:grid-cols-2 lg:py-20">
          <div>
            <h1 className="font-display text-4xl font-bold leading-[1.1] text-[color:var(--secondary)] md:text-6xl">
              Your Health,
              <br />
              <span className="text-[color:var(--primary)]">Our Priority</span>
            </h1>
            <p className="mt-5 max-w-md text-lg text-[color:var(--muted)]">
              Trusted medicines, advanced care, delivered from the branch near you.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link href="/store" className="btn-primary inline-flex items-center gap-2 px-6 py-3.5 text-base">
                Shop Medicines <ArrowRight size={17} />
              </Link>
              <Link href="/store" className="btn-secondary inline-flex items-center gap-2 px-6 py-3.5 text-base">
                <FileUp size={17} /> Upload Prescription
              </Link>
            </div>
            <div className="mt-8 flex flex-wrap gap-x-8 gap-y-3 text-sm">
              <div>
                <div className="font-bold text-[color:var(--secondary)]">Trusted by</div>
                <div className="text-[color:var(--muted)]">2M+ Customers</div>
              </div>
              <div>
                <div className="font-bold text-[color:var(--secondary)]">Delivering to</div>
                <div className="text-[color:var(--muted)]">10,000+ Locations</div>
              </div>
              <div>
                <div className="font-bold text-[color:var(--secondary)]">Genuine Products</div>
                <div className="text-[color:var(--muted)]">100% Assured</div>
              </div>
            </div>
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
      <section className="page-wrap py-12">
        <div className="mb-6 flex items-end justify-between">
          <h2 className="font-display text-2xl font-bold text-[color:var(--secondary)]">Shop by Category</h2>
          <Link href="/store" className="inline-flex items-center gap-1 text-sm font-semibold text-[color:var(--primary)]">
            View all <ArrowRight size={14} />
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-6">
          {shopByCategory.map((cat) => (
            <a key={cat.label} href="/store" className="clinical-card service-pop flex flex-col items-center gap-2.5 p-5 text-center">
              <span className="icon-tile size-14">
                <cat.icon size={26} />
              </span>
              <span className="text-sm font-semibold text-[color:var(--secondary)]">{cat.label}</span>
            </a>
          ))}
        </div>
      </section>

      {/* Popular products */}
      <section className="page-wrap pb-14">
        <div className="mb-6 flex items-end justify-between">
          <h2 className="font-display text-2xl font-bold text-[color:var(--secondary)]">Popular Products</h2>
          <Link href="/store" className="inline-flex items-center gap-1 text-sm font-semibold text-[color:var(--primary)]">
            View all <ArrowRight size={14} />
          </Link>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
          {popularProducts.map((product) => (
            <div key={product.name} className="product-card overflow-hidden">
              <div className="product-media relative">
                {product.discount && <span className="discount-badge absolute left-3 top-3">{product.discount}</span>}
                <product.icon size={44} className="text-[color:var(--primary)]" />
              </div>
              <div className="p-4">
                <div className="line-clamp-2 text-sm font-semibold text-[color:var(--secondary)]">{product.name}</div>
                <div className="mt-1 text-xs text-[color:var(--muted)]">{product.size}</div>
                <div className="mt-3 flex items-center justify-between">
                  <div className="flex items-baseline gap-1.5">
                    <span className="font-bold tabular-nums text-[color:var(--secondary)]">GHS {product.price}</span>
                    {product.was && (
                      <span className="text-xs tabular-nums text-[color:var(--muted)] line-through">GHS {product.was}</span>
                    )}
                  </div>
                  <span className="cart-fab size-9">
                    <ShoppingCart size={16} />
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Prescription upload banner */}
      <section className="page-wrap pb-14">
        <div className="clinical-card flex flex-col items-center justify-between gap-5 bg-[color:var(--surface-muted)] p-7 sm:flex-row">
          <div className="flex items-center gap-4">
            <span className="icon-tile size-14 shrink-0">
              <FileUp size={26} />
            </span>
            <div>
              <div className="font-display text-lg font-bold text-[color:var(--secondary)]">
                Upload Prescription, Get Medicines Delivered
              </div>
              <p className="text-sm text-[color:var(--muted)]">Upload your prescription and we&apos;ll take care of the rest.</p>
            </div>
          </div>
          <Link href="/store" className="btn-primary inline-flex shrink-0 items-center gap-2 px-6 py-3">
            Upload Now <FileUp size={16} />
          </Link>
        </div>
      </section>

      <Footer />
    </main>
  );
}
