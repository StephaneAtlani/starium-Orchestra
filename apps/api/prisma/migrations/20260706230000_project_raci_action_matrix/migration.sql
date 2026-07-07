-- Matrice RACI acteur × action : remplace le modèle rôle × lettres globales.

DROP TABLE IF EXISTS "ProjectTeamRaci";

CREATE TABLE "ProjectRaciAction" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "label" VARCHAR(500) NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjectRaciAction_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ProjectRaciCell" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "actionId" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "kind" "ProjectRaciKind" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjectRaciCell_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ProjectRaciAction_clientId_idx" ON "ProjectRaciAction"("clientId");
CREATE INDEX "ProjectRaciAction_projectId_idx" ON "ProjectRaciAction"("projectId");

CREATE INDEX "ProjectRaciCell_clientId_idx" ON "ProjectRaciCell"("clientId");
CREATE INDEX "ProjectRaciCell_projectId_idx" ON "ProjectRaciCell"("projectId");
CREATE INDEX "ProjectRaciCell_actionId_idx" ON "ProjectRaciCell"("actionId");
CREATE INDEX "ProjectRaciCell_roleId_idx" ON "ProjectRaciCell"("roleId");

CREATE UNIQUE INDEX "ProjectRaciCell_projectId_actionId_roleId_key" ON "ProjectRaciCell"("projectId", "actionId", "roleId");

ALTER TABLE "ProjectRaciAction" ADD CONSTRAINT "ProjectRaciAction_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ProjectRaciAction" ADD CONSTRAINT "ProjectRaciAction_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ProjectRaciCell" ADD CONSTRAINT "ProjectRaciCell_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ProjectRaciCell" ADD CONSTRAINT "ProjectRaciCell_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProjectRaciCell" ADD CONSTRAINT "ProjectRaciCell_actionId_fkey" FOREIGN KEY ("actionId") REFERENCES "ProjectRaciAction"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProjectRaciCell" ADD CONSTRAINT "ProjectRaciCell_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "ProjectTeamRole"("id") ON DELETE CASCADE ON UPDATE CASCADE;
