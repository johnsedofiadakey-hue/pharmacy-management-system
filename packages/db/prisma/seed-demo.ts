import {
  PrismaClient,
  PrescriptionClassification,
} from "../generated/client";

const prisma = new PrismaClient();

const ORG_ID = process.env.DEMO_ORGANISATION_ID ?? "da80f9bb-ba2a-4ecc-944f-ad8057035a8b";
const ADMIN_UID = process.env.DEMO_ADMIN_UID ?? "cwMW0l7nlSdJH7pBSORTIx6aUmE2";
const ADMIN_EMAIL = process.env.DEMO_ADMIN_EMAIL ?? "admin@pharmacy.com";

const branches = [
  {
    name: "Nexus Pharma East Legon",
    code: "EAST-LEGON",
    phone: "+233 30 250 1101",
    email: "eastlegon@nexuspharma.test",
    physicalAddress: "Lagos Avenue, East Legon, Accra",
    gpsLat: 5.6507,
    gpsLng: -0.1539,
    clinicalCareEnabled: true,
  },
  {
    name: "Nexus Pharma Osu",
    code: "OSU",
    phone: "+233 30 250 1102",
    email: "osu@nexuspharma.test",
    physicalAddress: "Oxford Street, Osu, Accra",
    gpsLat: 5.556,
    gpsLng: -0.1827,
    clinicalCareEnabled: true,
  },
  {
    name: "Nexus Pharma Adenta",
    code: "ADENTA",
    phone: "+233 30 250 1103",
    email: "adenta@nexuspharma.test",
    physicalAddress: "Adenta Barrier, Accra",
    gpsLat: 5.7043,
    gpsLng: -0.1685,
    clinicalCareEnabled: false,
  },
  {
    name: "Nexus Pharma Kumasi Ahodwo",
    code: "KSI-AHODWO",
    phone: "+233 32 250 1104",
    email: "kumasi@nexuspharma.test",
    physicalAddress: "Ahodwo Roundabout, Kumasi",
    gpsLat: 6.6622,
    gpsLng: -1.621,
    clinicalCareEnabled: true,
  },
];

const products = [
  {
    name: "Paracetamol 500mg Tablets",
    genericName: "Paracetamol",
    brandName: "Nexus Relief",
    activeIngredient: "Paracetamol",
    strength: "500mg",
    dosageForm: "Tablet",
    packSize: "100 tablets",
    barcode: "DEMO-PARA-500",
    retailPrice: 12.5,
    costPrice: 7,
    classification: PrescriptionClassification.OTC,
    stock: [120, 95, 80, 110],
  },
  {
    name: "Ibuprofen 200mg Tablets",
    genericName: "Ibuprofen",
    brandName: "IbuCare",
    activeIngredient: "Ibuprofen",
    strength: "200mg",
    dosageForm: "Tablet",
    packSize: "50 tablets",
    barcode: "DEMO-IBU-200",
    retailPrice: 18,
    costPrice: 10,
    classification: PrescriptionClassification.OTC,
    stock: [60, 55, 40, 48],
  },
  {
    name: "Vitamin C + Zinc Effervescent",
    genericName: "Ascorbic Acid + Zinc",
    brandName: "Well-C Boost",
    activeIngredient: "Vitamin C, Zinc",
    strength: "1000mg + 10mg",
    dosageForm: "Effervescent tablet",
    packSize: "20 tablets",
    barcode: "DEMO-VITC-ZINC",
    retailPrice: 45,
    costPrice: 27,
    classification: PrescriptionClassification.OTC,
    stock: [42, 70, 36, 58],
  },
  {
    name: "ORS Sachets",
    genericName: "Oral Rehydration Salts",
    brandName: "HydraSure",
    activeIngredient: "ORS",
    strength: "WHO formula",
    dosageForm: "Sachet",
    packSize: "10 sachets",
    barcode: "DEMO-ORS-10",
    retailPrice: 15,
    costPrice: 8,
    classification: PrescriptionClassification.OTC,
    stock: [84, 76, 68, 90],
  },
  {
    name: "Cetirizine 10mg Tablets",
    genericName: "Cetirizine",
    brandName: "CetiClear",
    activeIngredient: "Cetirizine",
    strength: "10mg",
    dosageForm: "Tablet",
    packSize: "30 tablets",
    barcode: "DEMO-CET-10",
    retailPrice: 20,
    costPrice: 11,
    classification: PrescriptionClassification.OTC,
    stock: [50, 44, 30, 36],
  },
  {
    name: "Amoxicillin 500mg Capsules",
    genericName: "Amoxicillin",
    brandName: "AmoxiNex",
    activeIngredient: "Amoxicillin",
    strength: "500mg",
    dosageForm: "Capsule",
    packSize: "21 capsules",
    barcode: "DEMO-AMOX-500",
    retailPrice: 38,
    costPrice: 24,
    classification: PrescriptionClassification.POM,
    stock: [32, 28, 20, 26],
  },
  {
    name: "Metformin 500mg Tablets",
    genericName: "Metformin",
    brandName: "GlucoBalance",
    activeIngredient: "Metformin",
    strength: "500mg",
    dosageForm: "Tablet",
    packSize: "60 tablets",
    barcode: "DEMO-MET-500",
    retailPrice: 32,
    costPrice: 18,
    classification: PrescriptionClassification.POM,
    stock: [46, 40, 34, 52],
  },
  {
    name: "Baby Saline Nasal Drops",
    genericName: "Sodium Chloride",
    brandName: "TinyBreathe",
    activeIngredient: "Sodium Chloride",
    strength: "0.65%",
    dosageForm: "Drops",
    packSize: "15ml",
    barcode: "DEMO-BABY-SALINE",
    retailPrice: 24,
    costPrice: 13,
    classification: PrescriptionClassification.OTC,
    stock: [35, 48, 25, 40],
  },
];

