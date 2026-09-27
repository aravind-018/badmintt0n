-- AlterTable
ALTER TABLE "Category" ADD COLUMN IF NOT EXISTS "qualificationRule" TEXT DEFAULT 'TOP_2';

-- AlterTable
ALTER TABLE "Match" ADD COLUMN IF NOT EXISTS "stage" TEXT,
ADD COLUMN IF NOT EXISTS "groupId" TEXT,
ADD COLUMN IF NOT EXISTS "groupName" TEXT,
ADD COLUMN IF NOT EXISTS "groupOrder" INTEGER,
ADD COLUMN IF NOT EXISTS "roundNumber" INTEGER,
ADD COLUMN IF NOT EXISTS "matchNumber" INTEGER,
ADD COLUMN IF NOT EXISTS "bracketPosition" INTEGER,
ADD COLUMN IF NOT EXISTS "seed" INTEGER;

-- AlterTable
ALTER TABLE "Standing" ADD COLUMN IF NOT EXISTS "groupId" TEXT,
ADD COLUMN IF NOT EXISTS "groupName" TEXT,
ADD COLUMN IF NOT EXISTS "groupOrder" INTEGER,
ADD COLUMN IF NOT EXISTS "qualified" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS "qualificationStatus" TEXT,
ADD COLUMN IF NOT EXISTS "qualificationPosition" INTEGER;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Match_tournamentId_categoryId_stage_idx" ON "Match"("tournamentId", "categoryId", "stage");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Standing_tournamentId_categoryId_groupId_idx" ON "Standing"("tournamentId", "categoryId", "groupId");
