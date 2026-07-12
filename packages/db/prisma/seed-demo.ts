import {
  PrismaClient,
  PrescriptionClassification,
} from "../generated/client";

const prisma = new PrismaClient();

const ORG_ID = process.env.DEMO_ORGANISATION_ID ?? "00000000-0000-0000-0000-000000000001";
const ADMIN_UID = process.env.DEMO_ADMIN_UID ?? "DEMO_SUPER_ADMIN_UID_PLACEHOLDER";
const ADMIN_EMAIL = process.env.DEMO_ADMIN_EMAIL ?? "admin@pharmacy.com";

const branches = [
  {
    name: "Nexus Pharma East Legon",
    code: "EAST-LEGON",
    phone: "+233 30 250 1101",
    email: "eastlegon@nexuspharma.gh",
    physicalAddress: "Lagos Avenue, East Legon, Accra",
    gpsLat: 5.6507,
    gpsLng: -0.1539,
    clinicalCareEnabled: true,
  },
  {
    name: "Nexus Pharma Osu",
    code: "OSU",
    phone: "+233 30 250 1102",
    email: "osu@nexuspharma.gh",
    physicalAddress: "Oxford Street, Osu, Accra",
    gpsLat: 5.556,
    gpsLng: -0.1827,
    clinicalCareEnabled: true,
  },
  {
    name: "Nexus Pharma Adenta",
    code: "ADENTA",
    phone: "+233 30 250 1103",
    email: "adenta@nexuspharma.gh",
    physicalAddress: "Adenta Barrier, Accra",
    gpsLat: 5.7043,
    gpsLng: -0.1685,
    clinicalCareEnabled: true,
  },
  {
    name: "Nexus Pharma Tema",
    code: "TEMA",
    phone: "+233 30 250 1104",
    email: "tema@nexuspharma.gh",
    physicalAddress: "Community 11, Tema, Greater Accra",
    gpsLat: 5.6696,
    gpsLng: -0.0287,
    clinicalCareEnabled: true,
  },
  {
    name: "Nexus Pharma Spintex",
    code: "SPINTEX",
    phone: "+233 30 250 1105",
    email: "spintex@nexuspharma.gh",
    physicalAddress: "Spintex Road, Accra",
    gpsLat: 5.6263,
    gpsLng: -0.1196,
    clinicalCareEnabled: false,
  },
  {
    name: "Nexus Pharma Kumasi Ahodwo",
    code: "KSI-AHODWO",
    phone: "+233 32 250 1106",
    email: "kumasi@nexuspharma.gh",
    physicalAddress: "Ahodwo Roundabout, Kumasi",
    gpsLat: 6.6622,
    gpsLng: -1.621,
    clinicalCareEnabled: true,
  },
  {
    name: "Nexus Pharma Kumasi Kejetia",
    code: "KSI-KEJE",
    phone: "+233 32 250 1107",
    email: "kejetia@nexuspharma.gh",
    physicalAddress: "Kejetia Market, Kumasi",
    gpsLat: 6.6953,
    gpsLng: -1.6271,
    clinicalCareEnabled: false,
  },
  {
    name: "Nexus Pharma Takoradi",
    code: "TAKORADI",
    phone: "+233 31 250 1108",
    email: "takoradi@nexuspharma.gh",
    physicalAddress: "Market Circle, Takoradi",
    gpsLat: 4.9126,
    gpsLng: -1.7736,
    clinicalCareEnabled: true,
  },
  {
    name: "Nexus Pharma Tamale",
    code: "TAMALE",
    phone: "+233 37 250 1109",
    email: "tamale@nexuspharma.gh",
    physicalAddress: "Tamale Central, Northern Region",
    gpsLat: 9.3989,
    gpsLng: -0.8408,
    clinicalCareEnabled: true,
  },
  {
    name: "Nexus Pharma Cape Coast",
    code: "CAPE-COAST",
    phone: "+233 33 250 1110",
    email: "capecoast@nexuspharma.gh",
    physicalAddress: "Kotokuraba Market, Cape Coast",
    gpsLat: 5.1057,
    gpsLng: -1.2471,
    clinicalCareEnabled: false,
  },
];

