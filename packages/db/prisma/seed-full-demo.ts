// Full client-demo seed: one organisation, 3 Accra branches, a real product
// catalogue, and a staff account per role per branch (created in both the
// Firebase Auth emulator and Postgres). Run against the Auth emulator only —
// never point AUTH_EMULATOR_HOST at a real project.
//
// Usage: AUTH_EMULATOR_HOST=localhost:9099 tsx prisma/seed-full-demo.ts

import { randomUUID } from "node:crypto";
import { PrismaClient, PrescriptionClassification } from "../generated/client";

const prisma = new PrismaClient();

const AUTH_EMULATOR_HOST = process.env.AUTH_EMULATOR_HOST ?? "localhost:9099";
const DEMO_PASSWORD = "Demo@12345";
const ORG_NAME = "Nexus Pharma";

const branchDefs = [
  {
    code: "EAST-LEGON",
    name: "Nexus Pharma East Legon",
    phone: "+233 30 250 1101",
    email: "eastlegon@nexuspharma.demo",
    physicalAddress: "Lagos Avenue, East Legon, Accra",
    gpsLat: 5.6507,
    gpsLng: -0.1539,
    clinicalCareEnabled: true,
  },
  {
    code: "OSU",
    name: "Nexus Pharma Osu",
    phone: "+233 30 250 1102",
    email: "osu@nexuspharma.demo",
    physicalAddress: "Oxford Street, Osu, Accra",
    gpsLat: 5.556,
    gpsLng: -0.1827,
    clinicalCareEnabled: true,
  },
  {
    code: "ADENTA",
    name: "Nexus Pharma Adenta",
    phone: "+233 30 250 1103",
    email: "adenta@nexuspharma.demo",
    physicalAddress: "Adenta Barrier, Accra",
    gpsLat: 5.7043,
    gpsLng: -0.1685,
    clinicalCareEnabled: false,
  },
] as const;

const categoryDefs = [
  "Pain & Fever",
  "Cold & Flu",
  "Vitamins & Wellness",
  "Baby & Family Care",
  "Skin & Personal Care",
  "Chronic Care",
  "Prescription Only",
] as const;

type ProductDef = {
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
  category: (typeof categoryDefs)[number];
  stock: [number, number, number];
};

