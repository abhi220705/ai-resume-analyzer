-- CreateEnum
CREATE TYPE "AiFeedbackStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "ResumeTextSource" AS ENUM ('PDF', 'OCR');

-- CreateTable
CREATE TABLE "resume_ai_feedback" (
    "id" UUID NOT NULL,
    "resumeId" UUID NOT NULL,
    "source" "ResumeTextSource" NOT NULL,
    "status" "AiFeedbackStatus" NOT NULL DEFAULT 'PENDING',
    "model" VARCHAR(100) NOT NULL,
    "promptVersion" VARCHAR(30) NOT NULL,
    "sourceTextHash" VARCHAR(64) NOT NULL,
    "report" JSONB,
    "error" VARCHAR(500),
    "attemptId" UUID,
    "consentedAt" TIMESTAMP(3) NOT NULL,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "resume_ai_feedback_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "resume_ai_feedback_status_startedAt_idx" ON "resume_ai_feedback"("status", "startedAt");

-- CreateIndex
CREATE UNIQUE INDEX "resume_ai_feedback_resumeId_source_key" ON "resume_ai_feedback"("resumeId", "source");

-- AddForeignKey
ALTER TABLE "resume_ai_feedback" ADD CONSTRAINT "resume_ai_feedback_resumeId_fkey" FOREIGN KEY ("resumeId") REFERENCES "resumes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