async function main() {
  const organisation = await prisma.organisation.findUnique({ where: { id: ORG_ID } });
  if (!organisation) {
    throw new Error(`Organisation ${ORG_ID} was not found. Run the live starter seed first.`);
  }

  const superAdminRole = await prisma.role.findFirst({
    where: { organisationId: null, name: "super_admin" },
  });
  if (!superAdminRole) {
    throw new Error("System role super_admin was not found. Run pnpm --filter @pharmacy-os/db seed first.");
  }

  const createdBranches = [];
  for (const branchInput of branches) {
    const warehouse = await prisma.warehouse.upsert({
      where: { id: `demo_wh_${branchInput.code.toLowerCase().replace(/[^a-z0-9]+/g, "_")}` },
      create: {
        id: `demo_wh_${branchInput.code.toLowerCase().replace(/[^a-z0-9]+/g, "_")}`,
        organisationId: ORG_ID,
        name: `${branchInput.name} Warehouse`,
        location: branchInput.physicalAddress,
      },
      update: {
        name: `${branchInput.name} Warehouse`,
        location: branchInput.physicalAddress,
      },
    });

    const branch = await prisma.branch.upsert({
      where: { organisationId_code: { organisationId: ORG_ID, code: branchInput.code } },
      create: {
        ...branchInput,
        organisationId: ORG_ID,
        defaultWarehouseId: warehouse.id,
      },
      update: {
        ...branchInput,
        defaultWarehouseId: warehouse.id,
        isActive: true,
      },
    });
    createdBranches.push(branch);
  }

  const admin = await prisma.user.upsert({
    where: { firebaseUid: ADMIN_UID },
    create: {
      id: ADMIN_UID,
      firebaseUid: ADMIN_UID,
      organisationId: ORG_ID,
      name: "Demo Super Admin",
      email: ADMIN_EMAIL,
      isActive: true,
      primaryBranchId: createdBranches[0]?.id,
    },
    update: {
      organisationId: ORG_ID,
      name: "Demo Super Admin",
      email: ADMIN_EMAIL,
      isActive: true,
      primaryBranchId: createdBranches[0]?.id,
    },
  });

  const existingSuperAdminGrant = await prisma.userRole.findFirst({
    where: { userId: admin.id, roleId: superAdminRole.id, branchId: null },
  });
  if (!existingSuperAdminGrant) {
    await prisma.userRole.create({
      data: {
      userId: admin.id,
      roleId: superAdminRole.id,
      branchId: null,
      },
    });
  }

  for (const productInput of products) {
    const product = await prisma.product.upsert({
      where: { organisationId_barcode: { organisationId: ORG_ID, barcode: productInput.barcode } },
      create: {
        organisationId: ORG_ID,
        name: productInput.name,
        genericName: productInput.genericName,
        brandName: productInput.brandName,
        activeIngredient: productInput.activeIngredient,
        strength: productInput.strength,
        dosageForm: productInput.dosageForm,
        packSize: productInput.packSize,
        barcode: productInput.barcode,
        costPrice: productInput.costPrice,
        retailPrice: productInput.retailPrice,
        minSellingPrice: productInput.retailPrice * 0.9,
        prescriptionClassification: productInput.classification,
        reorderLevel: 20,
        minStock: 20,
        maxStock: 200,
        storageConditions: "Store below 30C in a dry place",
      },
      update: {
        name: productInput.name,
        genericName: productInput.genericName,
        brandName: productInput.brandName,
        activeIngredient: productInput.activeIngredient,
        strength: productInput.strength,
        dosageForm: productInput.dosageForm,
        packSize: productInput.packSize,
        costPrice: productInput.costPrice,
        retailPrice: productInput.retailPrice,
        minSellingPrice: productInput.retailPrice * 0.9,
        prescriptionClassification: productInput.classification,
        isActive: true,
      },
    });

    const batch = await prisma.batch.upsert({
      where: { productId_batchNumber: { productId: product.id, batchNumber: "DEMO-2026-A" } },
      create: {
        productId: product.id,
        batchNumber: "DEMO-2026-A",
        manufacturingDate: new Date("2026-01-15"),
        expiryDate: new Date("2028-01-15"),
        costPriceAtReceipt: productInput.costPrice,
      },
      update: {
        expiryDate: new Date("2028-01-15"),
        costPriceAtReceipt: productInput.costPrice,
      },
    });

    for (const [index, branch] of createdBranches.entries()) {
      await prisma.branchStock.upsert({
        where: { branchId_batchId: { branchId: branch.id, batchId: batch.id } },
        create: {
          branchId: branch.id,
          productId: product.id,
          batchId: batch.id,
          quantityOnHand: productInput.stock[index] ?? 25,
        },
        update: {
          quantityOnHand: productInput.stock[index] ?? 25,
        },
      });
    }
  }

  console.log(`Demo seeded for ${organisation.name}.`);
  console.log(`Branches: ${createdBranches.length}`);
  console.log(`Products: ${products.length}`);
  console.log(`Super Admin UID: ${ADMIN_UID}`);
  console.log(`Super Admin email: ${ADMIN_EMAIL}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
