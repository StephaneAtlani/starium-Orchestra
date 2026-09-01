# Liaisons inter-modules

**Référence canonique** : [../LIAISONS-MODULES.md](../LIAISONS-MODULES.md)

**Graphe interactif (Cursor Canvas)** : [graphe-fonctionnel-modules.canvas.tsx](./graphe-fonctionnel-modules.canvas.tsx)

Le fichier `.canvas.tsx` est versionné ici (import `cursor/canvas`, hors build Next/Nest).
Cursor le rend à côté du chat s’il est aussi dans le dossier canvases de l’IDE. Après un `git pull` :

```bash
cp docs/liaisons/graphe-fonctionnel-modules.canvas.tsx \
  ~/.cursor/projects/Users-satlani-Documents-DEV-starium-Orchestra/canvases/
```

Après une edit du canvas dans Cursor, recopier **vers** `docs/liaisons/` avant de committer.
