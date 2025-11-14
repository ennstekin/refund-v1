-- CreateIndex
CREATE INDEX "RefundRequest_merchantId_idx" ON "public"."RefundRequest"("merchantId");

-- CreateIndex
CREATE INDEX "RefundRequest_merchantId_status_idx" ON "public"."RefundRequest"("merchantId", "status");

-- CreateIndex
CREATE INDEX "RefundRequest_merchantId_createdAt_idx" ON "public"."RefundRequest"("merchantId", "createdAt");
