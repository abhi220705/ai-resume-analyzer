-- CreateTable
CREATE TABLE "resume_drafts" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "title" VARCHAR(100) NOT NULL,
    "data" JSONB NOT NULL,
    "photoStorageKey" VARCHAR(255),
    "revision" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "resume_drafts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "resume_drafts_userId_updatedAt_id_idx" ON "resume_drafts"("userId", "updatedAt", "id");

-- AddForeignKey
ALTER TABLE "resume_drafts" ADD CONSTRAINT "resume_drafts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
