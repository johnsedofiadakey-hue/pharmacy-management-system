import { Prisma } from "@pharmacy-os/db";

export type ProductDisplayInput = Partial<{
  storefrontImageUrl: string | null;
  storefrontCategoryName: string | null;
}>;

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function stringOrNull(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export function getProductDisplay(taxConfig: unknown): {
  storefrontImageUrl: string | null;
  storefrontCategoryName: string | null;
  isShowcase: boolean;
} {
  const root = asRecord(taxConfig);
  const storefront = asRecord(root.storefront);
  return {
    storefrontImageUrl: stringOrNull(storefront.imageUrl),
    storefrontCategoryName: stringOrNull(storefront.categoryName),
    isShowcase: root.showcaseSeed === true || root.showcaseSeedKey === "pharmacy-showcase-v1",
  };
}

export function mergeProductDisplay(taxConfig: unknown, input: ProductDisplayInput): Prisma.InputJsonValue {
  const root = asRecord(taxConfig);
  const storefront = asRecord(root.storefront);
  const nextStorefront: Record<string, unknown> = { ...storefront };

  if (input.storefrontImageUrl !== undefined) {
    nextStorefront.imageUrl = typeof input.storefrontImageUrl === "string" ? input.storefrontImageUrl.trim() : null;
  }
  if (input.storefrontCategoryName !== undefined) {
    nextStorefront.categoryName =
      typeof input.storefrontCategoryName === "string" ? input.storefrontCategoryName.trim() : null;
  }

  return {
    ...root,
    storefront: nextStorefront,
  } as Prisma.InputJsonValue;
}
