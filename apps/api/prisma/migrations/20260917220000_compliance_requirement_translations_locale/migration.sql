-- ComplianceRequirement.translations (multi-locale CISO) + User.complianceContentLocale
ALTER TABLE "ComplianceRequirement" ADD COLUMN IF NOT EXISTS "translations" JSONB;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "complianceContentLocale" TEXT;
