import { Prisma, PrismaClient, PrescriptionClassification } from "../generated/client";

const prisma = new PrismaClient();

const SHOWCASE_ORG_ID = process.env.SHOWCASE_ORG_ID ?? "00000000-0000-0000-0000-000000000001";
const SHOWCASE_SEED_KEY = "pharmacy-showcase-v1";

const branches = [
  {
    code: "SHOW-EAST",
    name: "Showcase Pharmacy East Legon",
    phone: "+233 30 250 1101",
    email: "eastlegon@showcase-pharmacy.demo",
    physicalAddress: "Lagos Avenue, East Legon, Accra",
    gpsLat: 5.6507,
    gpsLng: -0.1539,
    clinicalCareEnabled: true,
  },
  {
    code: "SHOW-OSU",
    name: "Showcase Pharmacy Osu",
    phone: "+233 30 250 1102",
    email: "osu@showcase-pharmacy.demo",
    physicalAddress: "Oxford Street, Osu, Accra",
    gpsLat: 5.556,
    gpsLng: -0.1827,
    clinicalCareEnabled: true,
  },
  {
    code: "SHOW-ADENTA",
    name: "Showcase Pharmacy Adenta",
    phone: "+233 30 250 1103",
    email: "adenta@showcase-pharmacy.demo",
    physicalAddress: "Adenta Barrier, Accra",
    gpsLat: 5.7043,
    gpsLng: -0.1685,
    clinicalCareEnabled: false,
  },
] as const;

const categoryNames = [
  "Pain & Fever",
  "Cold & Flu",
  "Vitamins & Wellness",
  "Baby & Family Care",
  "Skin & Personal Care",
  "Chronic Care",
  "Prescription Only",
] as const;

type CategoryName = (typeof categoryNames)[number];

type ProductSeed = {
  name: string;
  genericName: string;
  brandName: string;
  activeIngredient: string;
  strength: string;
  dosageForm: string;
  packSize: string;
  barcode: string;
  retailPrice: number;
  costPrice: number;
  classification: PrescriptionClassification;
  category: CategoryName;
  stock: [number, number, number];
};

