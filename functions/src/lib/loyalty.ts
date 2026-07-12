import { LoyaltyTier, type Prisma } from "@pharmacy-os/db";

// Placeholder policy per the Phase 10 build log: BRONZE 0+, SILVER 500+,
// GOLD 2000+, PLATINUM 5000+ points; 1 point per GHS 1 spent (floored).
// Revisit with real usage data before launch.
const TIER_THRESHOLDS: { tier: LoyaltyTier; minPoints: number }[] = [
  { tier: LoyaltyTier.PLATINUM, minPoints: 5000 },
  { tier: LoyaltyTier.GOLD, minPoints: 2000 },
  { tier: LoyaltyTier.SILVER, minPoints: 500 },
  { tier: LoyaltyTier.BRONZE, minPoints: 0 },
];

export function computeLoyaltyTier(points: number): LoyaltyTier {
  return TIER_THRESHOLDS.find((t) => points >= t.minPoints)?.tier ?? LoyaltyTier.BRONZE;
}

/**
 * Awards points for a completed sale/order total and re-computes the tier.
 * Shared by POS `createSale` and storefront `placeOrder` (Phase 10 fixed the
 * gap where only online orders earned points). Runs inside the caller's
 * transaction so points can't be awarded for a sale that rolls back.
 */
export async function awardLoyaltyPoints(
  tx: Prisma.TransactionClient,
  customerId: string,
  saleTotal: number
): Promise<void> {
  const pointsEarned = Math.max(0, Math.floor(saleTotal));
  if (pointsEarned === 0) return;

  const customer = await tx.customer.update({
    where: { id: customerId },
    data: { loyaltyPoints: { increment: pointsEarned } },
    select: { loyaltyPoints: true, loyaltyTier: true },
  });

  const newTier = computeLoyaltyTier(customer.loyaltyPoints);
  if (newTier !== customer.loyaltyTier) {
    await tx.customer.update({ where: { id: customerId }, data: { loyaltyTier: newTier } });
  }
}
