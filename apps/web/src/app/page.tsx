import Link from "next/link";
import { PublicBranchEntry } from "@/components/PublicBranchEntry";

const heroHighlights = [
  { label: "15 min", value: "pickup prep" },
  { label: "24/7", value: "order tracking" },
  { label: "Rx", value: "pharmacist review" },
];

const careServices = [
  {
    title: "Prescription review",
    copy: "Upload or bring prescriptions for pharmacist checks before fulfilment.",
    accent: "bg-[color:var(--primary)]",
  },
  {
    title: "Care attention",
    copy: "Vitals, consultations, follow-ups, and chronic-care support at enabled branches.",
    accent: "bg-[color:var(--accent)]",
  },
  {
    title: "Fast delivery",
    copy: "Closest-branch routing helps customers get essential medicines with fewer delays.",
    accent: "bg-[color:var(--sun)]",
  },
  {
    title: "Refill reminders",
    copy: "Customers can build a reliable refill habit for long-term medication needs.",
    accent: "bg-[color:var(--sky)]",
  },
];

const productFamilies = [
  "Pain & fever relief",
  "Cold and flu care",
  "Vitamins and wellness",
  "Baby and family care",
  "Skin and personal care",
  "Chronic care refills",
];

const campaignCards = [
  { title: "Weekend wellness basket", copy: "Bundle vitamins, oral care, and first-aid essentials for the home.", tone: "bg-[#f7ecd9]" },
  { title: "Pharmacist quick check", copy: "Customers can choose pharmacist-led guidance before checkout.", tone: "bg-[#eef1e3]" },
  { title: "Delivery from your nearest branch", copy: "Location-aware branch selection keeps fulfilment local and clear.", tone: "bg-[#eef0ee]" },
];

