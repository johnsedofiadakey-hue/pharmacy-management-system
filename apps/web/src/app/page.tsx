import Link from "next/link";
import { PublicBranchEntry } from "@/components/PublicBranchEntry";

const productHighlights = [
  "Prescription review",
  "OTC essentials",
  "Wellness products",
  "Chronic care refills",
];

const serviceHighlights = [
  { label: "Fast branch pickup", value: "Ready orders with clear status updates" },
  { label: "Delivery coordination", value: "Rider assignment and branch fulfilment tracking" },
  { label: "Care attention", value: "Vitals, consultations, care plans, and follow-ups" },
];

export default function Home() {
  return (
    <main className="app-shell">
      <section className="trust-hero min-h-[86vh] text-white">
        <div className="page-wrap flex min-h-[86vh] flex-col justify-between py-6">
          <nav className="flex items-center justify-between">
            <Link href="/" className="text-xl font-semibold">
              Nexus Pharma
            </Link>
            <div className="flex items-center gap-3 text-sm">
              <Link href="/store" className="hidden font-medium hover:underline sm:inline">
                Storefront
              </Link>
              <Link href="#login" className="rounded bg-white px-4 py-2 font-semibold text-[color:var(--primary)]">
                Login
              </Link>
            </div>
          </nav>

          <div className="max-w-3xl pb-16 pt-20">
            <div className="mb-4 flex flex-wrap gap-2">
              <span className="status-pill bg-white/90 text-[color:var(--primary-strong)]">Licensed pharmacy OS</span>
              <span className="status-pill bg-white/20 text-white">Multi-branch ready</span>
              <span className="status-pill bg-white/20 text-white">Fast delivery workflow</span>
            </div>
            <h1 className="max-w-2xl text-4xl font-semibold leading-tight md:text-6xl">
              Pharmacy care that feels close, safe, and reliable.
            </h1>
            <p className="mt-5 max-w-xl text-lg text-white/88">
              Browse trusted medicines, choose your nearest branch, request delivery, and stay connected to pharmacist-led care.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link href="/store" className="rounded bg-white px-5 py-3 font-semibold text-[color:var(--primary)]">
                Shop products
              </Link>
              <Link href="#services" className="rounded border border-white/60 px-5 py-3 font-semibold text-white">
                View services
              </Link>
            </div>
          </div>

          <div className="grid gap-3 pb-12 md:grid-cols-3">
            {serviceHighlights.map((item) => (
              <div key={item.label} className="rounded-lg border border-white/22 bg-white/14 p-4 backdrop-blur">
                <div className="text-sm font-semibold">{item.label}</div>
                <div className="mt-1 text-sm text-white/78">{item.value}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="services" className="page-wrap py-14">
        <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr]">
          <div>
            <p className="text-sm font-semibold uppercase text-[color:var(--primary)]">Products and delivery</p>
            <h2 className="mt-2 text-3xl font-semibold text-[color:var(--secondary)]">
              Everyday medicines, clinical care, and fulfilment in one place.
            </h2>
            <p className="mt-4 text-[color:var(--muted)]">
              The system supports public browsing, customer accounts, pharmacist review, branch fulfilment, and care records without mixing customer data into public pages.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {productHighlights.map((item) => (
              <div key={item} className="clinical-card rounded-lg p-5">
                <div className="mb-6 h-1.5 w-12 rounded-full bg-[color:var(--accent)]" />
                <div className="text-lg font-semibold text-[color:var(--secondary)]">{item}</div>
                <p className="mt-2 text-sm text-[color:var(--muted)]">
                  Available through branch-managed stock, pharmacist safeguards, and clear order tracking.
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-[color:var(--secondary)] pt-12 text-white">
        <div className="page-wrap grid gap-8 pb-20 md:grid-cols-3">
          <div>
            <h2 className="text-2xl font-semibold">Built for trusted pharmacy operations.</h2>
            <p className="mt-3 text-sm text-white/72">
              Designed for branch managers, pharmacists, cashiers, delivery riders, customers, and patients.
            </p>
          </div>
          <div className="text-sm text-white/74">
            <div className="font-semibold text-white">Safety signals</div>
            <p className="mt-2">Batch-aware inventory, restricted-medicine gates, audit logs, and pharmacist-controlled care workflows.</p>
          </div>
          <div className="text-sm text-white/74">
            <div className="font-semibold text-white">Reliable fulfilment</div>
            <p className="mt-2">Branch pickup, delivery assignment, customer history, and live operational dashboards.</p>
          </div>
        </div>
      </section>

      <PublicBranchEntry />
    </main>
  );
}