const productDefs: ProductDef[] = [
  { name: "Paracetamol 500mg Tablets", genericName: "Paracetamol", brandName: "Nexus Relief", activeIngredient: "Paracetamol", strength: "500mg", dosageForm: "Tablet", packSize: "100 tablets", barcode: "NX-PARA-500", retailPrice: 12.5, costPrice: 7, classification: "OTC", category: "Pain & Fever", stock: [120, 95, 80] },
  { name: "Ibuprofen 200mg Tablets", genericName: "Ibuprofen", brandName: "IbuCare", activeIngredient: "Ibuprofen", strength: "200mg", dosageForm: "Tablet", packSize: "50 tablets", barcode: "NX-IBU-200", retailPrice: 18, costPrice: 10, classification: "OTC", category: "Pain & Fever", stock: [60, 55, 40] },
  { name: "Diclofenac 50mg Tablets", genericName: "Diclofenac", brandName: "FlexEase", activeIngredient: "Diclofenac Sodium", strength: "50mg", dosageForm: "Tablet", packSize: "30 tablets", barcode: "NX-DICLO-50", retailPrice: 22, costPrice: 13, classification: "OTC", category: "Pain & Fever", stock: [45, 38, 30] },
  { name: "Aspirin 300mg Tablets", genericName: "Aspirin", brandName: "CardioGuard", activeIngredient: "Acetylsalicylic Acid", strength: "300mg", dosageForm: "Tablet", packSize: "100 tablets", barcode: "NX-ASP-300", retailPrice: 14, costPrice: 8, classification: "OTC", category: "Pain & Fever", stock: [70, 64, 50] },

  { name: "Cetirizine 10mg Tablets", genericName: "Cetirizine", brandName: "CetiClear", activeIngredient: "Cetirizine", strength: "10mg", dosageForm: "Tablet", packSize: "30 tablets", barcode: "NX-CET-10", retailPrice: 20, costPrice: 11, classification: "OTC", category: "Cold & Flu", stock: [50, 44, 30] },
  { name: "Cough Syrup — Honey & Lemon", genericName: "Dextromethorphan", brandName: "SootheCough", activeIngredient: "Dextromethorphan", strength: "15mg/5ml", dosageForm: "Syrup", packSize: "100ml", barcode: "NX-COUGH-100", retailPrice: 28, costPrice: 16, classification: "OTC", category: "Cold & Flu", stock: [40, 36, 28] },
  { name: "Decongestant Nasal Spray", genericName: "Xylometazoline", brandName: "ClearBreathe", activeIngredient: "Xylometazoline", strength: "0.1%", dosageForm: "Nasal spray", packSize: "10ml", barcode: "NX-NASAL-10", retailPrice: 24, costPrice: 14, classification: "OTC", category: "Cold & Flu", stock: [35, 30, 22] },
  { name: "Throat Lozenges — Menthol", genericName: "Benzocaine", brandName: "ThroatEase", activeIngredient: "Benzocaine", strength: "5mg", dosageForm: "Lozenge", packSize: "24 lozenges", barcode: "NX-LOZ-24", retailPrice: 10, costPrice: 5, classification: "OTC", category: "Cold & Flu", stock: [60, 55, 45] },

  { name: "Vitamin C + Zinc Effervescent", genericName: "Ascorbic Acid + Zinc", brandName: "Well-C Boost", activeIngredient: "Vitamin C, Zinc", strength: "1000mg + 10mg", dosageForm: "Effervescent tablet", packSize: "20 tablets", barcode: "NX-VITC-ZINC", retailPrice: 45, costPrice: 27, classification: "OTC", category: "Vitamins & Wellness", stock: [42, 70, 36] },
  { name: "Multivitamin Daily Tablets", genericName: "Multivitamin", brandName: "DailyVital", activeIngredient: "Multivitamin blend", strength: "Standard", dosageForm: "Tablet", packSize: "60 tablets", barcode: "NX-MULTI-60", retailPrice: 55, costPrice: 32, classification: "OTC", category: "Vitamins & Wellness", stock: [38, 42, 30] },
  { name: "Omega-3 Fish Oil Capsules", genericName: "Omega-3", brandName: "PureOmega", activeIngredient: "Fish Oil", strength: "1000mg", dosageForm: "Softgel", packSize: "60 capsules", barcode: "NX-OMEGA-60", retailPrice: 65, costPrice: 38, classification: "OTC", category: "Vitamins & Wellness", stock: [30, 34, 24] },
  { name: "Iron + Folic Acid Tablets", genericName: "Ferrous Sulphate + Folic Acid", brandName: "IronPlus", activeIngredient: "Ferrous Sulphate, Folic Acid", strength: "200mg + 0.4mg", dosageForm: "Tablet", packSize: "30 tablets", barcode: "NX-IRON-30", retailPrice: 19, costPrice: 11, classification: "OTC", category: "Vitamins & Wellness", stock: [48, 40, 32] },

  { name: "ORS Sachets", genericName: "Oral Rehydration Salts", brandName: "HydraSure", activeIngredient: "ORS", strength: "WHO formula", dosageForm: "Sachet", packSize: "10 sachets", barcode: "NX-ORS-10", retailPrice: 15, costPrice: 8, classification: "OTC", category: "Baby & Family Care", stock: [84, 76, 68] },
  { name: "Baby Saline Nasal Drops", genericName: "Sodium Chloride", brandName: "TinyBreathe", activeIngredient: "Sodium Chloride", strength: "0.65%", dosageForm: "Drops", packSize: "15ml", barcode: "NX-BABY-SALINE", retailPrice: 24, costPrice: 13, classification: "OTC", category: "Baby & Family Care", stock: [35, 48, 25] },
  { name: "Infant Paracetamol Suspension", genericName: "Paracetamol", brandName: "Nexus Junior", activeIngredient: "Paracetamol", strength: "120mg/5ml", dosageForm: "Suspension", packSize: "60ml", barcode: "NX-JUNIOR-60", retailPrice: 17, costPrice: 9, classification: "OTC", category: "Baby & Family Care", stock: [46, 40, 32] },
  { name: "Diaper Rash Cream", genericName: "Zinc Oxide", brandName: "SoftGuard", activeIngredient: "Zinc Oxide", strength: "15%", dosageForm: "Cream", packSize: "50g", barcode: "NX-RASH-50", retailPrice: 26, costPrice: 15, classification: "OTC", category: "Baby & Family Care", stock: [30, 28, 20] },

  { name: "Gentle Skin Cleanser", genericName: "Cleansing Lotion", brandName: "PureSkin", activeIngredient: "N/A", strength: "N/A", dosageForm: "Lotion", packSize: "125ml", barcode: "NX-CLEANSE-125", retailPrice: 34.9, costPrice: 20, classification: "OTC", category: "Skin & Personal Care", stock: [40, 36, 28] },
  { name: "Antiseptic Hand Sanitizer", genericName: "Ethanol Gel", brandName: "SafeHands", activeIngredient: "Ethanol 70%", strength: "70%", dosageForm: "Gel", packSize: "100ml", barcode: "NX-SANI-100", retailPrice: 16, costPrice: 8, classification: "OTC", category: "Skin & Personal Care", stock: [70, 62, 48] },
  { name: "Antifungal Cream", genericName: "Clotrimazole", brandName: "FungiClear", activeIngredient: "Clotrimazole", strength: "1%", dosageForm: "Cream", packSize: "20g", barcode: "NX-FUNGI-20", retailPrice: 21, costPrice: 12, classification: "OTC", category: "Skin & Personal Care", stock: [32, 28, 22] },

  { name: "Amoxicillin 500mg Capsules", genericName: "Amoxicillin", brandName: "AmoxiNex", activeIngredient: "Amoxicillin", strength: "500mg", dosageForm: "Capsule", packSize: "21 capsules", barcode: "NX-AMOX-500", retailPrice: 38, costPrice: 24, classification: "POM", category: "Prescription Only", stock: [32, 28, 20] },
  { name: "Metformin 500mg Tablets", genericName: "Metformin", brandName: "GlucoBalance", activeIngredient: "Metformin", strength: "500mg", dosageForm: "Tablet", packSize: "60 tablets", barcode: "NX-MET-500", retailPrice: 32, costPrice: 18, classification: "POM", category: "Chronic Care", stock: [46, 40, 34] },
  { name: "Amlodipine 5mg Tablets", genericName: "Amlodipine", brandName: "PressureEase", activeIngredient: "Amlodipine Besylate", strength: "5mg", dosageForm: "Tablet", packSize: "30 tablets", barcode: "NX-AMLO-5", retailPrice: 28, costPrice: 16, classification: "POM", category: "Chronic Care", stock: [38, 34, 26] },
  { name: "Atorvastatin 20mg Tablets", genericName: "Atorvastatin", brandName: "LipidControl", activeIngredient: "Atorvastatin Calcium", strength: "20mg", dosageForm: "Tablet", packSize: "30 tablets", barcode: "NX-ATOR-20", retailPrice: 36, costPrice: 21, classification: "POM", category: "Chronic Care", stock: [30, 26, 20] },
  { name: "Tramadol 50mg Capsules", genericName: "Tramadol", brandName: "Nexus Rx Pain", activeIngredient: "Tramadol Hydrochloride", strength: "50mg", dosageForm: "Capsule", packSize: "20 capsules", barcode: "NX-TRAM-50", retailPrice: 42, costPrice: 26, classification: "RESTRICTED", category: "Prescription Only", stock: [18, 15, 10] },
  { name: "Diazepam 5mg Tablets", genericName: "Diazepam", brandName: "Nexus Rx Calm", activeIngredient: "Diazepam", strength: "5mg", dosageForm: "Tablet", packSize: "20 tablets", barcode: "NX-DIAZ-5", retailPrice: 30, costPrice: 18, classification: "RESTRICTED", category: "Prescription Only", stock: [14, 12, 8] },
];

