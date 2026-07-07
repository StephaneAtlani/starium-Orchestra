-- RASCI : ajout du rôle Soutien (S) à la dimension existante.

ALTER TYPE "ProjectRaciKind" ADD VALUE IF NOT EXISTS 'SUPPORT';
