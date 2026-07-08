// Seeds the system default roles (organisationId = null, isSystemDefault = true) and
// the full resource x action permission grid, per BLUEPRINT.md §5-6.
//
// "Senior Cashier" from the blueprint's custom-role example is intentionally NOT
// seeded here — it's an org-specific custom role a Super Admin creates later, not
// a system default.
//
// Delivery Rider is seeded with a minimal placeholder grant (VIEW on CUSTOMERS,
// for delivery address/contact) because the ORDERS/DELIVERIES resources don't exist
// in the permission model yet — those arrive with Phase 9 (delivery management),
// at which point this role's grants should be revisited.

import { PrismaClient, PermissionResource, PermissionAction } from "../generated/client";

const prisma = new PrismaClient();

const ALL_RESOURCES = Object.values(PermissionResource);
const ALL_ACTIONS = Object.values(PermissionAction);

type Grant = [PermissionResource, PermissionAction[]];

const ROLE_DEFINITIONS: { name: string; grants: Grant[] | "ALL" }[] = [
  {
    name: "super_admin",
    grants: "ALL",
  },
  {
    name: "head_office_admin",
    grants: [
      [PermissionResource.SALES, ["VIEW", "EDIT", "APPROVE", "EXPORT"]],
      [PermissionResource.PRODUCTS, ["VIEW", "CREATE", "EDIT"]],
      [PermissionResource.STOCK, ["VIEW", "EDIT", "APPROVE"]],
      [PermissionResource.PURCHASES, ["VIEW", "CREATE", "EDIT", "APPROVE"]],
      [PermissionResource.CUSTOMERS, ["VIEW", "EDIT"]],
      [PermissionResource.SUPPLIERS, ["VIEW", "CREATE", "EDIT"]],
      [PermissionResource.EMPLOYEES, ["VIEW", "CREATE", "EDIT"]],
      [PermissionResource.EXPENSES, ["VIEW", "APPROVE", "EXPORT"]],
      [PermissionResource.REPORTS, ["VIEW", "EXPORT"]],
      [PermissionResource.PRESCRIPTIONS, ["VIEW"]],
      [PermissionResource.PRICING, ["VIEW", "EDIT"]],
      [PermissionResource.TRANSFERS, ["VIEW", "APPROVE"]],
      [PermissionResource.RETURNS, ["VIEW", "APPROVE"]],
      [PermissionResource.BRANCHES, ["VIEW"]],
    ] as Grant[],
  },
  {
    name: "regional_manager",
    grants: [
      [PermissionResource.SALES, ["VIEW", "APPROVE", "EXPORT"]],
      [PermissionResource.PRODUCTS, ["VIEW"]],
      [PermissionResource.STOCK, ["VIEW", "EDIT", "APPROVE"]],
      [PermissionResource.PURCHASES, ["VIEW", "CREATE", "APPROVE"]],
      [PermissionResource.CUSTOMERS, ["VIEW"]],
      [PermissionResource.SUPPLIERS, ["VIEW"]],
      [PermissionResource.EMPLOYEES, ["VIEW", "CREATE", "EDIT"]],
      [PermissionResource.EXPENSES, ["VIEW", "APPROVE"]],
      [PermissionResource.REPORTS, ["VIEW", "EXPORT"]],
      [PermissionResource.PRESCRIPTIONS, ["VIEW"]],
      [PermissionResource.PRICING, ["VIEW"]],
      [PermissionResource.TRANSFERS, ["VIEW", "APPROVE"]],
      [PermissionResource.RETURNS, ["VIEW", "APPROVE"]],
      [PermissionResource.BRANCHES, ["VIEW"]],
    ] as Grant[],
  },
  {
    name: "branch_manager",
    grants: [
      [PermissionResource.SALES, ["VIEW", "CANCEL", "APPROVE"]],
      [PermissionResource.PRODUCTS, ["VIEW"]],
      [PermissionResource.STOCK, ["VIEW", "EDIT", "APPROVE"]],
      [PermissionResource.PURCHASES, ["VIEW"]],
      [PermissionResource.CUSTOMERS, ["VIEW"]],
      [PermissionResource.SUPPLIERS, ["VIEW"]],
      [PermissionResource.EMPLOYEES, ["VIEW", "CREATE", "EDIT"]],
      [PermissionResource.EXPENSES, ["VIEW", "CREATE", "APPROVE"]],
      [PermissionResource.REPORTS, ["VIEW", "EXPORT"]],
      [PermissionResource.PRESCRIPTIONS, ["VIEW"]],
      [PermissionResource.PRICING, ["VIEW"]],
      [PermissionResource.TRANSFERS, ["VIEW", "CREATE", "EDIT", "APPROVE", "CANCEL"]],
      [PermissionResource.RETURNS, ["VIEW", "APPROVE"]],
    ] as Grant[],
  },
  {
    name: "superintendent_pharmacist",
    grants: [
      [PermissionResource.SALES, ["VIEW", "APPROVE"]],
      [PermissionResource.PRODUCTS, ["VIEW"]],
      [PermissionResource.STOCK, ["VIEW"]],
      [PermissionResource.CUSTOMERS, ["VIEW"]],
      [PermissionResource.PRESCRIPTIONS, ["VIEW", "CREATE", "EDIT", "APPROVE", "CANCEL"]],
      [PermissionResource.PATIENTS, ["VIEW", "CREATE", "EDIT"]],
      [PermissionResource.CARE_PLANS, ["VIEW", "CREATE", "EDIT", "APPROVE"]],
    ] as Grant[],
  },
  {
    name: "pharmacy_technician",
    grants: [
      [PermissionResource.SALES, ["VIEW", "CREATE"]],
      [PermissionResource.PRODUCTS, ["VIEW"]],
      [PermissionResource.STOCK, ["VIEW"]],
      [PermissionResource.CUSTOMERS, ["VIEW"]],
      [PermissionResource.PRESCRIPTIONS, ["VIEW"]],
    ] as Grant[],
  },
  {
    name: "cashier",
    grants: [
      [PermissionResource.SALES, ["VIEW", "CREATE"]],
      [PermissionResource.PRODUCTS, ["VIEW"]],
      [PermissionResource.STOCK, ["VIEW"]],
      [PermissionResource.CUSTOMERS, ["VIEW", "CREATE"]],
      [PermissionResource.RETURNS, ["VIEW", "CREATE"]],
    ] as Grant[],
  },
  {
    name: "inventory_officer",
    grants: [
      [PermissionResource.PRODUCTS, ["VIEW"]],
      [PermissionResource.STOCK, ["VIEW", "CREATE", "EDIT"]],
      [PermissionResource.PURCHASES, ["VIEW"]],
      [PermissionResource.SUPPLIERS, ["VIEW"]],
      [PermissionResource.TRANSFERS, ["VIEW", "CREATE", "EDIT", "CANCEL"]],
    ] as Grant[],
  },
  {
    name: "procurement_officer",
    grants: [
      [PermissionResource.PRODUCTS, ["VIEW"]],
      [PermissionResource.STOCK, ["VIEW"]],
      [PermissionResource.PURCHASES, ["VIEW", "CREATE", "EDIT"]],
      [PermissionResource.SUPPLIERS, ["VIEW", "CREATE", "EDIT"]],
      [PermissionResource.REPORTS, ["VIEW"]],
    ] as Grant[],
  },
  {
    name: "warehouse_manager",
    grants: [
      [PermissionResource.PRODUCTS, ["VIEW"]],
      [PermissionResource.STOCK, ["VIEW", "CREATE", "EDIT", "APPROVE"]],
      [PermissionResource.PURCHASES, ["VIEW"]],
      [PermissionResource.TRANSFERS, ["VIEW", "CREATE", "EDIT", "APPROVE"]],
    ] as Grant[],
  },
  {
    name: "accountant",
    grants: [
      [PermissionResource.SALES, ["VIEW", "EXPORT"]],
      [PermissionResource.PURCHASES, ["VIEW", "EXPORT"]],
      [PermissionResource.SUPPLIERS, ["VIEW"]],
      [PermissionResource.EXPENSES, ["VIEW", "CREATE", "EDIT", "EXPORT"]],
      [PermissionResource.REPORTS, ["VIEW", "EXPORT"]],
    ] as Grant[],
  },
  {
    name: "auditor",
    grants: ALL_RESOURCES.map((r) => [r, ["VIEW", "EXPORT"]] as Grant),
  },
  {
    name: "delivery_rider",
    grants: [[PermissionResource.CUSTOMERS, ["VIEW"]]] as Grant[],
  },
];