const supplierDefs = [
  { companyName: "Accra Pharma Distributors Ltd", contactPerson: "Kwame Asante", phone: "+233 24 400 1001", email: "orders@accrapharma.demo" },
  { companyName: "West Coast Medical Supplies", contactPerson: "Ama Boateng", phone: "+233 24 400 1002", email: "sales@westcoastmed.demo" },
];

type StaffDef = { role: string; namePrefix: string; branchIndex: number | null };

const staffDefs: StaffDef[] = [
  { role: "super_admin", namePrefix: "Super Admin", branchIndex: null },
  { role: "branch_manager", namePrefix: "Branch Manager", branchIndex: 0 },
  { role: "cashier", namePrefix: "Cashier", branchIndex: 0 },
  { role: "superintendent_pharmacist", namePrefix: "Pharmacist", branchIndex: 0 },
  { role: "branch_manager", namePrefix: "Branch Manager", branchIndex: 1 },
  { role: "cashier", namePrefix: "Cashier", branchIndex: 1 },
  { role: "superintendent_pharmacist", namePrefix: "Pharmacist", branchIndex: 1 },
  { role: "branch_manager", namePrefix: "Branch Manager", branchIndex: 2 },
  { role: "cashier", namePrefix: "Cashier", branchIndex: 2 },
];

