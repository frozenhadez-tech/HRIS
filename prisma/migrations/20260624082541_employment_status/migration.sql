-- CreateEnum
CREATE TYPE "EmploymentStatus" AS ENUM ('PROBATIONARY', 'REGULAR', 'CONTRACTUAL', 'PROJECT_BASED');

-- AlterTable
ALTER TABLE "Employee" ADD COLUMN     "employmentStatus" "EmploymentStatus" NOT NULL DEFAULT 'PROBATIONARY',
ADD COLUMN     "probationEndDate" TIMESTAMP(3),
ADD COLUMN     "regularizedAt" TIMESTAMP(3);
