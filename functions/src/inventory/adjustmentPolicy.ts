import { StockMovementType } from "@pharmacy-os/db";

// Placeholder policy (BLUEPRINT.md §19: "sensitive adjustments can require
// manager approval"). No org-level configuration for this yet — THEFT/LOSS
// always route to approval since they imply potential fraud/loss the manager
// should see regardless of size; other reasons only need approval past a
// fixed magnitude. Revisit once there's a real signal for what "sensitive"
// should mean per organisation (e.g. a settings field on Organisation).
const ALWAYS_SENSITIVE_TYPES: StockMovementType[] = [
  StockMovementType.ADJUSTMENT_THEFT,
  StockMovementType.ADJUSTMENT_LOSS,
];

const SENSITIVE_QUANTITY_THRESHOLD = 50;

export function isSensitiveAdjustment(movementType: StockMovementType, quantityDelta: number): boolean {
  return ALWAYS_SENSITIVE_TYPES.includes(movementType) || Math.abs(quantityDelta) >= SENSITIVE_QUANTITY_THRESHOLD;
}
