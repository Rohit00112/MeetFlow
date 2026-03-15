ALTER TABLE "User" ADD COLUMN "image" TEXT;

UPDATE "User"
SET "image" = "avatar"
WHERE "image" IS NULL
  AND "avatar" IS NOT NULL;
