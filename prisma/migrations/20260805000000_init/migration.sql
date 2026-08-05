-- CR-011: Corrected baseline migration for the Hetzner/Coolify migration.
-- Replaces the stale 20260522100321_init migration, which predated CR-003/CR-009/CR-010
-- schema changes applied via `prisma db push` and never captured in a migration file.
-- Generated via: npx prisma migrate diff --from-empty --to-schema-datamodel ./prisma/schema.prisma --script
-- Verified to match prisma/schema.prisma exactly as of 2026-08-05.

-- CreateEnum
CREATE TYPE "UserMovingStatus" AS ENUM ('recently_moved', 'moved_past', 'not_moving', 'unknown');

-- CreateEnum
CREATE TYPE "BenefitStatus" AS ENUM ('draft', 'scheduled', 'active', 'paused', 'expired', 'archived', 'deleted');

-- CreateEnum
CREATE TYPE "BenefitRedemptionType" AS ENUM ('generic_code', 'unique_code', 'qr_code', 'external_link', 'lead_form', 'info_only', 'mixed');

-- CreateEnum
CREATE TYPE "BenefitVisibility" AS ENUM ('public', 'targeted', 'hidden');

-- CreateEnum
CREATE TYPE "LeadStatus" AS ENUM ('new', 'exported', 'failed', 'deleted');

-- CreateEnum
CREATE TYPE "CodeStatus" AS ENUM ('available', 'reserved', 'assigned', 'expired', 'disabled');

-- CreateEnum
CREATE TYPE "HeroStatus" AS ENUM ('draft', 'scheduled', 'active', 'paused', 'expired', 'archived');

-- CreateEnum
CREATE TYPE "CTAType" AS ENUM ('benefit', 'category', 'external_url', 'internal_page', 'none');

