-- Identités gérées par l’annuaire (AD DS / synchro) — verrouillage édition côté API + UI.
ALTER TABLE "UserEmailIdentity" ADD COLUMN "directoryManaged" BOOLEAN NOT NULL DEFAULT false;
