-- CR-020: channel/view/test dimensions on benefit_events (additive).
-- AlterTable
ALTER TABLE "benefit_events" ADD COLUMN     "channel" TEXT NOT NULL DEFAULT 'app',
ADD COLUMN     "test_id" TEXT,
ADD COLUMN     "variant" TEXT,
ADD COLUMN     "view_id" TEXT;
