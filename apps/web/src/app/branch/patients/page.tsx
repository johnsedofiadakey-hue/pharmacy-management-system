"use client";

import { useEffect, useState } from "react";
import {
  listBranches,
  findCustomerByPhone,
  getPatientRecord,
  recordVitals,
  createConsultation,
  createCarePlan,
  completeCarePlanFollowup,
  listUpcomingFollowups,
  type Branch,
  type CustomerRow,
  type PatientRecord,
  type UpcomingFollowup,
} from "@/lib/firebase/callables";

// Phase 8 skeleton — clinical records are org-wide (not branch-filtered),
// consistent with BLUEPRINT.md's continuity-of-care decision; branchId is
// only needed for the actions that happen at a specific branch (vitals,
// consultations). This is the pharmacist-facing side only — the
// customer-facing "patient portal" view needs customer authentication, which
// doesn't exist yet (Phase 9).
export default function PatientCarePage() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [branchId, setBranchId] = useState("");
  const [phone, setPhone] = useState("");
  const [customer, setCustomer] = useState<CustomerRow | null>(null);
  const [record, setRecord] = useState<PatientRecord | null>(null);
  const [upcoming, setUpcoming] = useState<UpcomingFollowup[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const [vitals, setVitals] = useState({ bpSystolic: "", bpDiastolic: "", glucoseLevel: "", weightKg: "" });
  const [consultation, setConsultation] = useState({ reason: "", notes: "" });
  const [carePlan, setCarePlan] = useState({ condition: "", goals: "", firstFollowupDate: "" });

  useEffect(() => {
    listBranches()
      .then((r) => setBranches(r.data.branches))
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load branches."));
    listUpcomingFollowups()
      .then((r) => setUpcoming(r.data.followups))
      .catch(() => undefined);
  }, []);

  async function handleSearch(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setMessage(null);
    try {
      const result = await findCustomerByPhone(phone);
      setCustomer(result.data.customer);
      if (result.data.customer) {
        const recordResult = await getPatientRecord(result.data.customer.id);
        setRecord(recordResult.data);
      } else {
        setRecord(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Search failed.");
    }
  }

  async function refreshRecord() {
    if (!customer) return;
    const recordResult = await getPatientRecord(customer.id);
    setRecord(recordResult.data);
  }

  async function handleRecordVitals(event: React.FormEvent) {
    event.preventDefault();
    if (!customer || !branchId) return;
    setError(null);
    try {
      await recordVitals({
        customerId: customer.id,
        branchId,
        bpSystolic: vitals.bpSystolic ? Number(vitals.bpSystolic) : undefined,
        bpDiastolic: vitals.bpDiastolic ? Number(vitals.bpDiastolic) : undefined,
        glucoseLevel: vitals.glucoseLevel ? Number(vitals.glucoseLevel) : undefined,
        weightKg: vitals.weightKg ? Number(vitals.weightKg) : undefined,
      });
      setVitals({ bpSystolic: "", bpDiastolic: "", glucoseLevel: "", weightKg: "" });
      await refreshRecord();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to record vitals.");
    }
  }

  async function handleLogConsultation(event: React.FormEvent) {
    event.preventDefault();
    if (!customer || !branchId) return;
    setError(null);
    try {
      await createConsultation({ customerId: customer.id, branchId, ...consultation });
      setConsultation({ reason: "", notes: "" });
      await refreshRecord();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to log consultation.");
    }
  }

  async function handleCreateCarePlan(event: React.FormEvent) {
    event.preventDefault();
    if (!customer) return;
    setError(null);
    try {
      await createCarePlan({
        customerId: customer.id,
        condition: carePlan.condition,
        goals: carePlan.goals || undefined,
        firstFollowupDate: carePlan.firstFollowupDate
          ? new Date(carePlan.firstFollowupDate).toISOString()
          : undefined,
      });
      setCarePlan({ condition: "", goals: "", firstFollowupDate: "" });
      await refreshRecord();
      setMessage("Care plan created.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create care plan.");
    }
  }

  async function handleCompleteFollowup(followupId: string) {
    setError(null);
    try {
      await completeCarePlanFollowup(followupId);
      await refreshRecord();
      const result = await listUpcomingFollowups();
      setUpcoming(result.data.followups);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to complete follow-up.");
    }
  }

  return (
    <main className="mx-auto max-w-3xl p-8">
      <h1 className="mb-6 text-2xl font-semibold">Patient Care</h1>
      {error && <p className="mb-4 text-red-600">{error}</p>}
      {message && <p className="mb-4 text-green-700">{message}</p>}

      {upcoming.length > 0 && (
        <div className="mb-6 rounded-lg border p-4">
          <h2 className="mb-2 font-medium">Follow-ups due (org-wide)</h2>
          <ul className="text-sm">
            {upcoming.map((f) => (
              <li key={f.id} className="mb-1 flex items-center justify-between">
                <span>
                  {f.carePlan.patientProfile.customer.phone} — {f.carePlan.condition} — due{" "}
                  {new Date(f.scheduledDate).toLocaleDateString()}
                </span>
                <button
                  onClick={() => handleCompleteFollowup(f.id)}
                  className="rounded border px-2 py-0.5 text-xs"
                >
                  Mark complete
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <select
        className="mb-4 rounded border px-3 py-2"
        value={branchId}
        onChange={(e) => setBranchId(e.target.value)}
      >
        <option value="">Acting at branch...</option>
        {branches.map((b) => (
          <option key={b.id} value={b.id}>
            {b.name}
          </option>
        ))}
      </select>

      <form onSubmit={handleSearch} className="mb-6 flex gap-2">
        <input
          required
          placeholder="Customer phone"
          className="flex-1 rounded border px-3 py-2"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />
        <button type="submit" className="rounded bg-black px-4 py-2 text-white">
          Search
        </button>
      </form>

      {customer && (
        <>
          <h2 className="mb-2 font-medium">
            {customer.phone} {customer.isPatient && <span className="text-sm text-gray-500">(patient)</span>}
          </h2>

          <form onSubmit={handleRecordVitals} className="mb-4 flex flex-wrap gap-2 rounded-lg border p-4">
            <h3 className="w-full text-sm font-medium">Record vitals</h3>
            <input
              type="number"
              placeholder="BP systolic"
              className="w-28 rounded border px-2 py-1"
              value={vitals.bpSystolic}
              onChange={(e) => setVitals({ ...vitals, bpSystolic: e.target.value })}
            />
            <input
              type="number"
              placeholder="BP diastolic"
              className="w-28 rounded border px-2 py-1"
              value={vitals.bpDiastolic}
              onChange={(e) => setVitals({ ...vitals, bpDiastolic: e.target.value })}
            />
            <input
              type="number"
              placeholder="Glucose"
              className="w-24 rounded border px-2 py-1"
              value={vitals.glucoseLevel}
              onChange={(e) => setVitals({ ...vitals, glucoseLevel: e.target.value })}
            />
            <input
              type="number"
              placeholder="Weight (kg)"
              className="w-28 rounded border px-2 py-1"
              value={vitals.weightKg}
              onChange={(e) => setVitals({ ...vitals, weightKg: e.target.value })}
            />
            <button type="submit" disabled={!branchId} className="rounded bg-black px-3 py-1 text-sm text-white">
              Save
            </button>
          </form>

          <form onSubmit={handleLogConsultation} className="mb-4 flex flex-col gap-2 rounded-lg border p-4">
            <h3 className="text-sm font-medium">Log consultation</h3>
            <input
              required
              placeholder="Reason"
              className="rounded border px-2 py-1"
              value={consultation.reason}
              onChange={(e) => setConsultation({ ...consultation, reason: e.target.value })}
            />
            <textarea
              placeholder="Notes"
              className="rounded border px-2 py-1"
              value={consultation.notes}
              onChange={(e) => setConsultation({ ...consultation, notes: e.target.value })}
            />
            <button type="submit" disabled={!branchId} className="self-start rounded bg-black px-3 py-1 text-sm text-white">
              Save
            </button>
          </form>

          <form onSubmit={handleCreateCarePlan} className="mb-6 flex flex-col gap-2 rounded-lg border p-4">
            <h3 className="text-sm font-medium">Create care plan</h3>
            <input
              required
              placeholder="Condition"
              className="rounded border px-2 py-1"
              value={carePlan.condition}
              onChange={(e) => setCarePlan({ ...carePlan, condition: e.target.value })}
            />
            <input
              placeholder="Goals"
              className="rounded border px-2 py-1"
              value={carePlan.goals}
              onChange={(e) => setCarePlan({ ...carePlan, goals: e.target.value })}
            />
            <input
              type="date"
              className="rounded border px-2 py-1"
              value={carePlan.firstFollowupDate}
              onChange={(e) => setCarePlan({ ...carePlan, firstFollowupDate: e.target.value })}
            />
            <button type="submit" className="self-start rounded bg-black px-3 py-1 text-sm text-white">
              Create
            </button>
          </form>

          {record?.patientProfile && (
            <div className="rounded-lg border p-4 text-sm">
              <h3 className="mb-2 font-medium">Clinical history (org-wide)</h3>
              <p className="mb-1 font-medium">Vitals</p>
              <ul className="mb-3">
                {record.patientProfile.vitals.map((v) => (
                  <li key={v.id}>
                    {new Date(v.recordedAt).toLocaleDateString()}: BP {v.bpSystolic}/{v.bpDiastolic}, glucose{" "}
                    {v.glucoseLevel}, weight {v.weightKg}kg
                  </li>
                ))}
              </ul>
              <p className="mb-1 font-medium">Consultations</p>
              <ul className="mb-3">
                {record.patientProfile.consultations.map((c) => (
                  <li key={c.id}>
                    {new Date(c.consultationDate).toLocaleDateString()}: {c.reason} (by {c.pharmacist.name})
                  </li>
                ))}
              </ul>
              <p className="mb-1 font-medium">Care plans</p>
              <ul>
                {record.patientProfile.carePlans.map((cp) => (
                  <li key={cp.id}>
                    {cp.condition} ({cp.status}) —{" "}
                    {cp.followups.map((f) => `${f.status} ${new Date(f.scheduledDate).toLocaleDateString()}`).join(", ")}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </main>
  );
}
