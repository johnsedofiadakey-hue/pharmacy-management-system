"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { getFirebaseAuth } from "@/lib/firebase/client";
import { linkCustomerAccount } from "@/lib/firebase/callables";

const ORG_ID = process.env.NEXT_PUBLIC_ORGANISATION_ID ?? "";

export default function CustomerSignupPage() {
  const router = useRouter();
  const [form, setForm] = useState({ email: "", password: "", phone: "", name: "" });
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await createUserWithEmailAndPassword(getFirebaseAuth(), form.email, form.password);
      await linkCustomerAccount({ organisationId: ORG_ID, phone: form.phone, name: form.name });
      router.push("/store/account");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign-up failed.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="app-shell flex min-h-screen items-center justify-center p-6">
      <section className="clinical-card w-full max-w-md rounded-2xl p-6">
        <p className="text-sm font-semibold uppercase text-[color:var(--primary)]">Customer portal</p>
      <h1 className="font-display mt-2 text-3xl font-semibold text-[color:var(--secondary)]">Create account</h1>
      <p className="mt-2 text-sm text-[color:var(--muted)]">
        Link your pharmacy profile for orders, loyalty, and care continuity.
      </p>
      <form onSubmit={handleSubmit} className="mt-5 flex flex-col gap-3">
        <input
          required
          placeholder="Full name"
          className="field px-3 py-3"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
        />
        <input
          required
          placeholder="Phone"
          className="field px-3 py-3"
          value={form.phone}
          onChange={(e) => setForm({ ...form, phone: e.target.value })}
        />
        <input
          required
          type="email"
          placeholder="Email"
          className="field px-3 py-3"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
        />
        <input
          required
          type="password"
          placeholder="Password"
          className="field px-3 py-3"
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
        />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={submitting}
          className="btn-primary px-4 py-3 disabled:opacity-50"
        >
          {submitting ? "Creating..." : "Sign up"}
        </button>
      </form>
      </section>
    </main>
  );
}
