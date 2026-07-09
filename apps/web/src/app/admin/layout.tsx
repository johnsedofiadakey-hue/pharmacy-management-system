import { RequireAuth } from "@/components/RequireAuth";
import Link from "next/link";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <RequireAuth>
      <div className="app-shell min-h-screen">
        <header className="border-b border-[color:var(--border)] bg-white/88">
          <div className="page-wrap flex flex-wrap items-center justify-between gap-3 py-4">
            <Link href="/" className="text-lg font-semibold text-[color:var(--secondary)]">
              Nexus Pharma Admin
            </Link>
            <nav className="flex flex-wrap gap-2 text-sm">
              <Link className="btn-secondary px-3 py-2" href="/admin/branches">Branches</Link>
              <Link className="btn-secondary px-3 py-2" href="/admin/company">Company</Link>
              <Link className="btn-secondary px-3 py-2" href="/admin/compliance">Compliance</Link>
              <Link className="btn-primary px-3 py-2" href="/branch/dashboard">Branch workspace</Link>
            </nav>
          </div>
        </header>
        {children}
      </div>
    </RequireAuth>
  );
}