export default function Home() {
  return (
    <main className="app-shell overflow-hidden">
      <section className="trust-hero relative min-h-[88vh] text-white">
        <div className="hero-rhythm" />
        <div className="page-wrap relative z-10 flex min-h-[88vh] flex-col justify-between py-6">
          <nav className="flex items-center justify-between">
            <Link href="/" className="text-xl font-semibold">
              Nexus Pharma
            </Link>
            <div className="flex items-center gap-4 text-sm">
              <Link href="/store" className="hidden font-medium hover:underline sm:inline">
                Shop
              </Link>
              <Link href="#services" className="hidden font-medium hover:underline sm:inline">
                Services
              </Link>
              <Link href="#login" className="rounded bg-white px-4 py-2 font-semibold text-[color:var(--primary)]">
                Find branch
              </Link>
              <Link href="/login" className="hidden text-xs text-white/68 underline sm:inline">
                Admin
              </Link>
            </div>
          </nav>

          <div className="grid items-end gap-8 pb-12 pt-20 lg:grid-cols-[1fr_380px]">
            <div>
              <div className="mb-4 flex flex-wrap gap-2">
                <span className="status-pill bg-white/90 text-[color:var(--primary-strong)]">Licensed pharmacy care</span>
                <span className="status-pill bg-white/20 text-white">Closest-branch fulfilment</span>
                <span className="status-pill bg-white/20 text-white">Fast delivery workflow</span>
              </div>
              <h1 className="font-display max-w-3xl text-4xl font-semibold leading-tight md:text-6xl">
                Warm, trusted pharmacy care delivered from the branch near you.
              </h1>
              <p className="mt-5 max-w-2xl text-lg text-white/88">
                Shop essentials, request pharmacist support, manage refills, and move from product discovery to checkout with fewer steps.
              </p>
              <div className="mt-7 flex flex-wrap gap-3">
                <Link href="/store" className="rounded bg-white px-5 py-3 font-semibold text-[color:var(--primary)]">
                  Shop medicines
                </Link>
                <Link href="#login" className="rounded border border-white/60 px-5 py-3 font-semibold text-white">
                  Find closest branch
                </Link>
              </div>
            </div>

            <div className="delivery-card rounded-lg border border-white/22 bg-white/16 p-5 backdrop-blur">
              <p className="text-xs font-semibold uppercase text-white/72">Today&apos;s care path</p>
              <div className="mt-5 space-y-4">
                {["Choose branch", "Add products", "Pharmacist safety check", "Pickup or delivery"].map((step, index) => (
                  <div key={step} className="flex items-center gap-3">
                    <span className="grid size-9 place-items-center rounded-full bg-white text-sm font-bold text-[color:var(--primary)]">
                      {index + 1}
                    </span>
                    <span className="text-sm font-semibold">{step}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="grid gap-3 pb-10 md:grid-cols-3">
            {heroHighlights.map((item) => (
              <div key={item.label} className="rounded-lg border border-white/22 bg-white/14 p-4 backdrop-blur">
                <div className="text-2xl font-semibold">{item.label}</div>
                <div className="mt-1 text-sm text-white/78">{item.value}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="services" className="page-wrap py-14">
        <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <p className="text-sm font-semibold uppercase text-[color:var(--primary)]">Customer services</p>
            <h2 className="font-display mt-2 max-w-2xl text-3xl font-semibold text-[color:var(--secondary)]">
              Services customers actually come back for.
            </h2>
          </div>
          <Link href="/store" className="btn-primary w-fit px-5 py-3">
            Start an order
          </Link>
        </div>

        <div className="grid gap-3 md:grid-cols-4">
          {careServices.map((service) => (
            <article key={service.title} className="clinical-card service-pop rounded-xl p-5">
              <div className={`mb-5 h-2 w-14 rounded-full ${service.accent}`} />
              <h3 className="text-lg font-semibold text-[color:var(--secondary)]">{service.title}</h3>
              <p className="mt-3 text-sm text-[color:var(--muted)]">{service.copy}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="bg-white py-14">
        <div className="page-wrap grid gap-8 lg:grid-cols-[0.8fr_1.2fr]">
          <div>
            <p className="text-sm font-semibold uppercase text-[color:var(--primary)]">Professional product display</p>
            <h2 className="font-display mt-2 text-3xl font-semibold text-[color:var(--secondary)]">
              Medicines arranged around how customers shop.
            </h2>
            <p className="mt-4 text-[color:var(--muted)]">
              The storefront groups products into practical pharmacy categories, separates prescription review from quick-add items, and keeps the cart visible.
            </p>
          </div>
          <div className="product-marquee rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-muted)] p-4">
            <div className="marquee-track">
              {[...productFamilies, ...productFamilies].map((item, index) => (
                <span key={`${item}-${index}`} className="rounded-full bg-white px-4 py-3 text-sm font-semibold text-[color:var(--secondary)] shadow-sm">
                  {item}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="page-wrap py-14">
        <div className="grid gap-3 md:grid-cols-3">
          {campaignCards.map((card) => (
            <article key={card.title} className={`${card.tone} rounded-xl border border-[color:var(--border)] p-6`}>
              <p className="text-xs font-semibold uppercase text-[color:var(--primary)]">Featured</p>
              <h3 className="mt-3 text-xl font-semibold text-[color:var(--secondary)]">{card.title}</h3>
              <p className="mt-3 text-sm text-[color:var(--muted)]">{card.copy}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="bg-[color:var(--secondary)] pt-12 text-white">
        <div className="page-wrap grid gap-8 pb-20 md:grid-cols-3">
          <div>
            <h2 className="font-display text-2xl font-semibold">A pharmacy system with real operational muscle.</h2>
            <p className="mt-3 text-sm text-white/72">
              Super Admins manage branches, branch managers run teams, pharmacists review care, and customers get a polished storefront.
            </p>
          </div>
          <div className="text-sm text-white/74">
            <div className="font-semibold text-white">Safety signals</div>
            <p className="mt-2">Batch-aware inventory, restricted-medicine gates, audit logs, and pharmacist-controlled workflows.</p>
          </div>
          <div className="text-sm text-white/74">
            <div className="font-semibold text-white">Reliable fulfilment</div>
            <p className="mt-2">Nearest branch selection, pickup, delivery assignment, customer history, and live operational dashboards.</p>
          </div>
        </div>
      </section>

      <PublicBranchEntry />
    </main>
  );
}