const products: ProductSeed[] = [
  {
    name: "Paracetamol 500mg Tablets",
    genericName: "Paracetamol",
    brandName: "Nexus Relief",
    activeIngredient: "Paracetamol",
    strength: "500mg",
    dosageForm: "Tablet",
    packSize: "100 tablets",
    barcode: "SHOW-PARA-500",
    retailPrice: 12.5,
    costPrice: 7,
    classification: "OTC",
    category: "Pain & Fever",
    stock: [120, 95, 80],
  },
  {
    name: "Ibuprofen 200mg Tablets",
    genericName: "Ibuprofen",
    brandName: "IbuCare",
    activeIngredient: "Ibuprofen",
    strength: "200mg",
    dosageForm: "Tablet",
    packSize: "50 tablets",
    barcode: "SHOW-IBU-200",
    retailPrice: 18,
    costPrice: 10,
    classification: "OTC",
    category: "Pain & Fever",
    stock: [60, 55, 40],
  },
  {
    name: "Cetirizine 10mg Tablets",
    genericName: "Cetirizine",
    brandName: "CetiClear",
    activeIngredient: "Cetirizine",
    strength: "10mg",
    dosageForm: "Tablet",
    packSize: "30 tablets",
    barcode: "SHOW-CET-10",
    retailPrice: 20,
    costPrice: 11,
    classification: "OTC",
    category: "Cold & Flu",
    stock: [50, 44, 30],
  },
  {
    name: "Cough Syrup Honey & Lemon",
    genericName: "Dextromethorphan",
    brandName: "SootheCough",
    activeIngredient: "Dextromethorphan",
    strength: "15mg/5ml",
    dosageForm: "Syrup",
    packSize: "100ml",
    barcode: "SHOW-COUGH-100",
    retailPrice: 28,
    costPrice: 16,
    classification: "OTC",
    category: "Cold & Flu",
    stock: [40, 36, 28],
  },
  {
    name: "Vitamin C + Zinc Effervescent",
    genericName: "Ascorbic Acid + Zinc",
    brandName: "Well-C Boost",
    activeIngredient: "Vitamin C, Zinc",
    strength: "1000mg + 10mg",
    dosageForm: "Effervescent tablet",
    packSize: "20 tablets",
    barcode: "SHOW-VITC-ZINC",
    retailPrice: 45,
    costPrice: 27,
    classification: "OTC",
    category: "Vitamins & Wellness",
    stock: [42, 70, 36],
  },
  {
    name: "Omega-3 Fish Oil Capsules",
    genericName: "Omega-3",
    brandName: "PureOmega",
    activeIngredient: "Fish Oil",
    strength: "1000mg",
    dosageForm: "Softgel",
    packSize: "60 capsules",
    barcode: "SHOW-OMEGA-60",
    retailPrice: 65,
    costPrice: 38,
    classification: "OTC",
    category: "Vitamins & Wellness",
    stock: [30, 34, 24],
  },
  {
    name: "Infant Paracetamol Suspension",
    genericName: "Paracetamol",
    brandName: "Junior Relief",
    activeIngredient: "Paracetamol",
    strength: "120mg/5ml",
    dosageForm: "Suspension",
    packSize: "60ml",
    barcode: "SHOW-JUNIOR-60",
    retailPrice: 17,
    costPrice: 9,
    classification: "OTC",
    category: "Baby & Family Care",
    stock: [46, 40, 32],
  },
  {
    name: "Diaper Rash Cream",
    genericName: "Zinc Oxide",
    brandName: "SoftGuard",
    activeIngredient: "Zinc Oxide",
    strength: "15%",
    dosageForm: "Cream",
    packSize: "50g",
    barcode: "SHOW-RASH-50",
    retailPrice: 26,
    costPrice: 15,
    classification: "OTC",
    category: "Baby & Family Care",
    stock: [30, 28, 20],
  },
  {
    name: "Gentle Skin Cleanser",
    genericName: "Cleansing Lotion",
    brandName: "PureSkin",
    activeIngredient: "N/A",
    strength: "N/A",
    dosageForm: "Lotion",
    packSize: "125ml",
    barcode: "SHOW-CLEANSE-125",
    retailPrice: 34.9,
    costPrice: 20,
    classification: "OTC",
    category: "Skin & Personal Care",
    stock: [40, 36, 28],
  },
  {
    name: "Metformin 500mg Tablets",
    genericName: "Metformin",
    brandName: "GlucoBalance",
    activeIngredient: "Metformin",
    strength: "500mg",
    dosageForm: "Tablet",
    packSize: "60 tablets",
    barcode: "SHOW-MET-500",
    retailPrice: 32,
    costPrice: 18,
    classification: "POM",
    category: "Chronic Care",
    stock: [46, 40, 34],
  },
  {
    name: "Amlodipine 5mg Tablets",
    genericName: "Amlodipine",
    brandName: "PressureEase",
    activeIngredient: "Amlodipine Besylate",
    strength: "5mg",
    dosageForm: "Tablet",
    packSize: "30 tablets",
    barcode: "SHOW-AMLO-5",
    retailPrice: 28,
    costPrice: 16,
    classification: "POM",
    category: "Chronic Care",
    stock: [38, 34, 26],
  },
  {
    name: "Tramadol 50mg Capsules",
    genericName: "Tramadol",
    brandName: "Rx Pain Control",
    activeIngredient: "Tramadol Hydrochloride",
    strength: "50mg",
    dosageForm: "Capsule",
    packSize: "20 capsules",
    barcode: "SHOW-TRAM-50",
    retailPrice: 42,
    costPrice: 26,
    classification: "RESTRICTED",
    category: "Prescription Only",
    stock: [18, 15, 10],
  },
];

function storefrontTaxConfig(categoryName: string): Prisma.InputJsonValue {
  return {
    showcaseSeed: true,
    showcaseSeedKey: SHOWCASE_SEED_KEY,
    storefront: {
      categoryName,
      imageUrl: null,
    },
  };
}

