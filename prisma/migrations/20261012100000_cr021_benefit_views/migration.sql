-- CR-021: benefit_views (additive, empty after migration; no backfill).
-- CreateTable
CREATE TABLE "benefit_views" (
    "id" UUID NOT NULL,
    "benefit_id" UUID NOT NULL,
    "format" TEXT NOT NULL,
    "variant" TEXT NOT NULL DEFAULT 'standard',
    "title" TEXT,
    "text" TEXT,
    "image_url" TEXT,
    "image_alt" TEXT,
    "badge_text" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "benefit_views_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "benefit_views_benefit_id_format_variant_key" ON "benefit_views"("benefit_id", "format", "variant");

-- AddForeignKey
ALTER TABLE "benefit_views" ADD CONSTRAINT "benefit_views_benefit_id_fkey" FOREIGN KEY ("benefit_id") REFERENCES "benefits"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

