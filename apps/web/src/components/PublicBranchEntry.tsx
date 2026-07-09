"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { publicListBranches, type PublicBranch } from "@/lib/firebase/callables";

const ORG_ID = process.env.NEXT_PUBLIC_ORGANISATION_ID ?? "";

function distanceKm(a: { lat: number; lng: number }, branch: PublicBranch): number | null {
  if (branch.gpsLat == null || branch.gpsLng == null) return null;
  const earthKm = 6371;
  const dLat = ((branch.gpsLat - a.lat) * Math.PI) / 180;
  const dLng = ((branch.gpsLng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (branch.gpsLat * Math.PI) / 180;
  const hav =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return earthKm * 2 * Math.atan2(Math.sqrt(hav), Math.sqrt(1 - hav));
}

export function PublicBranchEntry() {
  const [branches, setBranches] = useState<PublicBranch[]>([]);
  const [branchId, setBranchId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [locationStatus, setLocationStatus] = useState("Use my location for nearest branch");
  const [distances, setDistances] = useState<Record<string, number>>({});

  useEffect(() => {
    if (!ORG_ID) return;
    publicListBranches(ORG_ID)
      .then((result) => {
        setBranches(result.data.branches);
        setBranchId(result.data.branches[0]?.id ?? "");
      })
      .catch(() => setError("Branches are not available right now. You can still continue to login."));
  }, []);

  useEffect(() => {
    if (branchId) {
      window.localStorage.setItem("selectedBranchId", branchId);
    }
  }, [branchId]);

  function useNearestBranch() {
    if (!navigator.geolocation) {
      setLocationStatus("Location is not available in this browser.");
      return;
    }
    setLocationStatus("Finding your nearest branch...");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const customerLocation = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };
        const ranked = branches
          .map((branch) => ({ branch, distance: distanceKm(customerLocation, branch) }))
          .filter((item): item is { branch: PublicBranch; distance: number } => item.distance != null)
          .sort((a, b) => a.distance - b.distance);

        if (!ranked[0]) {
          setLocationStatus("No branch coordinates are available yet. Please choose manually.");
          return;
        }

        setDistances(Object.fromEntries(ranked.map((item) => [item.branch.id, item.distance])));
        setBranchId(ranked[0].branch.id);
        setLocationStatus(`${ranked[0].branch.name} looks closest to you.`);
      },
      () => setLocationStatus("Location permission was not granted. Please choose a branch manually."),
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 300000 }
    );
  }

  return (
    <section id="login" className="relative -mt-10 pb-12">
      <div className="page-wrap">
        <div className="clinical-card grid gap-5 rounded-lg p-5 md:grid-cols-[1.15fr_1fr] md:p-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-normal text-[color:var(--primary)]">
              Branch-aware access
            </p>
            <h2 className="mt-1 text-2xl font-semibold text-[color:var(--secondary)]">
              Start with the closest branch
            </h2>
            <p className="mt-2 max-w-xl text-sm text-[color:var(--muted)]">
              Customers can let the site find the nearest branch for faster pickup and delivery. Staff can still enter through the quiet admin route.
            </p>
            <div className="mt-4 flex flex-wrap gap-2 text-xs">
              <span className="status-pill status-safe">Fast pickup</span>
              <span className="status-pill status-info">Delivery routing</span>
              <span className="status-pill status-warn">Manual fallback</span>
            </div>
          </div>

          <div className="grid gap-3">
            <button type="button" className="btn-primary px-4 py-3" onClick={useNearestBranch}>
              Find nearest branch
            </button>
            <p className="text-xs text-[color:var(--muted)]">{locationStatus}</p>
            <select
              className="field w-full px-3 py-3"
              value={branchId}
              onChange={(event) => setBranchId(event.target.value)}
            >
              {branches.length === 0 ? (
                <option value="">Select branch</option>
              ) : (
                branches.map((branch) => (
                  <option key={branch.id} value={branch.id}>
                    {branch.name}
                    {distances[branch.id] != null ? ` • ${distances[branch.id].toFixed(1)} km` : ""}
                  </option>
                ))
              )}
            </select>
            {error && <p className="text-sm text-[color:var(--danger)]">{error}</p>}
            <div className="grid grid-cols-2 gap-2">
              <Link href="/store/login" className="btn-primary px-4 py-3 text-center">
                Customer login
              </Link>
              <Link href="/store" className="btn-secondary px-4 py-3 text-center">
                Shop now
              </Link>
            </div>
            <Link href="/login" className="text-center text-xs font-medium text-[color:var(--muted)] underline">
              Staff and admin access
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
