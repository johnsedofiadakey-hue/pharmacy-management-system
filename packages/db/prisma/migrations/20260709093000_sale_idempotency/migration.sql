-- AlterTable
ALTER TABLE "sales" ADD COLUMN     "clientSaleId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "sales_branchId_clientSaleId_key" ON "sales"("branchId", "clientSaleId");

