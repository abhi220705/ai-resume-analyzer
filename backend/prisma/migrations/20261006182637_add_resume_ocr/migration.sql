-- AlterTable
ALTER TABLE "resumes" ADD COLUMN     "ocrAttemptId" UUID,
ADD COLUMN     "ocrCompletedAt" TIMESTAMP(3),
ADD COLUMN     "ocrConfidence" DOUBLE PRECISION,
ADD COLUMN     "ocrError" VARCHAR(500),
ADD COLUMN     "ocrPageCount" INTEGER,
ADD COLUMN     "ocrStartedAt" TIMESTAMP(3),
ADD COLUMN     "ocrStatus" "ResumeParseStatus" NOT NULL DEFAULT 'PENDING',
ADD COLUMN     "ocrText" TEXT;
