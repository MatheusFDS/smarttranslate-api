-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "translation_history" (
    "id" TEXT NOT NULL,
    "originalText" TEXT NOT NULL,
    "originalTextHash" TEXT NOT NULL,
    "translatedText" TEXT NOT NULL,
    "alignments" JSONB NOT NULL,
    "grammaticalTypes" JSONB NOT NULL,
    "explanations" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT,

    CONSTRAINT "translation_history_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "translation_history_originalTextHash_key" ON "translation_history"("originalTextHash");

-- AddForeignKey
ALTER TABLE "translation_history" ADD CONSTRAINT "translation_history_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
