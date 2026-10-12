-- CR-025: benefits.show_in_app (additive, default true, no backfill).
-- AlterTable
ALTER TABLE "benefits" ADD COLUMN     "show_in_app" BOOLEAN NOT NULL DEFAULT true;