async function main() {
  console.log("Seeding permission grid...");
  const permissionByKey = new Map<string, string>();

  for (const resource of ALL_RESOURCES) {
    for (const action of ALL_ACTIONS) {
      const permission = await prisma.permission.upsert({
        where: { resource_action: { resource, action } },
        create: { resource, action },
        update: {},
      });
      permissionByKey.set(`${resource}:${action}`, permission.id);
    }
  }

  console.log(`Seeded ${permissionByKey.size} permissions.`);

  for (const roleDef of ROLE_DEFINITIONS) {
    const role = await prisma.role.upsert({
      where: { organisationId_name: { organisationId: null as unknown as string, name: roleDef.name } },
      create: { name: roleDef.name, isSystemDefault: true, organisationId: null },
      update: { isSystemDefault: true },
    });

    const grants: Grant[] =
      roleDef.grants === "ALL"
        ? ALL_RESOURCES.map((r) => [r, ALL_ACTIONS] as Grant)
        : roleDef.grants;

    for (const [resource, actions] of grants) {
      for (const action of actions) {
        const permissionId = permissionByKey.get(`${resource}:${action}`);
        if (!permissionId) continue;
        await prisma.rolePermission.upsert({
          where: { roleId_permissionId: { roleId: role.id, permissionId } },
          create: { roleId: role.id, permissionId },
          update: {},
        });
      }
    }

    console.log(`Seeded role "${roleDef.name}" with ${grants.length} resource grants.`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
