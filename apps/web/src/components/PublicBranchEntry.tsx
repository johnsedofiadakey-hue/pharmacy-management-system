"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { MapPin, Loader2 } from "lucide-react";
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
  const [locationStatus, setLocationStatus] = useState("Finding your nearest branch...");
  const [distances, setDistances] = useState<Record<string, number>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [geoPermissionGranted, setGeoPermissionGranted] = useState(false);
  const [geoAttempted, setGeoAttempted] = useState(false);

  useEffect(() => {
    if (!ORG_ID) return;
    publicListBranches(ORG_ID)
      .then((result) => {
        setBranches(result.data.branches);
        const savedBranchId = window.localStorage.getItem("selectedBranchId");
        if (savedBranchId && result.data.branches.some((b) => b.id === savedBranchId)) {
          setBranchId(savedBranchId);
        } else {
          setBranchId(result.data.branches[0]?.id ?? "");
        }
      })
      .catch((err) => {
        console.error("Failed to load branches:", err);
        setError("Branches are not available right now. You can still continue to login.");
      })
      .finally(() => attemptAutoGeolocation());
  }, []);

  useEffect(() => {
    if (branchId) {
      window.localStorage.setItem("selectedBranchId", branchId);
    }
  }, [branchId]);

  function attemptAutoGeolocation() {
    if (!navigator.geolocation) {
      setLocationStatus("Location not available in this browser. Select manually.");
      setIsLoading(false);
      setGeoAttempted(true);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setGeoPermissionGranted(true);
        setGeoAttempted(true);
        const customerLocation = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };
        const ranked = branches
          .map((branch) => ({ branch, distance: distanceKm(customerLocation, branch) }))
          .filter((item): item is { branch: PublicBranch; distance: number } => item.distance != null)
          .sort((a, b) => a.distance - b.distance);

        if (!ranked[0]) {
          setLocationStatus("No branch coordinates available. Please choose manually.");
          setIsLoading(false);
          return;
        }

        setDistances(Object.fromEntries(ranked.map((item) => [item.branch.id, item.distance])));
        setBranchId(ranked[0].branch.id);
        window.localStorage.setItem("selectedBranchId", ranked[0].branch.id);
        setLocationStatus(`${ranked[0].branch.name} is closest — ${ranked[0].distance.toFixed(1)} km away`);
        setIsLoading(false);
      },
      () => {
        setGeoAttempted(true);
        setLocationStatus("Select your branch manually");
        setIsLoading(false);
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 300000 }
    );
  }

  function useNearestBranch() {
    if (!navigator.geolocation) {
      setLocationStatus("Location is not available in this browser.");
      return;
    }
    setLocationStatus("Finding your nearest branch...");
    setIsLoading(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setGeoPermissionGranted(true);
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
          setIsLoading(false);
          return;
        }

        setDistances(Object.fromEntries(ranked.map((item) => [item.branch.id, item.distance])));
        setBranchId(ranked[0].branch.id);
        window.localStorage.setItem("selectedBranchId", ranked[0].branch.id);
        setLocationStatus(`${ranked[0].branch.name} is closest — ${ranked[0].distance.toFixed(1)} km away`);
        setIsLoading(false);
      },
      () => {
        setLocationStatus("Location permission was not granted. Please choose a branch manually.");
        setIsLoading(false);
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 300000 }
    );
  }

  const selectedBranch = branches.find((b) => b.id === branchId);

  return (
    <section className="border-b border-[color:var(--border)] bg-white/95">
      <div className="page-wrap">
        <div className="grid gap-4 py-4 md:grid-cols-[1.2fr_1fr] md:py-5">
          <div className="flex flex-col justify-center">
            <div className="flex items-center gap-2">
              <MapPin size={18} className="text-[color:var(--primary)]" />
              <p className="text-xs font-semibold uppercase tracking-normal text-[color:var(--primary)]">
                Your pharmacy branch
              </p>
            </div>
            <h2 className="font-display mt-1 text-xl font-semibold text-[color:var(--secondary)] md:text-2xl">
              {isLoading ? "Loading branches..." : selectedBranch ? `Serving: ${selectedBranch.name}` : "Choose your nearest branch"}
            </h2>
            <p className="mt-0.5 max-w-xl text-sm text-[color:var(--muted)]">
              {geoPermissionGranted ? "✓ Location enabled for faster service" : geoAttempted ? "Select or use location to find your nearest pharmacy" : "Enable location to find the closest pharmacy to you"}
            </p>
          </div>

          <div className="grid gap-2.5">
            <div className="flex gap-2">
              <button
                type="button"
                className="btn-primary flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2.5 text-sm"
                onClick={useNearestBranch}
                disabled={isLoading}
              >
                {isLoading ? <Loader2 size={16} className="animate-spin" /> : <MapPin size={16} />}
                {isLoading ? "Locating..." : "Find nearest branch"}
              </button>
            </div>
            <p className="text-xs text-[color:var(--muted)] min-h-[18px]">{locationStatus}</p>
            <select
              className="field w-full px-3 py-2.5 text-sm"
              value={branchId}
              onChange={(event) => setBranchId(event.target.value)}
              disabled={isLoading || branches.length === 0}
            >
              {branches.length === 0 ? (
                <option value="">No branches available</option>
              ) : (
                branches.map((branch) => (
                  <option key={branch.id} value={branch.id}>
                    {branch.name}
                    {branch.physicalAddress ? ` — ${branch.physicalAddress.substring(0, 35)}` : ""}
                    {distances[branch.id] != null ? ` (${distances[branch.id].toFixed(1)} km)` : ""}
                  </option>
                ))
              )}
            </select>
            {error && <p className="text-sm text-[color:var(--danger)]">{error}</p>}
            <div className="flex gap-2">
              <Link href="/store" className="btn-primary px-4 py-2.5 text-sm text-center flex-1">
                Shop now
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}