/*
  Warnings:

  - Added the required column `output_file` to the `Project` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `Project` ADD COLUMN `output_file` VARCHAR(191) NOT NULL;
