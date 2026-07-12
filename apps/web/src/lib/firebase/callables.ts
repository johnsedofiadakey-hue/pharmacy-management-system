import { httpsCallable, type HttpsCallableResult } from "firebase/functions";
import { getFirebaseFunctions } from "./client";

// Typed client wrappers around the Cloud Functions in functions/src.
// Money fields are strings on the wire (Prisma Decimal → JSON); report
// aggregates are computed numbers. Dates are ISO strings.

function call<Req, Res>(name: string, data: Req): Promise<HttpsCallableResult<Res>> {
  return httpsCallable<Req, Res>(getFirebaseFunctions(), name)(data);
}

// ---------- Shared row types ----------

export type PrescriptionClassification = "OTC" | "POM" | "RESTRICTED";
export type PaymentMethodValue = "CASH" | "MOMO" | "CARD" | "BANK_TRANSFER" | "NHIS";

export type Branch = {
  id: string;
  organisationId: string;
  name: string;
  code: string;
  phone: string | null;
  email: string | null;
  physicalAddress: string | null;
  gpsLat: number | null;
  gpsLng: number | null;
  isActive: boolean;
  clinicalCareEnabled?: boolean;
};

export type Role = { id: string; name: string; description?: string | null };

export type Product = {
  id: string;
  organisationId: string;
  name: string;
  genericName: string | null;
  brandName: string | null;
  barcode: string | null;
  sku: string | null;
  categoryId: string | null;
  prescriptionClassification: PrescriptionClassification;
  retailPrice: string | null;
  minSellingPrice: string | null;
  reorderLevel: number | null;
  isActive: boolean;
};

export type PublicProduct = {
  id: string;
  name: string;
  genericName: string | null;
  brandName: string | null;
  barcode: string | null;
  retailPrice: string | null;
  prescriptionClassification: PrescriptionClassification;
};

export type PublicBranch = {
  id: string;
  name: string;
  physicalAddress: string | null;
  phone: string | null;
  gpsLat: number | null;
  gpsLng: number | null;
};

export type TillSession = {
  id: string;
  branchId: string;
  cashierUserId: string;
  openingFloat: string;
  closingExpected: string | null;
  closingActual: string | null;
  variance: string | null;
  status: "OPEN" | "CLOSED";
  openedAt: string;
  closedAt: string | null;
};

export type SaleItem = {
  id: string;
  saleId: string;
  productId: string;
  batchId: string;
  quantity: number;
  unitPrice: string;
  discountAmount: string;
  lineTotal: string;
};

export type SalePayment = {
  id: string;
  saleId: string;
  paymentMethod: PaymentMethodValue;
  amount: string;
  referenceNumber: string | null;
};

export type Sale = {
  id: string;
  branchId: string;
  tillSessionId: string;
  clientSaleId: string | null;
  status: string;
  subtotal: string;
  discountTotal: string;
  taxTotal: string;
  total: string;
  createdAt: string;
  items?: SaleItem[];
  payments?: SalePayment[];
};

export type Shift = { id: string; userId: string; branchId: string; clockInAt: string; clockOutAt: string | null };

export type StockAdjustmentRequestRow = {
  id: string;
  movementType: string;
  quantityDelta: number;
  note: string | null;
  batch: { batchNumber: string; product: { name: string } };
  requestedBy: { name: string };
};

export type BranchStockRow = {
  id: string;
  productId: string;
  batchId: string;
  quantityOnHand: number;
  batch: { batchNumber: string; expiryDate?: string | null; product: { name: string } };
};

export type TransferItem = {
  id: string;
  productId: string;
  batchId: string;
  quantityRequested: number;
  quantitySent: number | null;
  quantityReceived: number | null;
  batch?: { batchNumber: string; product: { name: string } };
};

export type Transfer = {
  id: string;
  fromBranchId: string;
  toBranchId: string;
  status: "REQUESTED" | "APPROVED" | "REJECTED" | "CANCELLED" | "IN_TRANSIT" | "RECEIVED";
  fromBranch?: { name: string };
  toBranch?: { name: string };
  items: TransferItem[];
  createdAt: string;
};

