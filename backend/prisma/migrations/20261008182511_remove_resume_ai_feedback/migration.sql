/*
  Warnings:

  - You are about to drop the `resume_ai_feedback` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "resume_ai_feedback" DROP CONSTRAINT "resume_ai_feedback_resumeId_fkey";

-- DropTable
DROP TABLE "resume_ai_feedback";

-- DropEnum
DROP TYPE "AiFeedbackStatus";

-- DropEnum
DROP TYPE "ResumeTextSource";
