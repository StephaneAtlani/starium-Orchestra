-- RFC-CORE-SEARCH-001 — champs d'indexation recherche globale (schéma uniquement ; backfill via script Node)

ALTER TABLE "Project" ADD COLUMN "searchText" TEXT;

ALTER TABLE "Budget" ADD COLUMN "searchText" TEXT;

ALTER TABLE "ChatbotKnowledgeEntry" ADD COLUMN "searchText" TEXT;
ALTER TABLE "ChatbotKnowledgeEntry" ADD COLUMN "indexedAt" TIMESTAMP(3);