export type Supplier = {
  id: string;
  companyName: string;
  contactPerson: string | null;
  phone: string | null;
  email: string | null;
};

export type PurchaseOrderItem = {
  id: string;
  productId: string;
  quantityOrdered: number;
  quantityReceived: number;
  unitCost: string;
  product: { name: string };
};

export type PurchaseOrder = {
  id: string;
  status: "DRAFT" | "SUBMITTED" | "APPROVED" | "PARTIALLY_RECEIVED" | "RECEIVED" | "CANCELLED";
  supplier?: { companyName: string };
  items: PurchaseOrderItem[];
  createdAt: string;
};

export type PurchaseSuggestion = {
  productId: string;
  productName: string;
  currentStock: number;
  reorderLevel: number;
  suggestedOrderQuantity: number;
};

export type PrescriptionItemRow = {
  id: string;
  requestedText: string;
  quantity: number;
  productId: string | null;
  availabilityStatus: "PENDING" | "AVAILABLE" | "PARTIALLY_AVAILABLE" | "UNAVAILABLE";
};

export type PrescriptionRow = {
  id: string;
  status: string;
  customer?: { phone: string } | null;
  items: PrescriptionItemRow[];
  createdAt: string;
};

export type CustomerRow = {
  id: string;
  phone: string;
  name?: string | null;
  email?: string | null;
  isPatient: boolean;
};

export type PatientVitalsRow = {
  id: string;
  recordedAt: string;
  bpSystolic: number | null;
  bpDiastolic: number | null;
  glucoseLevel: number | null;
  weightKg: number | null;
};

export type ConsultationRow = {
  id: string;
  consultationDate: string;
  reason: string;
  notes: string | null;
  pharmacist: { name: string };
};

export type CarePlanFollowupRow = { id: string; status: string; scheduledDate: string };

export type CarePlanRow = {
  id: string;
  condition: string;
  status: string;
  followups: CarePlanFollowupRow[];
};

export type PatientRecord = {
  patientProfile: {
    id: string;
    vitals: PatientVitalsRow[];
    consultations: ConsultationRow[];
    carePlans: CarePlanRow[];
  } | null;
};

export type UpcomingFollowup = {
  id: string;
  scheduledDate: string;
  carePlan: { condition: string; patientProfile: { customer: { phone: string } } };
};

export type CustomerAddressRow = { id: string; label: string; addressText: string };

export type OrderItemRow = { id: string; quantity: number; unitPrice: string; product: { name: string } };
export type OrderPaymentRow = { id: string; paymentMethod: PaymentMethodValue; status: string };
export type DeliveryRow = { id: string; status: string; riderId: string | null };

export type OrderRow = {
  id: string;
  status: "NEW" | "CONFIRMED" | "PICKING" | "READY" | "OUT_FOR_DELIVERY" | "DELIVERED" | "CANCELLED";
  fulfilmentType: "PICKUP" | "DELIVERY";
  total: string;
  createdAt: string;
  customer?: { phone: string } | null;
  items: OrderItemRow[];
  payments?: OrderPaymentRow[];
  delivery?: DeliveryRow | null;
};

export type CompanyDashboard = {
  totalSalesToday: number;
  totalTransactionsToday: number;
  activeBranchesCount: number;
  branchBreakdown: { branchId: string; name: string; salesToday: number; transactionsToday: number }[];
  expiryRisk: { expired: number; within30Days: number; within90Days: number; within180Days: number };
};

export type BranchBenchmarking = {
  windowDays: number;
  benchmarking: {
    branchId: string;
    branchName: string;
    sales: number;
    grossMarginPercent: number;
    stockLossValue: number;
    expiryLossValue: number;
  }[];
};

export type SalesReport = {
  totalRevenue: number;
  totalTransactions: number;
  byProduct: { productId: string; name: string; revenue: number; unitsSold: number }[];
  byPaymentMethod: { method: string; amount: number }[];
};

