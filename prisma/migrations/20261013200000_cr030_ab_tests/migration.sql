-- CreateTable
CREATE TABLE "ab_tests" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "scope" JSONB NOT NULL,
    "scope_key" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "variants" JSONB NOT NULL,
    "primary_goal" TEXT,
    "starts_at" TIMESTAMP(3),
    "ends_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ab_tests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ab_tests_scope_key_status_idx" ON "ab_tests"("scope_key", "status");
