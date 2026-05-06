-- RFC-STRAT-007 — Vision stratégique V1 — Migration 1/2 : enums uniquement.
-- Cette migration ne fait QUE créer/étendre des types enum.
-- AUCUN UPDATE/INSERT consommant les nouvelles valeurs n'est exécuté ici
-- (PostgreSQL impose que les nouvelles valeurs d'enum soient committées
-- avant d'être utilisables dans des INSERT/UPDATE).

-- CreateEnum
CREATE TYPE "StrategicVisionStatus" AS ENUM ('DRAFT', 'ACTIVE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "StrategicAxisStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "StrategicObjectiveLifecycleStatus" AS ENUM ('DRAFT', 'ACTIVE', 'COMPLETED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "StrategicObjectiveHealthStatus" AS ENUM ('ON_TRACK', 'AT_RISK', 'OFF_TRACK');

-- AlterEnum
ALTER TYPE "StrategicLinkType" ADD VALUE IF NOT EXISTS 'BUDGET_LINE';
ALTER TYPE "StrategicLinkType" ADD VALUE IF NOT EXISTS 'GOVERNANCE_CYCLE';
ALTER TYPE "StrategicLinkType" ADD VALUE IF NOT EXISTS 'MANUAL';