export type ProfitabilityReport = {
  totalRevenue: number;
  totalProfit: number;
  overallMarginPercent: number;
  byProduct: { productId: string; name: string; profit: number; marginPercent: number }[];
};

export type InventoryReport = {
  totalStockValue: number;
  lowStock: { productId: string; name: string; quantityOnHand: number }[];
  expiryRisk: { expired: number; within30Days: number; within90Days: number };
};

export type ProcurementReport = {
  supplierSpend: { supplierId: string; name: string; total: number }[];
  pendingPurchaseOrders: { id: string }[];
};

export type OperationsReport = {
  totalDiscounts: number;
  cashVariance: { totalVariance: number; totalSessions: number };
};

export type DemandForecast = {
  forecast: {
    productId: string;
    productName: string;
    avgDailySales: number;
    trend: string;
    percentChange: number;
  }[];
};

export type SuspiciousActivityAlert = { severity: string; description: string };

export type DrugRecallRow = {
  id: string;
  reason: string;
  status: "ACTIVE" | "RESOLVED";
  batch: { batchNumber: string; product: { name: string } };
};

export type AdverseReactionReportRow = {
  id: string;
  reactionDescription: string;
  product: { name: string };
  reportedBy: { name: string };
};

export type AuditLogEntry = {
  id: string;
  createdAt: string;
  action: string;
  resourceType: string;
  user?: { name: string } | null;
  branch?: { name: string } | null;
};

// ---------- Identity, branches, roles, staff ----------

export function listBranches() {
  return call<Record<string, never>, { branches: Branch[] }>("listBranches", {});
}

export function createBranch(input: {
  name: string;
  code: string;
  phone?: string;
  email?: string;
  physicalAddress?: string;
  gpsLat?: number;
  gpsLng?: number;
}) {
  return call<typeof input, { branch: Branch }>("createBranch", input);
}

export function setBranchActive(input: { branchId: string; isActive: boolean }) {
  return call<typeof input, { branch: Branch }>("setBranchActive", input);
}

export function listRoles() {
  return call<Record<string, never>, { roles: Role[] }>("listRoles", {});
}

export function inviteStaffMember(input: {
  name: string;
  email: string;
  roleId: string;
  branchId: string | null;
}) {
  return call<typeof input, { inviteLink: string }>("inviteStaffMember", input);
}

// ---------- Products & inventory ----------

export function listProducts() {
  return call<Record<string, never>, { products: Product[] }>("listProducts", {});
}

export function listBranchStock(branchId: string) {
  return call<{ branchId: string }, { stock: BranchStockRow[] }>("listBranchStock", { branchId });
}

export function listPendingStockAdjustmentRequests(branchId: string) {
  return call<{ branchId: string }, { requests: StockAdjustmentRequestRow[] }>(
    "listPendingStockAdjustmentRequests",
    { branchId }
  );
}

export function reviewStockAdjustmentRequest(requestId: string, decision: "APPROVED" | "REJECTED", note?: string) {
  return call<{ requestId: string; decision: string; note?: string }, { request: StockAdjustmentRequestRow }>(
    "reviewStockAdjustmentRequest",
    { requestId, decision, note }
  );
}

// ---------- POS ----------

export function openTill(input: { branchId: string; openingFloat: number }) {
  return call<typeof input, { tillSession: TillSession }>("openTill", input);
}

export function closeTill(input: { tillSessionId: string; closingActual: number }) {
  return call<typeof input, { tillSession: TillSession }>("closeTill", input);
}

/** The caller's currently-open till session (and shift), so a page refresh doesn't forget an open till. */
export function getActiveTillSession() {
  return call<Record<string, never>, { tillSession: TillSession | null; shift: Shift | null }>(
    "getActiveTillSession",
    {}
  );
}

export type CreateSaleInput = {
  branchId: string;
  tillSessionId: string;
  clientSaleId?: string;
  customerPhone?: string;
  prescriptionId?: string;
  items: { productId: string; quantity: number; unitPrice: number; discountAmount?: number }[];
  payments: { paymentMethod: PaymentMethodValue; amount: number; referenceNumber?: string }[];
};

