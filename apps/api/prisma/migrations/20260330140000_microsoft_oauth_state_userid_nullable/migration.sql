-- Flux SSO : l’état OAuth est créé avant authentification (pas de userId connu).
-- Corrige une base où "userId" aurait NOT NULL (dérive / ancien schéma) alors que Prisma attend String?.
ALTER TABLE "MicrosoftOAuthState" ALTER COLUMN "userId" DROP NOT NULL;
