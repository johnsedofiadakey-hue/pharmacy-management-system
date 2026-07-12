"use client";

import Link from "next/link";
import { ShieldCheck, Truck, RotateCcw, Headphones } from "lucide-react";

const trustItems = [
  { icon: ShieldCheck, title: "Secure", copy: "100% safe & encrypted" },
  { icon: Truck, title: "Fast", copy: "Express delivery from your branch" },
  { icon: RotateCcw, title: "Easy Returns", copy: "Hassle-free within 7 days" },
  { icon: Headphones, title: "24/7 Support", copy: "We're here to help you" },
];

export function Footer() {
  return (
    <footer className="border-t border-[color:var(--border)] bg-white">
      {/* Trust strip */}
      <div className="page-wrap grid grid-cols-2 gap-6 py-8 md:grid-cols-4">
        {trustItems.map((item) => (
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

      {/* Copyright and links */}
      <div className="page-wrap flex flex-col items-center justify-between gap-4 border-t border-[color:var(--border)] py-6 text-xs text-[color:var(--muted)] sm:flex-row">
        <span>© {new Date().getFullYear()} Nexus Pharma. Licensed pharmacy operator in Ghana.</span>
        <div className="flex flex-wrap items-center gap-4">
          <Link href="/login" className="underline hover:text-[color:var(--secondary)]">
            Staff access
          </Link>
          <Link href="/store" className="underline hover:text-[color:var(--secondary)]">
            Shop
          </Link>
        </div>
      </div>
    </footer>
  );
}
