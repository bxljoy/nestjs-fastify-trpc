-- CreateEnum
CREATE TYPE "Currency" AS ENUM ('EUR');

-- CreateTable
CREATE TABLE "Campaign" (
    "id" UUID NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "dailyBudgetMinor" INTEGER NOT NULL,
    "currency" "Currency" NOT NULL DEFAULT 'EUR',
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Campaign_pkey" PRIMARY KEY ("id")
);

-- Enforce the money invariant even for writes outside Prisma.
ALTER TABLE "Campaign"
ADD CONSTRAINT "Campaign_dailyBudgetMinor_nonnegative"
CHECK ("dailyBudgetMinor" >= 0);
