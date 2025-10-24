-- CreateTable
CREATE TABLE "public"."AuthToken" (
    "id" TEXT NOT NULL,
    "merchantId" TEXT NOT NULL,
    "authorizedAppId" TEXT,
    "salesChannelId" TEXT,
    "type" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deleted" BOOLEAN NOT NULL DEFAULT false,
    "accessToken" TEXT NOT NULL,
    "tokenType" TEXT NOT NULL,
    "expiresIn" INTEGER NOT NULL,
    "expireDate" TIMESTAMP(3) NOT NULL,
    "refreshToken" TEXT NOT NULL,
    "scope" TEXT,

    CONSTRAINT "AuthToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."RefundRequest" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "orderNumber" TEXT NOT NULL,
    "merchantId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "reason" TEXT,
    "reasonNote" TEXT,
    "trackingNumber" TEXT,
    "source" TEXT NOT NULL DEFAULT 'dashboard',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RefundRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."RefundNote" (
    "id" TEXT NOT NULL,
    "refundRequestId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RefundNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."RefundTimeline" (
    "id" TEXT NOT NULL,
    "refundRequestId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "eventData" TEXT,
    "description" TEXT NOT NULL,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RefundTimeline_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Merchant" (
    "id" TEXT NOT NULL,
    "authorizedAppId" TEXT NOT NULL,
    "storeName" TEXT,
    "email" TEXT,
    "portalUrl" TEXT,
    "portalEnabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Merchant_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AuthToken_authorizedAppId_key" ON "public"."AuthToken"("authorizedAppId");

-- CreateIndex
CREATE UNIQUE INDEX "RefundRequest_orderId_key" ON "public"."RefundRequest"("orderId");

-- CreateIndex
CREATE UNIQUE INDEX "Merchant_authorizedAppId_key" ON "public"."Merchant"("authorizedAppId");

-- AddForeignKey
ALTER TABLE "public"."RefundNote" ADD CONSTRAINT "RefundNote_refundRequestId_fkey" FOREIGN KEY ("refundRequestId") REFERENCES "public"."RefundRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."RefundTimeline" ADD CONSTRAINT "RefundTimeline_refundRequestId_fkey" FOREIGN KEY ("refundRequestId") REFERENCES "public"."RefundRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;
