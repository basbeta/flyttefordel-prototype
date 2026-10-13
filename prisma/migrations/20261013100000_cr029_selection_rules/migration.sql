-- AlterTable
ALTER TABLE "targeting_rules" ADD COLUMN     "days_since_move_max" INTEGER,
ADD COLUMN     "days_since_move_min" INTEGER,
ADD COLUMN     "hide_if_chosen" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "housing_types" JSONB,
ADD COLUMN     "requires_chosen_benefit_ids" JSONB;