function emailFor(role: string, branchCode: string | null): string {
  const slug = role.replace(/_/g, "-");
  return branchCode ? `${slug}.${branchCode.toLowerCase()}@nexuspharma.demo` : `${slug}@nexuspharma.demo`;
}

const FUNCTIONS_EMULATOR_HOST = process.env.FUNCTIONS_EMULATOR_HOST ?? "127.0.0.1:5001";
const FUNCTIONS_PROJECT_ID = process.env.FUNCTIONS_PROJECT_ID ?? "demo-pharmacy-os";

async function createAuthUser(email: string, password: string, displayName: string): Promise<{ uid: string; idToken: string }> {
  const res = await fetch(
    `http://${AUTH_EMULATOR_HOST}/identitytoolkit.googleapis.com/v1/accounts:signUp?key=demo-api-key`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, displayName, returnSecureToken: true }),
    }
  );
  const body = (await res.json()) as { localId?: string; idToken?: string; error?: { message: string } };
  if (res.ok && body.localId && body.idToken) {
    return { uid: body.localId, idToken: body.idToken };
  }

  // EMAIL_EXISTS on a re-run — sign in instead to get a fresh UID + idToken.
  if (body.error?.message === "EMAIL_EXISTS") {
    const signIn = await fetch(
      `http://${AUTH_EMULATOR_HOST}/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=demo-api-key`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, returnSecureToken: true }),
      }
    );
    const signInBody = (await signIn.json()) as { localId?: string; idToken?: string };
    if (signInBody.localId && signInBody.idToken) {
      return { uid: signInBody.localId, idToken: signInBody.idToken };
    }
  }
  throw new Error(`Failed to create auth user ${email}: ${body.error?.message ?? res.statusText}`);
}

/**
 * Custom claims + the Firestore `users/{uid}` mirror doc are normally set by
 * `computeAndSyncClaims`, called by the role-assignment Cloud Function right
 * after it writes `user_roles`. This seed writes `user_roles` directly via
 * Prisma, bypassing that — so without this call, every seeded account would
 * have no `orgId`/`roles` claims and `branch_live` Firestore reads would be
 * silently denied by firestore.rules (no error surfaced to the UI, dashboard
 * numbers just never appear). Self-resync needs no extra permission grant.
 */
