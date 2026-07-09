import { onCall, HttpsError } from "firebase-functions/v2/https";
import { z } from "zod";
import { prisma, Prisma, PermissionResource, PermissionAction, PrescriptionClassification } from "@pharmacy-os/db";
import { getCallerUser } from "../lib/authContext";
import { requirePermission } from "../lib/permissions";

const createProductSchema = z.object({
  name: z.string().min(1),
  genericName: z.string().optional(),
  brandName: z.string().optional(),
  activeIngredient: z.string().optional(),
  strength: z.string().optional(),
  dosageForm: z.string().optional(),
  packSize: z.string().optional(),
  manufacturer: z.string().optional(),
  countryOfOrigin: z.string().optional(),
  categoryId: z.string().uuid().optional(),
  barcode: z.string().optional(),
  sku: z.string().optional(),
  fdaRegistrationNumber: z.string().optional(),
  registrationStatus: z.string().optional(),
  registrationExpiry: z.string().datetime().optional(),
  prescriptionClassification: z.nativeEnum(PrescriptionClassification).optional(),
  controlledStatus: z.string().optional(),
  trackBatch: z.boolean().optional(),
  trackExpiry: z.boolean().optional(),
  minStock: z.number().int().optional(),
  maxStock: z.number().int().optional(),
  reorderLevel: z.number().int().optional(),
  storageConditions: z.string().optional(),
  costPrice: z.number().optional(),
  wholesalePrice: z.number().optional(),
  retailPrice: z.number().optional(),
  minSellingPrice: z.number().optional(),
  taxConfig: z.record(z.string(), z.unknown()).optional(),
  maxDiscountPercent: z.number().optional(),
});

export const createProduct = onCall(async (request) => {
  const caller = await getCallerUser(request);

  await requirePermission({
    userId: caller.id,
    organisationId: caller.organisationId,
    branchId: null,
    resource: PermissionResource.PRODUCTS,
    action: PermissionAction.CREATE,
  });

  const parsed = createProductSchema.safeParse(request.data);
  if (!parsed.success) {
    throw new HttpsError("invalid-argument", parsed.error.message);
  }
  const input = parsed.data;

  const product = await prisma.product.create({
    data: {
      organisationId: caller.organisationId,
      name: input.name,
      genericName: input.genericName,
      brandName: input.brandName,
      activeIngredient: input.activeIngredient,
      strength: input.strength,
      dosageForm: input.dosageForm,
      packSize: input.packSize,
      manufacturer: input.manufacturer,
      countryOfOrigin: input.countryOfOrigin,
      categoryId: input.categoryId,
      barcode: input.barcode,
      sku: input.sku,
      fdaRegistrationNumber: input.fdaRegistrationNumber,
      registrationStatus: input.registrationStatus,
      registrationExpiry: input.registrationExpiry ? new Date(input.registrationExpiry) : undefined,
      prescriptionClassification: input.prescriptionClassification,
      controlledStatus: input.controlledStatus,
      trackBatch: input.trackBatch,
      trackExpiry: input.trackExpiry,
      minStock: input.minStock,
      maxStock: input.maxStock,
      reorderLevel: input.reorderLevel,
      storageConditions: input.storageConditions,
      costPrice: input.costPrice,
      wholesalePrice: input.wholesalePrice,
      retailPrice: input.retailPrice,
      minSellingPrice: input.minSellingPrice,
      taxConfig: input.taxConfig as Prisma.InputJsonValue | undefined,
      maxDiscountPercent: input.maxDiscountPercent,
    },
  });

  return { product };
});
