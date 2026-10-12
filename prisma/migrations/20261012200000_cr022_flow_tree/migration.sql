-- CR-022: flow_pages, products, benefit_views.page_id/sort_order (additive, no backfill).
-- AlterTable
ALTER TABLE "benefit_views" ADD COLUMN     "page_id" UUID,
ADD COLUMN     "sort_order" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "flow_pages" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "text" TEXT,
    "image_url" TEXT,
    "image_alt" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "flow_pages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "products" (
    "id" UUID NOT NULL,
    "benefit_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "text" TEXT,
    "price_text" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "products_benefit_id_idx" ON "products"("benefit_id");

-- CreateIndex
CREATE INDEX "benefit_views_page_id_idx" ON "benefit_views"("page_id");

-- AddForeignKey
ALTER TABLE "benefit_views" ADD CONSTRAINT "benefit_views_page_id_fkey" FOREIGN KEY ("page_id") REFERENCES "flow_pages"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_benefit_id_fkey" FOREIGN KEY ("benefit_id") REFERENCES "benefits"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

