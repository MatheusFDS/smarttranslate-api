/*
  Warnings:

  - You are about to drop the column `actionVideoId` on the `translation_history` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "translation_history" DROP COLUMN "actionVideoId",
ADD COLUMN     "quizJson" TEXT;
