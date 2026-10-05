-- CreateEnum
CREATE TYPE "ResumeParseStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'NO_TEXT', 'FAILED');

-- AlterTable
ALTER TABLE "resumes" ADD COLUMN     "extractedText" TEXT,
ADD COLUMN     "pageCount" INTEGER,
ADD COLUMN     "parseAttemptId" UUID,
ADD COLUMN     "parseError" VARCHAR(500),
ADD COLUMN     "parseStartedAt" TIMESTAMP(3),
ADD COLUMN     "parseStatus" "ResumeParseStatus" NOT NULL DEFAULT 'PENDING',
ADD COLUMN     "parsedAt" TIMESTAMP(3);
