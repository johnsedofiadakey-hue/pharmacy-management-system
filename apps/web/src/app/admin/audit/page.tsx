"use client";

import { useEffect, useMemo, useState } from "react";
import { listAuditLog, type AuditLogEntry } from "@/lib/firebase/callables";
import { Alert, Badge, Button, EmptyState } from "@/components/ui";

function unique(values: string[]): string[] {
  return Array.from(new Set(values.filter(Boolean))).sort((a, b) => a.localeCompare(b));
}

export default function AdminAuditPage() {
  const [entries, setEntries] = useState<AuditLogEntry[]>([]);
  const [action, setAction] = useState("");
  const [resourceType, setResourceType] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    setLoading(true);
    setError(null);
    try {
      const result = await listAuditLog();
      setEntries(result.data.entries);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load audit log.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refresh();
  }, []);

  const actions = useMemo(() => unique(entries.map((entry) => entry.action)), [entries]);
  const resources = useMemo(() => unique(entries.map((entry) => entry.resourceType)), [entries]);
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return entries.filter((entry) => {
      if (action && entry.action !== action) return false;
      if (resourceType && entry.resourceType !== resourceType) return false;
      if (!q) return true;
      return [
        entry.action,
        entry.resourceType,
        entry.resourceId ?? "",
        entry.user?.name ?? "",
        entry.branch?.name ?? "",
      ]
        .join(" ")
        .toLowerCase()
        .includes(q);
    });
  }, [action, entries, resourceType, search]);

  return (
    <main className="page-wrap py-8">
      <div className="mb-6">
        <p className="text-sm font-semibold uppercase text-[color:var(--primary)]">Super Admin</p>
        <h1 className="mt-1 text-3xl font-semibold text-[color:var(--secondary)]">Audit trail</h1>
        <p className="mt-2 max-w-2xl text-sm text-[color:var(--muted)]">
          Review the latest sensitive actions across pricing, roles, settings, stock, recalls, and branch workflows.
        </p>
      </div>

      {error && <Alert tone="error" className="mb-4">{error}</Alert>}

      <section className="clinical-card mb-6 grid gap-3 rounded-xl p-5 md:grid-cols-[1fr_220px_220px_auto]">
        <input
          className="field px-3 py-2"
          placeholder="Search user, branch, action, or resource ID"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select className="field px-3 py-2" value={action} onChange={(e) => setAction(e.target.value)}>
          <option value="">All actions</option>
          {actions.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
        <select className="field px-3 py-2" value={resourceType} onChange={(e) => setResourceType(e.target.value)}>
          <option value="">All resources</option>
          {resources.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
        <Button type="button" variant="secondary" onClick={refresh} disabled={loading}>
          Refresh
        </Button>
      </section>

      <section className="clinical-card rounded-xl p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-semibold text-[color:var(--secondary)]">Latest entries</h2>
          <div className="flex gap-2">
            <Badge tone="info">{filtered.length} shown</Badge>
            <Badge tone="neutral">{entries.length} loaded</Badge>
          </div>
        </div>

        {loading ? (
          <p className="text-sm text-[color:var(--muted)]">Loading audit log...</p>
        ) : filtered.length === 0 ? (
          <EmptyState title="No audit entries match the current filters" hint="Clear filters or refresh the log." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-sm">
              <thead>
                <tr className="border-b border-[color:var(--border)] text-left text-[color:var(--muted)]">
                  <th className="px-3 py-2 font-medium">Time</th>
                  <th className="px-3 py-2 font-medium">Action</th>
                  <th className="px-3 py-2 font-medium">Resource</th>
                  <th className="px-3 py-2 font-medium">User</th>
                  <th className="px-3 py-2 font-medium">Branch</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((entry) => (
                  <tr key={entry.id} className="border-b border-[color:var(--border)] last:border-0">
                    <td className="px-3 py-3 text-xs tabular-nums text-[color:var(--muted)]">
                      {new Date(entry.createdAt).toLocaleString()}
                    </td>
                    <td className="px-3 py-3 font-medium text-[color:var(--secondary)]">{entry.action}</td>
                    <td className="px-3 py-3">
                      <div>{entry.resourceType}</div>
                      {entry.resourceId && <div className="text-xs text-[color:var(--muted)]">{entry.resourceId}</div>}
                    </td>
                    <td className="px-3 py-3">{entry.user?.name ?? "System"}</td>
                    <td className="px-3 py-3">{entry.branch?.name ?? "Org-wide"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
