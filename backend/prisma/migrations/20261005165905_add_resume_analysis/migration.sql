-- CreateTable
CREATE TABLE "resume_analyses" (
    "id" UUID NOT NULL,
    "resumeId" UUID NOT NULL,
    "engineVersion" VARCHAR(30) NOT NULL,
    "sourceTextHash" VARCHAR(64) NOT NULL,
    "overallScore" INTEGER NOT NULL,
    "wordCount" INTEGER NOT NULL,
    "detectedSkills" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "report" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "resume_analyses_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "resume_analyses_resumeId_key" ON "resume_analyses"("resumeId");

-- AddForeignKey
ALTER TABLE "resume_analyses" ADD CONSTRAINT "resume_analyses_resumeId_fkey" FOREIGN KEY ("resumeId") REFERENCES "resumes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