export function createSale(input: CreateSaleInput) {
  return call<CreateSaleInput, { sale: Sale }>("createSale", input);
}

export function listSales(branchId: string, tillSessionId?: string) {
  return call<{ branchId: string; tillSessionId?: string }, { sales: Sale[] }>("listSales", {
    branchId,
    tillSessionId,
  });
}

// ---------- Shifts ----------

export function clockIn(branchId: string) {
  return call<{ branchId: string }, { shift: Shift }>("clockIn", { branchId });
}

export function clockOut(shiftId: string) {
  return call<{ shiftId: string }, { shift: Shift }>("clockOut", { shiftId });
}

// ---------- Dashboards ----------

export function getCompanyDashboard() {
  return call<Record<string, never>, CompanyDashboard>("getCompanyDashboard", {});
}

export function getBranchBenchmarking() {
  return call<Record<string, never>, BranchBenchmarking>("getBranchBenchmarking", {});
}

// ---------- Transfers ----------

export function requestTransfer(input: {
  fromBranchId: string;
  toBranchId: string;
  items: { productId: string; batchId: string; quantityRequested: number }[];
}) {
  return call<typeof input, { transfer: Transfer }>("requestTransfer", input);
}

export function approveTransfer(transferId: string) {
  return call<{ transferId: string }, { transfer: Transfer }>("approveTransfer", { transferId });
}

export function rejectTransfer(transferId: string) {
  return call<{ transferId: string }, { transfer: Transfer }>("rejectTransfer", { transferId });
}

export function cancelTransfer(transferId: string) {
  return call<{ transferId: string }, { transfer: Transfer }>("cancelTransfer", { transferId });
}

export function dispatchTransfer(transferId: string, items: { transferItemId: string; quantitySent: number }[]) {
  return call<{ transferId: string; items: typeof items }, { transfer: Transfer }>("dispatchTransfer", {
    transferId,
    items,
  });
}

export function receiveTransfer(transferId: string, items: { transferItemId: string; quantityReceived: number }[]) {
  return call<{ transferId: string; items: typeof items }, { transfer: Transfer }>("receiveTransfer", {
    transferId,
    items,
  });
}

export function listTransfers(branchId: string) {
  return call<{ branchId: string }, { transfers: Transfer[] }>("listTransfers", { branchId });
}

// ---------- Suppliers & procurement ----------

export function createSupplier(input: { companyName: string; phone?: string }) {
  return call<typeof input, { supplier: Supplier }>("createSupplier", input);
}

export function listSuppliers() {
  return call<Record<string, never>, { suppliers: Supplier[] }>("listSuppliers", {});
}

export function createPurchaseOrder(input: {
  branchId: string;
  supplierId: string;
  items: { productId: string; quantityOrdered: number; unitCost: number }[];
}) {
  return call<typeof input, { purchaseOrder: PurchaseOrder }>("createPurchaseOrder", input);
}

export function approvePurchaseOrder(purchaseOrderId: string) {
  return call<{ purchaseOrderId: string }, { purchaseOrder: PurchaseOrder }>("approvePurchaseOrder", {
    purchaseOrderId,
  });
}

export function listPurchaseOrders(branchId: string) {
  return call<{ branchId: string }, { purchaseOrders: PurchaseOrder[] }>("listPurchaseOrders", { branchId });
}

export function receiveGoods(
  purchaseOrderId: string,
  items: { purchaseOrderItemId: string; batchNumber: string; receivedQuantity: number; expiryDate?: string }[]
) {
  return call<{ purchaseOrderId: string; items: typeof items }, { purchaseOrder: PurchaseOrder }>("receiveGoods", {
    purchaseOrderId,
    items,
  });
}

export function getPurchaseSuggestions(branchId: string) {
  return call<{ branchId: string }, { suggestions: PurchaseSuggestion[] }>("getPurchaseSuggestions", { branchId });
}

// ---------- Prescriptions ----------

export function createPrescription(input: {
  branchId: string;
  customerPhone: string;
  uploadedFileUrl?: string;
  items: { requestedText: string; quantity: number }[];
}) {
  return call<typeof input, { prescription: PrescriptionRow }>("createPrescription", input);
}

