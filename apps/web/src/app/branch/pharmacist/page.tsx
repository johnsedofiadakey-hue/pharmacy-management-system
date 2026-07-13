"use client";

import { useEffect, useState } from "react";
import {
  listProducts,
  createPrescription,
  listPrescriptions,
  reviewPrescription,
  type Product,
  type PrescriptionRow,
} from "@/lib/firebase/callables";
import { useBranchWorkspace } from "@/components/branch/BranchWorkspaceContext";

type ItemDraft = { requestedText: string; quantity: string };
type ReviewDraft = Record<string, { productId: string; availabilityStatus: string }>;

// Phase 7 skeleton — intake supports one item at a time (add rows manually);
// review lets the pharmacist match/substitute a product and set availability
// per line before approving/rejecting/requesting clarification. Branch
// selection is manual, same follow-up as earlier phases.
export default function PharmacistWorkspacePage() {
  const { branchId, selectedBranch } = useBranchWorkspace();
  const [products, setProducts] = useState<Product[]>([]);
  const [prescriptions, setPrescriptions] = useState<PrescriptionRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [customerPhone, setCustomerPhone] = useState("");
  const [itemDrafts, setItemDrafts] = useState<ItemDraft[]>([{ requestedText: "", quantity: "1" }]);
  const [reviewDrafts, setReviewDrafts] = useState<Record<string, ReviewDraft>>({});

  useEffect(() => {
    listProducts()
      .then((r) => setProducts(r.data.products))
      .catch(() => undefined);
  }, []);

  async function refresh() {
    if (!branchId) return;
    try {
      const result = await listPrescriptions(branchId, true);
      setPrescriptions(result.data.prescriptions);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load prescriptions.");
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [branchId]);

  async function handleIntake(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    try {
      await createPrescription({
        branchId,
        customerPhone,
        items: itemDrafts
          .filter((i) => i.requestedText.trim())
          .map((i) => ({ requestedText: i.requestedText, quantity: Number(i.quantity) })),
      });
      setCustomerPhone("");
      setItemDrafts([{ requestedText: "", quantity: "1" }]);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to log prescription.");
    }
  }

  function getDraft(prescriptionId: string, itemId: string) {
    return reviewDrafts[prescriptionId]?.[itemId] ?? { productId: "", availabilityStatus: "AVAILABLE" };
  }

  function setDraft(prescriptionId: string, itemId: string, patch: Partial<ReviewDraft[string]>) {
    setReviewDrafts((prev) => ({
      ...prev,
      [prescriptionId]: {
        ...prev[prescriptionId],
        [itemId]: { ...getDraft(prescriptionId, itemId), ...patch },
      },
    }));
  }

  async function handleReview(
    prescription: PrescriptionRow,
    decision: "APPROVE" | "REJECT" | "REQUEST_CLARIFICATION"
  ) {
    setError(null);
    try {
      await reviewPrescription(
        prescription.id,
        decision,
        prescription.items.map((item) => {
          const draft = getDraft(prescription.id, item.id);
          return {
            prescriptionItemId: item.id,
            productId: draft.productId || undefined,
            availabilityStatus: draft.availabilityStatus as
              | "PENDING"
              | "AVAILABLE"
              | "PARTIALLY_AVAILABLE"
              | "UNAVAILABLE",
          };
        })
      );
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Review failed.");
    }
  }

  return (
    <main className="page-wrap py-8">
      <div className="mb-6">
        <p className="text-sm font-semibold uppercase text-[color:var(--primary)]">Branch Workspace</p>
        <h1 className="mt-1 text-3xl font-semibold text-[color:var(--secondary)]">Pharmacist workspace</h1>
        <p className="mt-2 max-w-2xl text-sm text-[color:var(--muted)]">
          Log and review prescriptions for {selectedBranch?.name ?? "the active branch"} before dispensing.
        </p>
      </div>

      {error && <p className="mb-4 rounded bg-red-50 p-3 text-sm text-[color:var(--danger)]">{error}</p>}

      {branchId && (
        <>
          <form onSubmit={handleIntake} className="clinical-card mb-8 flex flex-col gap-3 rounded-xl p-4">
            <h2 className="font-semibold text-[color:var(--secondary)]">Log a prescription</h2>
            <input
              required
              placeholder="Customer phone"
              className="field px-3 py-2"
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value)}
            />
            {itemDrafts.map((item, index) => (
              <div key={index} className="flex gap-2">
                <input
                  required
                  placeholder="What's written on the prescription..."
                  className="field flex-1 px-3 py-2"
                  value={item.requestedText}
                  onChange={(e) =>
                    setItemDrafts((prev) =>
                      prev.map((d, i) => (i === index ? { ...d, requestedText: e.target.value } : d))
                    )
                  }
                />
                <input
                  type="number"
                  min={1}
                  className="field w-20 px-3 py-2"
                  value={item.quantity}
                  onChange={(e) =>
                    setItemDrafts((prev) =>
                      prev.map((d, i) => (i === index ? { ...d, quantity: e.target.value } : d))
                    )
                  }
                />
              </div>
            ))}
            <button
              type="button"
              onClick={() => setItemDrafts((prev) => [...prev, { requestedText: "", quantity: "1" }])}
              className="self-start text-sm font-medium text-[color:var(--primary)] underline"
            >
              + add item
            </button>
            <button type="submit" className="btn-primary px-4 py-2">
              Log prescription
            </button>
          </form>

          <h2 className="mb-3 font-semibold text-[color:var(--secondary)]">Pending review</h2>
          {prescriptions.length === 0 ? (
            <p className="text-[color:var(--muted)]">Nothing pending.</p>
          ) : (
            <ul className="flex flex-col gap-3">
              {prescriptions.map((prescription) => (
                <li key={prescription.id} className="clinical-card rounded-xl p-4">
                  <div className="mb-2 font-semibold text-[color:var(--secondary)]">
                    {prescription.customer?.phone}{" "}
                    <span className="status-pill status-info">{prescription.status}</span>
                  </div>
                  <ul className="mb-3 flex flex-col gap-2">
                    {prescription.items.map((item) => {
                      const draft = getDraft(prescription.id, item.id);
                      return (
                        <li key={item.id} className="flex flex-wrap items-center gap-2 text-sm">
                          <span className="w-40 shrink-0">
                            {item.requestedText} × {item.quantity}
                          </span>
                          <select
                            className="field px-2 py-1"
                            value={draft.productId}
                            onChange={(e) => setDraft(prescription.id, item.id, { productId: e.target.value })}
                          >
                            <option value="">Match product...</option>
                            {products.map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.name}
                              </option>
                            ))}
                          </select>
                          <select
                            className="field px-2 py-1"
                            value={draft.availabilityStatus}
                            onChange={(e) =>
                              setDraft(prescription.id, item.id, { availabilityStatus: e.target.value })
                            }
                          >
                            <option value="AVAILABLE">Available</option>
                            <option value="PARTIALLY_AVAILABLE">Partially available</option>
                            <option value="UNAVAILABLE">Unavailable</option>
                          </select>
                        </li>
                      );
                    })}
                  </ul>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleReview(prescription, "APPROVE")}
                      className="btn-primary px-3 py-1 text-sm"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => handleReview(prescription, "REJECT")}
                      className="btn-secondary px-3 py-1 text-sm"
                    >
                      Reject
                    </button>
                    <button
                      onClick={() => handleReview(prescription, "REQUEST_CLARIFICATION")}
                      className="btn-secondary px-3 py-1 text-sm"
                    >
                      Request clarification
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </main>
  );
}
