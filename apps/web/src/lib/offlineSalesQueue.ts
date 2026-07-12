import { FirebaseError } from "firebase/app";
import type { CreateSaleInput } from "./firebase/callables";

// localStorage-backed queue for POS sales that couldn't reach the backend
// (BLUEPRINT.md §51, Phase 12). Two states:
//   QUEUED — waiting for connectivity; drained automatically on reconnect.
//   FAILED — the backend rejected it for a business reason (e.g. stock
//            changed while offline). These are never silently dropped: they
//            stay visible in the POS until a human retries or discards them,
//            because a completed cash sale vanishing from records is an
//            audit hole.
export type QueuedSaleStatus = "QUEUED" | "FAILED";

export type QueuedSale = {
  localId: string;
  queuedAt: string;
  status: QueuedSaleStatus;
  failureReason?: string;
  payload: CreateSaleInput;
};

const STORAGE_KEY = "pos_offline_sales_v1";

function readAll(): QueuedSale[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as QueuedSale[];
    // Entries written before the FAILED state existed have no status field.
    return parsed.map((item) => ({ ...item, status: item.status ?? "QUEUED" }));
  } catch {
    return [];
  }
}

function writeAll(items: QueuedSale[]): void {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

export function getQueuedSales(): QueuedSale[] {
  return readAll().filter((item) => item.status === "QUEUED");
}

export function getFailedSales(): QueuedSale[] {
  return readAll().filter((item) => item.status === "FAILED");
}

export function queueSale(payload: CreateSaleInput): QueuedSale {
  const item: QueuedSale = {
    localId: crypto.randomUUID(),
    queuedAt: new Date().toISOString(),
    status: "QUEUED",
    payload,
  };
  writeAll([...readAll(), item]);
  return item;
}

export function removeQueuedSale(localId: string): void {
  writeAll(readAll().filter((item) => item.localId !== localId));
}

export function markSaleFailed(localId: string, failureReason: string): void {
  writeAll(
    readAll().map((item) =>
      item.localId === localId ? { ...item, status: "FAILED" as const, failureReason } : item
    )
  );
}

/** Move a FAILED sale back to QUEUED so the next drain retries it. */
export function retryFailedSale(localId: string): void {
  writeAll(
    readAll().map((item) =>
      item.localId === localId ? { ...item, status: "QUEUED" as const, failureReason: undefined } : item
    )
  );
}

/** Deliberate human decision to drop a failed sale — the only removal path for FAILED entries. */
export function discardFailedSale(localId: string): void {
  removeQueuedSale(localId);
}

/**
 * True when the error means "the backend was unreachable" (retry later),
 * false when the backend answered with a business rejection (needs review).
 */
export function isNetworkError(err: unknown): boolean {
  if (typeof navigator !== "undefined" && !navigator.onLine) return true;
  if (err instanceof FirebaseError) {
    return (
      err.code === "functions/unavailable" ||
      err.code === "functions/deadline-exceeded" ||
      // The JS SDK surfaces a failed fetch (no network path to the function)
      // as `internal` with no server-provided message.
      (err.code === "functions/internal" && /internal|fetch|network/i.test(err.message))
    );
  }
  if (err instanceof TypeError && /fetch|network/i.test(err.message)) return true;
  return false;
}