export function listPrescriptions(branchId: string, pendingOnly?: boolean) {
  return call<{ branchId: string; pendingOnly?: boolean }, { prescriptions: PrescriptionRow[] }>(
    "listPrescriptions",
    { branchId, pendingOnly }
  );
}

export function reviewPrescription(
  prescriptionId: string,
  decision: "APPROVE" | "REJECT" | "REQUEST_CLARIFICATION",
  items?: {
    prescriptionItemId: string;
    productId?: string;
    availabilityStatus: "PENDING" | "AVAILABLE" | "PARTIALLY_AVAILABLE" | "UNAVAILABLE";
    note?: string;
  }[]
) {
  return call<{ prescriptionId: string; decision: string; items?: typeof items }, { prescription: PrescriptionRow }>(
    "reviewPrescription",
    { prescriptionId, decision, items }
  );
}

// ---------- Patient care ----------

export function findCustomerByPhone(phone: string) {
  return call<{ phone: string }, { customer: CustomerRow | null }>("findCustomerByPhone", { phone });
}

export function getPatientRecord(customerId: string) {
  return call<{ customerId: string }, PatientRecord>("getPatientRecord", { customerId });
}

export function recordVitals(input: {
  customerId: string;
  branchId: string;
  bpSystolic?: number;
  bpDiastolic?: number;
  glucoseLevel?: number;
  weightKg?: number;
  heightCm?: number;
}) {
  return call<typeof input, { vitals: PatientVitalsRow }>("recordVitals", input);
}

export function createConsultation(input: {
  customerId: string;
  branchId: string;
  reason: string;
  notes?: string;
  outcome?: string;
  referredToDoctor?: boolean;
}) {
  return call<typeof input, { consultation: ConsultationRow }>("createConsultation", input);
}

export function createCarePlan(input: {
  customerId: string;
  condition: string;
  goals?: string;
  firstFollowupDate?: string;
}) {
  return call<typeof input, { carePlan: CarePlanRow }>("createCarePlan", input);
}

export function addCarePlanFollowup(input: { carePlanId: string; scheduledDate: string; notes?: string }) {
  return call<typeof input, { followup: CarePlanFollowupRow }>("addCarePlanFollowup", input);
}

export function completeCarePlanFollowup(followupId: string, notes?: string) {
  return call<{ followupId: string; notes?: string }, { followup: CarePlanFollowupRow }>(
    "completeCarePlanFollowup",
    { followupId, notes }
  );
}

export function listUpcomingFollowups() {
  return call<Record<string, never>, { followups: UpcomingFollowup[] }>("listUpcomingFollowups", {});
}

// ---------- Storefront (public + customer) ----------

export function publicListProducts(organisationId: string) {
  return call<{ organisationId: string }, { products: PublicProduct[] }>("publicListProducts", { organisationId });
}

export function publicListBranches(organisationId: string) {
  return call<{ organisationId: string }, { branches: PublicBranch[] }>("publicListBranches", { organisationId });
}

export function linkCustomerAccount(input: {
  organisationId: string;
  phone: string;
  name?: string;
  email?: string;
}) {
  return call<typeof input, { customer: CustomerRow }>("linkCustomerAccount", input);
}

export function placeOrder(input: {
  branchId: string;
  fulfilmentType: "PICKUP" | "DELIVERY";
  deliveryAddressId?: string;
  paymentMethod: PaymentMethodValue;
  items: { productId: string; quantity: number }[];
  guestPhone?: string;
  guestName?: string;
}) {
  return call<typeof input, { order: OrderRow }>("placeOrder", input);
}

export function initializePaystackPayment(input: { orderId: string; callbackUrl?: string }) {
  return call<
    typeof input,
    { authorizationUrl: string | null; accessCode: string | null; reference: string | null }
  >("initializePaystackPayment", input);
}

export function verifyPaystackPayment(reference: string) {
  return call<{ reference: string }, { order: OrderRow; providerStatus: string }>("verifyPaystackPayment", {
    reference,
  });
}