async function syncClaims(idToken: string, userId: string): Promise<void> {
  const res = await fetch(
    `http://${FUNCTIONS_EMULATOR_HOST}/${FUNCTIONS_PROJECT_ID}/us-central1/syncUserClaims`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` },
      body: JSON.stringify({ data: { userId } }),
    }
  );
  if (!res.ok) {
    throw new Error(`Failed to sync claims for user ${userId}: ${res.status} ${await res.text()}`);
  }
}

async function main() {
  console.log(`Seeding against Auth emulator at ${AUTH_EMULATOR_HOST}...`);

  const organisation = await prisma.organisation.upsert({
    where: { id: "00000000-0000-0000-0000-000000000001" },
    create: { id: "00000000-0000-0000-0000-000000000001", name: ORG_NAME },
    update: { name: ORG_NAME },
  });

  const branches = [];
  for (const def of branchDefs) {
    const warehouse = await prisma.warehouse.upsert({
      where: { id: `demo_wh_${def.code.toLowerCase()}` },
      create: {
        id: `demo_wh_${def.code.toLowerCase()}`,
        organisationId: organisation.id,
        name: `${def.name} Warehouse`,
        location: def.physicalAddress,
      },
      update: { name: `${def.name} Warehouse`, location: def.physicalAddress },
    });
    const branch = await prisma.branch.upsert({
      where: { organisationId_code: { organisationId: organisation.id, code: def.code } },
      create: { ...def, organisationId: organisation.id, defaultWarehouseId: warehouse.id },
      update: { ...def, defaultWarehouseId: warehouse.id, isActive: true },
    });
    branches.push(branch);
  }
  console.log(`Branches ready: ${branches.map((b) => b.name).join(", ")}`);

  const categories = new Map<string, string>();
  for (const name of categoryDefs) {
    // Nullable parentCategoryId makes the compound unique constraint
    // unusable as an upsert `where` (Prisma rejects null there) — find-then-create instead.
    const existing = await prisma.category.findFirst({ where: { organisationId: organisation.id, name, parentCategoryId: null } });
    const category = existing ?? (await prisma.category.create({ data: { organisationId: organisation.id, name } }));
    categories.set(name, category.id);
  }
  console.log(`Categories ready: ${categories.size}`);

  for (const supplierDef of supplierDefs) {
    await prisma.supplier.upsert({
      where: { id: `demo_supplier_${supplierDef.companyName.toLowerCase().replace(/[^a-z0-9]+/g, "_")}` },
      create: { id: `demo_supplier_${supplierDef.companyName.toLowerCase().replace(/[^a-z0-9]+/g, "_")}`, organisationId: organisation.id, ...supplierDef },
      update: supplierDef,
    });
  }
  console.log(`Suppliers ready: ${supplierDefs.length}`);

  for (const productInput of productDefs) {
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
        categoryId: categories.get(productInput.category),
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
        categoryId: categories.get(productInput.category),
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
      update: { expiryDate: new Date("2028-01-15"), costPriceAtReceipt: productInput.costPrice },
    });

    for (const [index, branch] of branches.entries()) {
      await prisma.branchStock.upsert({
        where: { branchId_batchId: { branchId: branch.id, batchId: batch.id } },
        create: { branchId: branch.id, productId: product.id, batchId: batch.id, quantityOnHand: productInput.stock[index] ?? 25 },
        update: { quantityOnHand: productInput.stock[index] ?? 25 },
      });
    }
  }
  console.log(`Products ready: ${productDefs.length}`);

  const roleByName = new Map<string, string>();
  for (const staff of staffDefs) {
    if (!roleByName.has(staff.role)) {
      const role = await prisma.role.findFirst({ where: { organisationId: null, name: staff.role } });
      if (!role) throw new Error(`System role "${staff.role}" not found — run "pnpm db:seed" first.`);
      roleByName.set(staff.role, role.id);
    }
  }

  const credentials: { email: string; role: string; branch: string }[] = [];

  for (const staff of staffDefs) {
    const branch = staff.branchIndex != null ? branches[staff.branchIndex] : null;
    const email = emailFor(staff.role, branch?.code ?? null);
    const displayName = branch ? `${staff.namePrefix} — ${branch.name}` : staff.namePrefix;

    const { uid: firebaseUid, idToken } = await createAuthUser(email, DEMO_PASSWORD, displayName);

    const user = await prisma.user.upsert({
      where: { firebaseUid },
      create: {
        id: randomUUID(),
        firebaseUid,
        organisationId: organisation.id,
        name: displayName,
        email,
        isActive: true,
        primaryBranchId: branch?.id,
      },
      update: { organisationId: organisation.id, name: displayName, email, isActive: true, primaryBranchId: branch?.id },
    });

    const roleId = roleByName.get(staff.role)!;
    const existingGrant = await prisma.userRole.findFirst({
      where: { userId: user.id, roleId, branchId: branch?.id ?? null },
    });
    if (!existingGrant) {
      await prisma.userRole.create({ data: { userId: user.id, roleId, branchId: branch?.id ?? null } });
    }

    await syncClaims(idToken, user.id);

    credentials.push({ email, role: staff.role, branch: branch?.name ?? "Org-wide" });
  }

  console.log("\n=== Demo login credentials (password for all: Demo@12345) ===");
  for (const c of credentials) {
    console.log(`${c.email.padEnd(42)} ${c.role.padEnd(24)} ${c.branch}`);
  }
  console.log(`\nOrganisation ID: ${organisation.id}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
