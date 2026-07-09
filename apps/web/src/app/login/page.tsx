"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signInWithEmailAndPassword } from "firebase/auth";
import { getFirebaseAuth } from "@/lib/firebase/client";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("admin@pharmacy.com");
  const [password, setPassword] = useState("admin123");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await signInWithEmailAndPassword(getFirebaseAuth(), email, password);
      router.push("/admin/branches");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign-in failed.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="app-shell flex min-h-screen items-center justify-center p-6">
      <section className="clinical-card w-full max-w-md rounded-2xl p-6">
        <p className="text-sm font-semibold uppercase text-[color:var(--primary)]">Secure staff access</p>
      <h1 className="font-display mt-2 text-3xl font-semibold text-[color:var(--secondary)]">Sign in</h1>
      <p className="mt-2 text-sm text-[color:var(--muted)]">
        Demo access for branch operations, pharmacist tools, POS, and management dashboards.
      </p>
      <form onSubmit={handleSubmit} className="mt-5 flex flex-col gap-3">
        <input
          required
          type="email"
          placeholder="Email"
          className="field px-3 py-3"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <input
          required
          type="password"
          placeholder="Password"
          className="field px-3 py-3"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={submitting}
          className="btn-primary px-4 py-3 disabled:opacity-50"
        >
          {submitting ? "Signing in..." : "Sign in"}
        </button>
      </form>
      </section>
    </main>
  );
}
