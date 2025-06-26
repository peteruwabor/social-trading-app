-- Migration: Add Authentication Fields to User Table
-- This migration adds email verification, password reset, and name fields to the User model
-- Run this on your production database

-- Add authentication-related columns to User table
ALTER TABLE "User" 
ADD COLUMN IF NOT EXISTS "name" TEXT,
ADD COLUMN IF NOT EXISTS "password" TEXT,
ADD COLUMN IF NOT EXISTS "emailVerified" BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS "emailVerificationToken" TEXT,
ADD COLUMN IF NOT EXISTS "passwordResetToken" TEXT,
ADD COLUMN IF NOT EXISTS "passwordResetExpiry" TIMESTAMP(3);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS "User_emailVerificationToken_idx" ON "User"("emailVerificationToken");
CREATE INDEX IF NOT EXISTS "User_passwordResetToken_idx" ON "User"("passwordResetToken");
CREATE INDEX IF NOT EXISTS "User_email_idx" ON "User"("email");

-- Update existing users to have emailVerified = true (for backwards compatibility)
-- Only run this if you have existing users that should be considered verified
-- UPDATE "User" SET "emailVerified" = true WHERE "emailVerified" IS NULL;

COMMIT; 