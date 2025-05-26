/*
  Warnings:

  - You are about to drop the column `alignments` on the `translation_history` table. All the data in the column will be lost.
  - You are about to drop the column `explanations` on the `translation_history` table. All the data in the column will be lost.
  - You are about to drop the column `grammaticalTypes` on the `translation_history` table. All the data in the column will be lost.
  - Added the required column `alignmentsJson` to the `translation_history` table without a default value. This is not possible if the table is not empty.
  - Added the required column `explanationsJson` to the `translation_history` table without a default value. This is not possible if the table is not empty.
  - Added the required column `sourceLanguageCode` to the `translation_history` table without a default value. This is not possible if the table is not empty.
  - Added the required column `targetLanguageCode` to the `translation_history` table without a default value. This is not possible if the table is not empty.
  - Added the required column `tokensOriginalJson` to the `translation_history` table without a default value. This is not possible if the table is not empty.
  - Added the required column `tokensTranslatedJson` to the `translation_history` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "translation_history" DROP COLUMN "alignments",
DROP COLUMN "explanations",
DROP COLUMN "grammaticalTypes",
ADD COLUMN     "alignmentsJson" TEXT NOT NULL,
ADD COLUMN     "explanationsJson" TEXT NOT NULL,
ADD COLUMN     "sourceLanguageCode" TEXT NOT NULL,
ADD COLUMN     "targetLanguageCode" TEXT NOT NULL,
ADD COLUMN     "tokensOriginalJson" TEXT NOT NULL,
ADD COLUMN     "tokensTranslatedJson" TEXT NOT NULL;
