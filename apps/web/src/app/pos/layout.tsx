import { RequireAuth } from "@/components/RequireAuth";
import Link from "next/link";

export default function PosLayout({ children }: { children: React.ReactNode }) {
  return (
    <RequireAuth>
      <div className="app-shell min-h-screen">
        <header className="portal-topbar print:hidden">
          <div className="page-wrap flex items-center justify-between py-4">
            <Link href="/branch/dashboard" className="text-lg font-semibold text-[color:var(--secondary)]">
              Point of Sale
            </Link>
            <Link href="/branch/dashboard" className="btn-secondary px-3 py-2 text-sm">
              Branch dashboard
            </Link>
          </div>
        </header>
        {children}
      </div>
    </RequireAuth>
  );
}
