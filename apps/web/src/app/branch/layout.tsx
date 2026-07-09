import { RequireAuth } from "@/components/RequireAuth";
import Link from "next/link";

export default function BranchLayout({ children }: { children: React.ReactNode }) {
  return (
    <RequireAuth>
      <div className="app-shell min-h-screen">
        <header className="border-b border-[color:var(--border)] bg-white/88">
          <div className="page-wrap flex flex-wrap items-center justify-between gap-3 py-4">
            <Link href="/" className="text-lg font-semibold text-[color:var(--secondary)]">
              Branch Workspace
            </Link>
            <nav className="flex flex-wrap gap-2 text-sm">
              <Link className="btn-secondary px-3 py-2" href="/branch/dashboard">Dashboard</Link>
              <Link className="btn-secondary px-3 py-2" href="/branch/orders">Orders</Link>
              <Link className="btn-secondary px-3 py-2" href="/branch/pharmacist">Pharmacist</Link>
              <Link className="btn-secondary px-3 py-2" href="/branch/patients">Patients</Link>
              <Link className="btn-secondary px-3 py-2" href="/branch/reports">Reports</Link>
              <Link className="btn-primary px-3 py-2" href="/pos">POS</Link>
            </nav>
          </div>
        </header>
        {children}
      </div>
    </RequireAuth>
  );
}