async function main() {
  const organisation = await prisma.organisation.upsert({
    where: { id: SHOWCASE_ORG_ID },
    create: {
      id: SHOWCASE_ORG_ID,
      name: "NexusPharma Showcase",
      settings: {
        branding: {
          brandName: "NexusPharma",
          primaryColor: "#0f766e",
          storefrontHeadline: "Your Health, Our Priority",
          storefrontSubheadline: "Trusted medicines, advanced care, delivered from the branch near you.",
        },
      },
    },
    update: {},
  });

  const branchRows = [];
  for (const branchInput of branches) {
    const warehouse = await prisma.warehouse.upsert({
      where: { id: `showcase_wh_${branchInput.code.toLowerCase().replace(/[^a-z0-9]+/g, "_")}` },
      create: {
        id: `showcase_wh_${branchInput.code.toLowerCase().replace(/[^a-z0-9]+/g, "_")}`,
        organisationId: organisation.id,
        name: `${branchInput.name} Warehouse`,
        location: branchInput.physicalAddress,
      },
      update: {
        name: `${branchInput.name} Warehouse`,
        location: branchInput.physicalAddress,
      },
    });

    const branch = await prisma.branch.upsert({
      where: { organisationId_code: { organisationId: organisation.id, code: branchInput.code } },
      create: {
        ...branchInput,
        organisationId: organisation.id,
        defaultWarehouseId: warehouse.id,
      },
      update: {
        ...branchInput,
        defaultWarehouseId: warehouse.id,
        isActive: true,
      },
    });
    branchRows.push(branch);
  }

  const categoryByName = new Map<CategoryName, string>();
  for (const name of categoryNames) {
    const existing = await prisma.category.findFirst({
      where: { organisationId: organisation.id, name, parentCategoryId: null },
    });
    const category =
      existing ??
      (await prisma.category.create({
        data: { organisationId: organisation.id, name },
      }));
    categoryByName.set(name, category.id);
  }

  for (const productInput of products) {
    const product = await prisma.product.upsert({
      where: { organisationId_barcode: { organisationId: organisation.id, barcode: productInput.barcode } },
      create: {
        organisationId: organisation.id,
        name: productInput.name,
        genericName: productInput.genericName,
        brandName: productInput.brandName,
        activeIngredient: productInput.activeIngredient,
        strength: productInput.strength,
        dosageForm: productInput.dosageForm,
        packSize: productInput.packSize,
        barcode: productInput.barcode,
        categoryId: categoryByName.get(productInput.category),
        costPrice: productInput.costPrice,
        retailPrice: productInput.retailPrice,
        minSellingPrice: productInput.retailPrice * 0.9,
        prescriptionClassification: productInput.classification,
        reorderLevel: 20,
        minStock: 20,
        maxStock: 200,
        storageConditions: "Store below 30C in a dry place",
        taxConfig: storefrontTaxConfig(productInput.category),
      },
      update: {
        name: productInput.name,
        genericName: productInput.genericName,
        brandName: productInput.brandName,
        categoryId: categoryByName.get(productInput.category),
        costPrice: productInput.costPrice,
        retailPrice: productInput.retailPrice,
        minSellingPrice: productInput.retailPrice * 0.9,
        prescriptionClassification: productInput.classification,
        isActive: true,
        taxConfig: storefrontTaxConfig(productInput.category),
      },
    });

    const batch = await prisma.batch.upsert({
      where: { productId_batchNumber: { productId: product.id, batchNumber: "SHOWCASE-2026-A" } },
      create: {
        productId: product.id,
        batchNumber: "SHOWCASE-2026-A",
        manufacturingDate: new Date("2026-01-15"),
        expiryDate: new Date("2028-01-15"),
        costPriceAtReceipt: productInput.costPrice,
      },
      update: {
        manufacturingDate: new Date("2026-01-15"),
        expiryDate: new Date("2028-01-15"),
        costPriceAtReceipt: productInput.costPrice,
      },
    });

    for (const [index, branch] of branchRows.entries()) {
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

  console.log(`Seeded ${branchRows.length} showcase branches and ${products.length} showcase drugs.`);
  console.log(`Organisation ID: ${organisation.id}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
