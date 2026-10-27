-- CreateTable
CREATE TABLE "resume_ai_feedback" (
    "id" UUID NOT NULL,
    "resumeId" UUID NOT NULL,
    "provider" VARCHAR(30) NOT NULL,
    "model" VARCHAR(100) NOT NULL,
    "promptVersion" VARCHAR(30) NOT NULL,
    "sourceTextHash" VARCHAR(64) NOT NULL,
    "feedback" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "resume_ai_feedback_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "resume_ai_feedback_resumeId_key" ON "resume_ai_feedback"("resumeId");

-- AddForeignKey
ALTER TABLE "resume_ai_feedback" ADD CONSTRAINT "resume_ai_feedback_resumeId_fkey" FOREIGN KEY ("resumeId") REFERENCES "resumes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
