-- CR-024: orders and order_lines (additive, no backfill).
-- CreateTable
CREATE TABLE "orders" (
    "id" UUID NOT NULL,
    "submission_id" UUID NOT NULL,
    "session_id" UUID,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "postcode" TEXT,
    "consent_share" BOOLEAN NOT NULL,
    "consent_email" BOOLEAN NOT NULL DEFAULT false,
    "consent_mail" BOOLEAN NOT NULL DEFAULT false,
    "consent_sms" BOOLEAN NOT NULL DEFAULT false,
    "consent_texts" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_lines" (
    "id" UUID NOT NULL,
    "order_id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "benefit_id" UUID NOT NULL,
    "page_id" UUID,
    "product_name" TEXT NOT NULL,
    "benefit_title" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "order_lines_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "orders_submission_id_key" ON "orders"("submission_id");

-- CreateIndex
CREATE INDEX "order_lines_order_id_idx" ON "order_lines"("order_id");

-- CreateIndex
CREATE UNIQUE INDEX "order_lines_order_id_benefit_id_key" ON "order_lines"("order_id", "benefit_id");

-- AddForeignKey
ALTER TABLE "order_lines" ADD CONSTRAINT "order_lines_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_lines" ADD CONSTRAINT "order_lines_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_lines" ADD CONSTRAINT "order_lines_benefit_id_fkey" FOREIGN KEY ("benefit_id") REFERENCES "benefits"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_lines" ADD CONSTRAINT "order_lines_page_id_fkey" FOREIGN KEY ("page_id") REFERENCES "flow_pages"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

