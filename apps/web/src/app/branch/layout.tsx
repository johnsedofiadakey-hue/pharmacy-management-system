import { RequireAuth } from "@/components/RequireAuth";

export default function BranchLayout({ children }: { children: React.ReactNode }) {
  return <RequireAuth>{children}</RequireAuth>;
}