-- CreateEnum
CREATE TYPE "AdminRole" AS ENUM ('admin', 'editor', 'viewer');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "external_auth_id" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "name" TEXT,
    "postcode" TEXT,
    "municipality" TEXT,
    "county" TEXT,
    "moving_status" "UserMovingStatus" NOT NULL DEFAULT 'unknown',
    "moved_at" DATE,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_sessions" (
    "id" UUID NOT NULL,
    "user_id" UUID,
    "anonymous_id" TEXT NOT NULL,
    "postcode" TEXT,
    "moving_status" "UserMovingStatus",
    "device_type" TEXT,
    "platform" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_seen_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "advertisers" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "org_number" TEXT,
    "logo_url" TEXT,
    "website_url" TEXT,
    "contact_name" TEXT,
    "contact_email" TEXT,
    "contact_phone" TEXT,
    "internal_notes" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "advertisers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categories" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "icon" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "benefits" (
    "id" UUID NOT NULL,
    "advertiser_id" UUID NOT NULL,
    "category_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "short_description" TEXT NOT NULL,
    "long_description" TEXT NOT NULL,
    "image_url" TEXT,
    "image_alt" TEXT,
    "badge_text" TEXT,
    "status" "BenefitStatus" NOT NULL,
    "visibility" "BenefitVisibility" NOT NULL DEFAULT 'public',
    "redemption_type" "BenefitRedemptionType" NOT NULL,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "starts_at" TIMESTAMP(3),
    "ends_at" TIMESTAMP(3),
    "auto_expire" BOOLEAN NOT NULL DEFAULT true,
    "terms_text" TEXT,
    "usage_instruction" TEXT,
    "consent_text" TEXT,
    "is_featured" BOOLEAN NOT NULL DEFAULT false,
    "is_time_limited" BOOLEAN NOT NULL DEFAULT false,
    "campaign_fee" DECIMAL(10,2),
    "price_per_view" DECIMAL(10,4),
    "price_per_lead" DECIMAL(10,2),
    "price_per_redemption" DECIMAL(10,2),
    "created_by" UUID,
    "updated_by" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "benefits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "benefit_redemptions" (
    "id" UUID NOT NULL,
    "benefit_id" UUID NOT NULL,
    "type" "BenefitRedemptionType" NOT NULL,
    "generic_code" TEXT,
    "external_url" TEXT,
    "qr_value" TEXT,
    "qr_image_url" TEXT,
    "code_pool_id" UUID,
    "lead_form_id" UUID,
    "cta_label" TEXT,
    "opens_in_new_tab" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "benefit_redemptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "code_pools" (
    "id" UUID NOT NULL,
    "benefit_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "total_codes" INTEGER NOT NULL DEFAULT 0,
    "available_codes" INTEGER NOT NULL DEFAULT 0,
    "low_stock_threshold" INTEGER NOT NULL DEFAULT 10,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "code_pools_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "codes" (
    "id" UUID NOT NULL,
    "code_pool_id" UUID NOT NULL,
    "benefit_id" UUID NOT NULL,
    "code_value" TEXT NOT NULL,
    "status" "CodeStatus" NOT NULL DEFAULT 'available',
    "assigned_user_id" UUID,
    "assigned_session_id" UUID,
    "assigned_at" TIMESTAMP(3),
    "reserved_until" TIMESTAMP(3),
    "expires_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "codes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "heroes" (
    "id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "image_url" TEXT,
    "image_alt" TEXT,
    "cta_label" TEXT,
    "cta_type" "CTAType" NOT NULL,
    "cta_target" TEXT,
    "status" "HeroStatus" NOT NULL,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "is_fallback" BOOLEAN NOT NULL DEFAULT false,
    "starts_at" TIMESTAMP(3),
    "ends_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "heroes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "targeting_rules" (
    "id" UUID NOT NULL,
    "benefit_id" UUID,
    "hero_id" UUID,
    "moving_statuses" JSONB,
    "postcodes" JSONB,
    "postcode_ranges" JSONB,
    "municipalities" JSONB,
    "counties" JSONB,
    "include_unknown_location" BOOLEAN NOT NULL DEFAULT true,
    "applies_nationally" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "targeting_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "benefit_events" (
    "id" UUID NOT NULL,
    "user_id" UUID,
    "session_id" UUID,
    "benefit_id" UUID,
    "event_type" TEXT NOT NULL,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "benefit_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "saved_benefits" (
    "id" UUID NOT NULL,
    "user_id" UUID,
    "session_id" UUID,
    "benefit_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "saved_benefits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lead_forms" (
    "id" UUID NOT NULL,
    "benefit_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "fields" JSONB NOT NULL,
    "consent_required" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lead_forms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "leads" (
    "id" UUID NOT NULL,
    "benefit_id" UUID NOT NULL,
    "advertiser_id" UUID NOT NULL,
    "user_id" UUID,
    "session_id" UUID,
    "form_data" JSONB NOT NULL,
    "consent_text" TEXT NOT NULL,
    "consent_accepted_at" TIMESTAMP(3) NOT NULL,
    "status" "LeadStatus" NOT NULL DEFAULT 'new',
    "exported_at" TIMESTAMP(3),
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "leads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin_users" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "AdminRole" NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "admin_users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_log" (
    "id" UUID NOT NULL,
    "admin_user_id" UUID,
    "action" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" UUID NOT NULL,
    "before" JSONB,
    "after" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_log_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_sessions_anonymous_id_key" ON "user_sessions"("anonymous_id");

-- CreateIndex
CREATE UNIQUE INDEX "advertisers_slug_key" ON "advertisers"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "categories_slug_key" ON "categories"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "benefits_slug_key" ON "benefits"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "benefit_redemptions_benefit_id_key" ON "benefit_redemptions"("benefit_id");

-- CreateIndex
CREATE UNIQUE INDEX "codes_code_pool_id_code_value_key" ON "codes"("code_pool_id", "code_value");

-- CreateIndex
CREATE UNIQUE INDEX "targeting_rules_benefit_id_key" ON "targeting_rules"("benefit_id");

-- CreateIndex
CREATE UNIQUE INDEX "targeting_rules_hero_id_key" ON "targeting_rules"("hero_id");

-- CreateIndex
CREATE UNIQUE INDEX "admin_users_email_key" ON "admin_users"("email");

-- AddForeignKey
ALTER TABLE "user_sessions" ADD CONSTRAINT "user_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "benefits" ADD CONSTRAINT "benefits_advertiser_id_fkey" FOREIGN KEY ("advertiser_id") REFERENCES "advertisers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "benefits" ADD CONSTRAINT "benefits_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "benefit_redemptions" ADD CONSTRAINT "benefit_redemptions_benefit_id_fkey" FOREIGN KEY ("benefit_id") REFERENCES "benefits"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "benefit_redemptions" ADD CONSTRAINT "benefit_redemptions_code_pool_id_fkey" FOREIGN KEY ("code_pool_id") REFERENCES "code_pools"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "benefit_redemptions" ADD CONSTRAINT "benefit_redemptions_lead_form_id_fkey" FOREIGN KEY ("lead_form_id") REFERENCES "lead_forms"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "codes" ADD CONSTRAINT "codes_code_pool_id_fkey" FOREIGN KEY ("code_pool_id") REFERENCES "code_pools"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "codes" ADD CONSTRAINT "codes_assigned_user_id_fkey" FOREIGN KEY ("assigned_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "codes" ADD CONSTRAINT "codes_assigned_session_id_fkey" FOREIGN KEY ("assigned_session_id") REFERENCES "user_sessions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "targeting_rules" ADD CONSTRAINT "targeting_rules_benefit_id_fkey" FOREIGN KEY ("benefit_id") REFERENCES "benefits"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "targeting_rules" ADD CONSTRAINT "targeting_rules_hero_id_fkey" FOREIGN KEY ("hero_id") REFERENCES "heroes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "benefit_events" ADD CONSTRAINT "benefit_events_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "benefit_events" ADD CONSTRAINT "benefit_events_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "user_sessions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "benefit_events" ADD CONSTRAINT "benefit_events_benefit_id_fkey" FOREIGN KEY ("benefit_id") REFERENCES "benefits"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "saved_benefits" ADD CONSTRAINT "saved_benefits_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "saved_benefits" ADD CONSTRAINT "saved_benefits_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "user_sessions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "saved_benefits" ADD CONSTRAINT "saved_benefits_benefit_id_fkey" FOREIGN KEY ("benefit_id") REFERENCES "benefits"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leads" ADD CONSTRAINT "leads_advertiser_id_fkey" FOREIGN KEY ("advertiser_id") REFERENCES "advertisers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_admin_user_id_fkey" FOREIGN KEY ("admin_user_id") REFERENCES "admin_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
