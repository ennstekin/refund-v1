-- AlterTable: Add subdomain fields to Merchant
ALTER TABLE "Merchant" ADD COLUMN "subdomain" TEXT;
ALTER TABLE "Merchant" ADD COLUMN "subdomainStatus" TEXT NOT NULL DEFAULT 'pending';
ALTER TABLE "Merchant" ADD COLUMN "subdomainChangedAt" TIMESTAMP(3);
ALTER TABLE "Merchant" ADD COLUMN "subdomainChangeCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Merchant" ADD COLUMN "customDomainStatus" TEXT NOT NULL DEFAULT 'none';
ALTER TABLE "Merchant" ADD COLUMN "onboardingCompleted" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex: Unique constraint on subdomain
CREATE UNIQUE INDEX "Merchant_subdomain_key" ON "Merchant"("subdomain");

-- CreateTable: RestrictedSubdomain
CREATE TABLE "RestrictedSubdomain" (
    "id" TEXT NOT NULL,
    "subdomain" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RestrictedSubdomain_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RestrictedSubdomain_subdomain_key" ON "RestrictedSubdomain"("subdomain");

-- CreateTable: SubdomainReservation
CREATE TABLE "SubdomainReservation" (
    "id" TEXT NOT NULL,
    "subdomain" TEXT NOT NULL,
    "merchantId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'available',
    "reservedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),

    CONSTRAINT "SubdomainReservation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SubdomainReservation_subdomain_key" ON "SubdomainReservation"("subdomain");

-- CreateIndex
CREATE INDEX "SubdomainReservation_subdomain_status_idx" ON "SubdomainReservation"("subdomain", "status");
