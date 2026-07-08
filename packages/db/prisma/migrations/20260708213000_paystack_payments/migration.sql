-- CreateEnum
CREATE TYPE "PaymentProvider" AS ENUM ('MANUAL', 'PAYSTACK');

-- AlterTable
ALTER TABLE "order_payments" ADD COLUMN     "paidAt" TIMESTAMP(3),
ADD COLUMN     "provider" "PaymentProvider" NOT NULL DEFAULT 'MANUAL',
ADD COLUMN     "providerAccessCode" TEXT,
ADD COLUMN     "providerAuthorizationUrl" TEXT,
ADD COLUMN     "providerResponse" JSONB,
ADD COLUMN     "providerStatus" TEXT,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE "order_payments" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- CreateIndex
CREATE UNIQUE INDEX "order_payments_provider_providerReference_key" ON "order_payments"("provider", "providerReference");