const categories = [
  { name: "Pain & Fever", icon: "thermometer" },
  { name: "Cold, Cough & Flu", icon: "virus" },
  { name: "Vitamins & Supplements", icon: "heart" },
  { name: "Antibiotics & Prescription", icon: "pill" },
  { name: "Baby & Child Health", icon: "baby" },
  { name: "First Aid & Wound Care", icon: "bandage" },
  { name: "Allergies & Skin", icon: "sparkles" },
  { name: "Malaria & Infections", icon: "bug" },
  { name: "Diabetes & Hypertension", icon: "activity" },
  { name: "Digestive Health", icon: "stomach" },
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
    category: "Pain & Fever",
    stock: [120, 95, 80, 110, 85, 100, 70, 90, 60, 75],
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
    category: "Pain & Fever",
    stock: [60, 55, 40, 48, 35, 50, 30, 42, 25, 38],
  },
  {
    name: "Diclofenac Gel 1%",
    genericName: "Diclofenac Diethylamine",
    brandName: "JointEase",
    activeIngredient: "Diclofenac",
    strength: "1%",
    dosageForm: "Gel",
    packSize: "30g tube",
    barcode: "DEMO-DICLO-GEL",
    retailPrice: 28,
    costPrice: 16,
    classification: PrescriptionClassification.OTC,
    category: "Pain & Fever",
    stock: [40, 35, 28, 32, 25, 38, 22, 30, 18, 26],
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
    category: "Vitamins & Supplements",
    stock: [42, 70, 36, 58, 50, 65, 30, 48, 25, 40],
  },
  {
    name: "Multivitamin Tablets",
    genericName: "Multivitamin",
    brandName: "DailyVita",
    activeIngredient: "Vitamins A, B, C, D, E",
    strength: "Complete formula",
    dosageForm: "Tablet",
    packSize: "30 tablets",
    barcode: "DEMO-MULTI-VIT",
    retailPrice: 38,
    costPrice: 22,
    classification: PrescriptionClassification.OTC,
    category: "Vitamins & Supplements",
    stock: [55, 48, 40, 50, 35, 52, 28, 45, 30, 42],
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
    category: "Digestive Health",
    stock: [84, 76, 68, 90, 60, 80, 50, 72, 45, 65],
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
    category: "Allergies & Skin",
    stock: [50, 44, 30, 36, 28, 42, 22, 34, 20, 32],
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
    category: "Antibiotics & Prescription",
    stock: [32, 28, 20, 26, 18, 30, 15, 24, 12, 22],
  },
  {
    name: "Artemether-Lumefantrine 80/480mg",
    genericName: "Artemether + Lumefantrine",
    brandName: "MalNex",
    activeIngredient: "Artemether, Lumefantrine",
    strength: "80mg/480mg",
    dosageForm: "Tablet",
    packSize: "24 tablets",
    barcode: "DEMO-AL-80-480",
    retailPrice: 65,
    costPrice: 42,
    classification: PrescriptionClassification.POM,
    category: "Malaria & Infections",
    stock: [28, 24, 18, 22, 16, 26, 14, 20, 10, 18],
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
    category: "Diabetes & Hypertension",
    stock: [46, 40, 34, 52, 30, 44, 28, 38, 22, 36],
  },
  {
    name: "Amlodipine 5mg Tablets",
    genericName: "Amlodipine",
    brandName: "CardioCalm",
    activeIngredient: "Amlodipine",
    strength: "5mg",
    dosageForm: "Tablet",
    packSize: "30 tablets",
    barcode: "DEMO-AMLO-5",
    retailPrice: 28,
    costPrice: 16,
    classification: PrescriptionClassification.POM,
    category: "Diabetes & Hypertension",
    stock: [38, 32, 26, 40, 24, 36, 20, 30, 18, 28],
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
    category: "Baby & Child Health",
    stock: [35, 48, 25, 40, 30, 45, 20, 38, 18, 32],
  },
  {
    name: "Baby Paracetamol Suspension",
    genericName: "Paracetamol",
    brandName: "FeverEase Baby",
    activeIngredient: "Paracetamol",
    strength: "120mg/5ml",
    dosageForm: "Suspension",
    packSize: "60ml bottle",
    barcode: "DEMO-BABY-PARA",
    retailPrice: 22,
    costPrice: 12,
    classification: PrescriptionClassification.OTC,
    category: "Baby & Child Health",
    stock: [30, 42, 22, 36, 28, 40, 18, 34, 15, 28],
  },
  {
    name: "Cough Syrup (Dextromethorphan)",
    genericName: "Dextromethorphan HBr",
    brandName: "CoughCalm",
    activeIngredient: "Dextromethorphan",
    strength: "15mg/5ml",
    dosageForm: "Syrup",
    packSize: "100ml bottle",
    barcode: "DEMO-COUGH-DM",
    retailPrice: 30,
    costPrice: 17,
    classification: PrescriptionClassification.OTC,
    category: "Cold, Cough & Flu",
    stock: [36, 30, 24, 28, 22, 34, 18, 26, 16, 24],
  },
  {
    name: "Chlorpheniramine 4mg Tablets",
    genericName: "Chlorpheniramine Maleate",
    brandName: "AllerStop",
    activeIngredient: "Chlorpheniramine",
    strength: "4mg",
    dosageForm: "Tablet",
    packSize: "50 tablets",
    barcode: "DEMO-CHLOR-4",
    retailPrice: 14,
    costPrice: 7,
    classification: PrescriptionClassification.OTC,
    category: "Allergies & Skin",
    stock: [58, 50, 40, 48, 35, 52, 30, 45, 28, 40],
  },
  {
    name: "Hydrocortisone Cream 1%",
    genericName: "Hydrocortisone",
    brandName: "SkinCalm",
    activeIngredient: "Hydrocortisone",
    strength: "1%",
    dosageForm: "Cream",
    packSize: "15g tube",
    barcode: "DEMO-HC-CREAM",
    retailPrice: 26,
    costPrice: 14,
    classification: PrescriptionClassification.OTC,
    category: "Allergies & Skin",
    stock: [40, 36, 28, 34, 24, 38, 20, 30, 18, 26],
  },
  {
    name: "Omeprazole 20mg Capsules",
    genericName: "Omeprazole",
    brandName: "AcidShield",
    activeIngredient: "Omeprazole",
    strength: "20mg",
    dosageForm: "Capsule",
    packSize: "28 capsules",
    barcode: "DEMO-OME-20",
    retailPrice: 35,
    costPrice: 20,
    classification: PrescriptionClassification.POM,
    category: "Digestive Health",
    stock: [42, 36, 30, 38, 28, 40, 24, 34, 20, 30],
  },
  {
    name: "Zinc Tablets 20mg",
    genericName: "Zinc Sulphate",
    brandName: "ZincBoost",
    activeIngredient: "Zinc",
    strength: "20mg",
    dosageForm: "Tablet",
    packSize: "30 tablets",
    barcode: "DEMO-ZINC-20",
    retailPrice: 18,
    costPrice: 9,
    classification: PrescriptionClassification.OTC,
    category: "Vitamins & Supplements",
    stock: [65, 58, 50, 60, 45, 55, 40, 52, 35, 48],
  },
  {
    name: "Adhesive Bandages (Assorted)",
    genericName: "Adhesive Bandage",
    brandName: "SafeShield",
    activeIngredient: "N/A",
    strength: "Assorted size",
    dosageForm: "Bandage",
    packSize: "50 pieces",
    barcode: "DEMO-BANDAGE",
    retailPrice: 20,
    costPrice: 10,
    classification: PrescriptionClassification.OTC,
    category: "First Aid & Wound Care",
    stock: [48, 42, 36, 44, 32, 46, 28, 40, 25, 36],
  },
  {
    name: "Methylated Spirits 500ml",
    genericName: "Denatured Ethanol",
    brandName: "PureClean",
    activeIngredient: "Ethanol",
    strength: "70%",
    dosageForm: "Liquid",
    packSize: "500ml bottle",
    barcode: "DEMO-METH-SPIRIT",
    retailPrice: 16,
    costPrice: 8,
    classification: PrescriptionClassification.OTC,
    category: "First Aid & Wound Care",
    stock: [52, 46, 38, 48, 34, 50, 30, 42, 28, 38],
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
    throw new Error("System role super_admin not found. Run the system seed first.");
  }

  const createdCategories: Record<string, string> = {};
  for (const cat of categories) {
    let record = await prisma.category.findFirst({
      where: { organisationId: ORG_ID, name: cat.name, parentCategoryId: null },
    });
    if (!record) {
      record = await prisma.category.create({
        data: { organisationId: ORG_ID, name: cat.name },
      });
    } else {
      record = await prisma.category.update({
        where: { id: record.id },
        data: { name: cat.name },
      });
    }
    createdCategories[cat.name] = record.id;
  }

  const createdBranches = [];
  for (const branchInput of branches) {
    const whId = `demo_wh_${branchInput.code.toLowerCase().replace(/[^a-z0-9]+/g, "_")}`;
    const warehouse = await prisma.warehouse.upsert({
      where: { id: whId },
      create: {
        id: whId,
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
      firebaseUid: ADMIN_UID,
      organisationId: ORG_ID,
      name: "Demo Super Admin",
      email: ADMIN_EMAIL,
      isActive: true,
      primaryBranchId: createdBranches[0]?.id,
    },
    update: {
      name: "Demo Super Admin",
      email: ADMIN_EMAIL,
      isActive: true,
      primaryBranchId: createdBranches[0]?.id,
    },
  });

  const existingGrant = await prisma.userRole.findFirst({
    where: { userId: admin.id, roleId: superAdminRole.id, branchId: null },
  });
  if (!existingGrant) {
    await prisma.userRole.create({
      data: { userId: admin.id, roleId: superAdminRole.id, branchId: null },
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
        categoryId: createdCategories[productInput.category] ?? null,
        costPrice: productInput.costPrice,
        retailPrice: productInput.retailPrice,
        minSellingPrice: Number((productInput.retailPrice * 0.9).toFixed(2)),
        prescriptionClassification: productInput.classification,
        reorderLevel: 20,
        minStock: 10,
        maxStock: 200,
        storageConditions: "Store below 30°C in a dry place",
      },
      update: {
        name: productInput.name,
        genericName: productInput.genericName,
        brandName: productInput.brandName,
        activeIngredient: productInput.activeIngredient,
        strength: productInput.strength,
        dosageForm: productInput.dosageForm,
        packSize: productInput.packSize,
        categoryId: createdCategories[productInput.category] ?? null,
        costPrice: productInput.costPrice,
        retailPrice: productInput.retailPrice,
        minSellingPrice: Number((productInput.retailPrice * 0.9).toFixed(2)),
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
      const qty = productInput.stock[index] ?? 25;
      if (qty > 0) {
        await prisma.branchStock.upsert({
          where: { branchId_batchId: { branchId: branch.id, batchId: batch.id } },
          create: {
            branchId: branch.id,
            productId: product.id,
            batchId: batch.id,
            quantityOnHand: qty,
          },
          update: {
            quantityOnHand: qty,
          },
        });
      }
    }
  }

  console.log(`\n✅ Nexus Pharma — Demo data seeded successfully.`);
  console.log(`   Organisation:  ${organisation.name} (${ORG_ID})`);
  console.log(`   Branches:      ${createdBranches.length}`);
  for (const b of createdBranches) {
    console.log(`     - ${b.name} (${b.physicalAddress})`);
  }
  console.log(`   Categories:    ${categories.length}`);
  console.log(`   Products:      ${products.length}`);
  console.log(`   Super Admin:   ${ADMIN_EMAIL} (UID: ${ADMIN_UID})`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
