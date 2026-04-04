-- Retrait du modèle staffing planifié (RFC-TEAM-007/008 supprimés côté API).
-- Le temps métier passe par ResourceTimeEntry (module Ressources).

DROP TABLE IF EXISTS "TeamResourceAssignment";
