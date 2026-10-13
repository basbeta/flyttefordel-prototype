-- AlterTable
ALTER TABLE "users" ADD COLUMN     "from_address" TEXT,
ADD COLUMN     "housing_type" TEXT,
ADD COLUMN     "is_test" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "seed_key" TEXT,
ADD COLUMN     "to_address" TEXT;

-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "person_id" UUID;

-- CreateIndex
CREATE UNIQUE INDEX "users_seed_key_key" ON "users"("seed_key");

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_person_id_fkey" FOREIGN KEY ("person_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

