-- RFC-STRAT-002: indexation KPI strategic vision
CREATE INDEX "StrategicObjective_clientId_deadline_idx"
ON "StrategicObjective"("clientId", "deadline");

CREATE INDEX "StrategicLink_clientId_targetId_idx"
ON "StrategicLink"("clientId", "targetId");