export function listMyOrders() {
  return call<Record<string, never>, { orders: OrderRow[] }>("listMyOrders", {});
}

export function listMyAddresses() {
  return call<Record<string, never>, { addresses: CustomerAddressRow[] }>("listMyAddresses", {});
}

export function addCustomerAddress(input: {
  label: string;
  addressText: string;
  gpsLat?: number;
  gpsLng?: number;
}) {
  return call<typeof input, { address: CustomerAddressRow }>("addCustomerAddress", input);
}

// ---------- Branch order fulfilment ----------

export function listBranchOrders(branchId: string, status?: string) {
  return call<{ branchId: string; status?: string }, { orders: OrderRow[] }>("listBranchOrders", {
    branchId,
    status,
  });
}

export function updateOrderStatus(orderId: string, newStatus: string) {
  return call<{ orderId: string; newStatus: string }, { order: OrderRow }>("updateOrderStatus", {
    orderId,
    newStatus,
  });
}

export function assignDeliveryRider(orderId: string, riderId: string) {
  return call<{ orderId: string; riderId: string }, { delivery: DeliveryRow }>("assignDeliveryRider", {
    orderId,
    riderId,
  });
}

export function updateDeliveryStatus(deliveryId: string, status: string) {
  return call<{ deliveryId: string; status: string }, { delivery: DeliveryRow }>("updateDeliveryStatus", {
    deliveryId,
    status,
  });
}

// ---------- Reports ----------

export function getSalesReport(branchId: string, startDate: string, endDate: string) {
  return call<{ branchId: string; startDate: string; endDate: string }, SalesReport>("getSalesReport", {
    branchId,
    startDate,
    endDate,
  });
}

export function getProfitabilityReport(branchId: string, startDate: string, endDate: string) {
  return call<{ branchId: string; startDate: string; endDate: string }, ProfitabilityReport>(
    "getProfitabilityReport",
    { branchId, startDate, endDate }
  );
}

export function getInventoryReport(branchId: string) {
  return call<{ branchId: string }, InventoryReport>("getInventoryReport", { branchId });
}

export function getProcurementReport(branchId: string) {
  return call<{ branchId: string }, ProcurementReport>("getProcurementReport", { branchId });
}

export function getOperationsReport(branchId: string, startDate: string, endDate: string) {
  return call<{ branchId: string; startDate: string; endDate: string }, OperationsReport>("getOperationsReport", {
    branchId,
    startDate,
    endDate,
  });
}

export function getDemandForecast(branchId: string) {
  return call<{ branchId: string }, DemandForecast>("getDemandForecast", { branchId });
}

// ---------- Compliance ----------

export function getSuspiciousActivityAlerts(branchId: string) {
  return call<{ branchId: string }, { alerts: SuspiciousActivityAlert[] }>("getSuspiciousActivityAlerts", {
    branchId,
  });
}

export function listDrugRecalls() {
  return call<Record<string, never>, { recalls: DrugRecallRow[] }>("listDrugRecalls", {});
}

export function initiateDrugRecall(batchId: string, reason: string) {
  return call<{ batchId: string; reason: string }, { recall: DrugRecallRow }>("initiateDrugRecall", {
    batchId,
    reason,
  });
}

export function resolveDrugRecall(recallId: string) {
  return call<{ recallId: string }, { recall: DrugRecallRow }>("resolveDrugRecall", { recallId });
}

export function listAdverseReactionReports() {
  return call<Record<string, never>, { reports: AdverseReactionReportRow[] }>("listAdverseReactionReports", {});
}

export function reportAdverseReaction(input: {
  productId: string;
  reactionDescription: string;
  batchId?: string;
  customerId?: string;
  dateOfReaction?: string;
  outcome?: string;
}) {
  return call<typeof input, { report: AdverseReactionReportRow }>("reportAdverseReaction", input);
}

export function listAuditLog() {
  return call<Record<string, never>, { entries: AuditLogEntry[] }>("listAuditLog", {});
}
