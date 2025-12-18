/*
  Warnings:

  - You are about to drop the column `buffalo` on the `Post` table. All the data in the column will be lost.
  - You are about to drop the column `peak` on the `Post` table. All the data in the column will be lost.
  - You are about to drop the column `pit` on the `Post` table. All the data in the column will be lost.
  - Added the required column `text` to the `Post` table without a default value. This is not possible if the table is not empty.
  - Added the required column `type` to the `Post` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "PostType" AS ENUM ('PEAK', 'PIT', 'BUFFALO');

-- AlterTable
ALTER TABLE "Post" DROP COLUMN "buffalo",
DROP COLUMN "peak",
DROP COLUMN "pit",
ADD COLUMN     "text" TEXT NOT NULL,
ADD COLUMN     "type" "PostType" NOT NULL;
