# RFC-035 — Procurement : stockage local et dual backend (S3 optionnel)

| Attribut | Valeur |
| --- | --- |
| **Statut** | Draft |
| **Remplace / complète** | [RFC-034 — Documents et GED](./RFC-034%20%E2%80%94%20Documents%20et%20GED%20%E2%80%94%20Devis%20Commande%20Facture.md) (§ stockage binaire) |
| **Périmètre** | Pièces jointes procurement (`ProcurementAttachment`), configuration plateforme, Docker dev/prod-like |

---

## 1. Analyse de l’existant

- **RFC-034** impose un stockage **S3-compatible** avec **MinIO** en Docker (réseau interne ou ports exposés en dev), variables `PROCUREMENT_S3_*`, singleton Prisma `PlatformProcurementS3Settings`, service NestJS `ProcurementObjectStorageService` basé sur `@aws-sdk/client-s3`.
- **MinIO** n’est utilisé que pour ce flux ; il n’y a pas d’autre consommateur S3 métier identifié dans le dépôt pour la GED procurement.
- Les enregistrements `ProcurementAttachment` portent `storageBucket` + `objectKey` (clé opaque) ; le frontend ne doit jamais afficher ces champs comme libellés métier (inchangé).

**Constat** : pour les environnements simples (dev, petite prod sans objet cloud), imposer MinIO alourdit l’infra sans gain immédiat.

---

## 2. Hypothèses

- **H1** — Un **double backend** est souhaité : **disque local** (répertoire sur le serveur API) par défaut en dev / déploiements simples ; **S3-compatible** (AWS, MinIO, etc.) reste disponible pour la prod cloud ou les exigences objet.
- **H2** — La variable d’environnement **`PROCUREMENT_STORAGE_DRIVER`** (`local` \| `s3`, insensible à la casse) **prime** sur la valeur persistée en base pour l’**effet runtime**, afin de piloter Docker / CI sans migration de données.
- **H3** — Le **chemin racine** local est résolu dans l’ordre : `PROCUREMENT_LOCAL_ROOT` (env) puis, si la ligne plateforme est `enabled` et `localRoot` renseigné, la valeur **DB** (aligné sur le modèle « env d’abord » de RFC-034 pour les secrets / repli).
- **H4** — Les pièces déjà stockées en S3 restent lisibles tant que la configuration S3 permet d’atteindre le **même bucket** ; les nouveaux uploads utilisent le driver **effectif** au moment de l’upload (pas de migration automatique imposée en V1 de cette RFC).
- **H5** — Le libellé logique de bucket pour le mode local est une **constante applicative** (`local`) stockée dans `storageBucket` pour les nouveaux fichiers locaux, afin d’éviter une migration de schéma sur `ProcurementAttachment` et de router le download vers le bon backend.

---

## 3. Liste des fichiers à créer / modifier

### 3.1 Backend

| Fichier | Action |
| --- | --- |
| `apps/api/src/modules/procurement/s3/procurement-storage-resolution.service.ts` | **Créer** — résolution `effectiveDriver`, `resolveForOperations`, racine locale |
| `apps/api/src/modules/procurement/s3/local-procurement-blob-storage.service.ts` | **Créer** — écriture / lecture fichiers, garde path traversal |
| `apps/api/src/modules/procurement/s3/s3-procurement-blob-storage.service.ts` | **Créer** — logique S3 extraite de l’ancien service monolithique |
| `apps/api/src/modules/procurement/s3/procurement-object-storage.service.ts` | **Modifier** — façade `putObject` / `getObjectStream` selon driver + init |
| `apps/api/src/modules/procurement/s3/procurement-s3-config.resolver.service.ts` | **Conserver** — résolution config S3 (DB puis env) |
| `apps/api/src/modules/procurement/s3/platform-procurement-s3-settings.service.ts` | **Modifier** — champs publics, contrôles connectivité local / S3 |
| `apps/api/src/modules/procurement/s3/dto/update-platform-procurement-s3-settings.dto.ts` | **Modifier** — `storageDriver`, `localRoot` |
| `apps/api/src/modules/procurement/procurement.module.ts` | **Modifier** — enregistrer les nouveaux services |
| `apps/api/src/modules/procurement/s3/*.spec.ts` | **Modifier** — mocks / cas driver |

### 3.2 Prisma

| Fichier | Action |
| --- | --- |
| `apps/api/prisma/schema.prisma` | Enum `ProcurementStorageDriver` ; champs `storageDriver`, `localRoot` sur `PlatformProcurementS3Settings` |
| `apps/api/prisma/migrations/..._rfc035_procurement_storage_dual/` | **Créer** — `DEFAULT 'S3'` pour compatibilité des déploiements existants |

### 3.3 Docker

| Fichier | Action |
| --- | --- |
| `docker-compose.yml` | `PROCUREMENT_STORAGE_DRIVER=local`, `PROCUREMENT_LOCAL_ROOT`, volume disque API ; **sans** dépendance `api` → `minio` ; service **minio** en **profil** `procurement-s3` (optionnel) |
| `docker-compose.dev.yml` | Idem côté `api-dev` ; MinIO optionnel (profil), suppression de `depends_on: minio` par défaut |

### 3.4 Documentation (mises à jour de référence)

| Fichier | Action |
| --- | --- |
| [RFC-034](./RFC-034%20%E2%80%94%20Documents%20et%20GED%20%E2%80%94%20Devis%20Commande%20Facture.md) | Ajuster les mentions « MinIO obligatoire » → **dual backend** + lien RFC-035 |
| [docs/API.md](../API.md) | Étendre la section `GET|PATCH /api/platform/procurement-s3-settings` (nouveaux champs, variables d’env) |
| [docs/ARCHITECTURE.md](../ARCHITECTURE.md) | Résumer stockage procurement : local par défaut en compose, S3 optionnel |
| [docs/RFC/_RFC Liste.md](./_RFC%20Liste.md) | Ligne **RFC-035** |

---

## 4. Implémentation (spécification comportementale)

### 4.1 Invariants (hérités RFC-034)

- **NestJS** reste le **seul** point d’entrée upload / download ; pas d’URL signée vers le stockage en V1.
- Clés d’objet **opaques** ; contrôle **client actif** + parent PO / facture avant lecture.
- **Isolation** : pas de path traversal ; chemins fichiers local **normalisés** sous la racine configurée.

### 4.2 Résolution du driver

1. Si `PROCUREMENT_STORAGE_DRIVER` vaut `local` ou `s3` (normalisé) → driver effectif = cette valeur.
2. Sinon → `PlatformProcurementS3Settings.storageDriver` (défaut **S3** en base pour les bases migrées depuis RFC-034).
3. Valeur env invalide : ignorer avec **warn** log, retombée sur la DB.

### 4.3 Mode local

- **Racine** : `PROCUREMENT_LOCAL_ROOT` si défini ; sinon `localRoot` en DB si `enabled === true`.
- **Écriture** : même schéma de clé relative que S3 (`procurement/<uuid>/<uuid>.<ext>`), fichier = `path.join(root, objectKey)` avec création récursive des répertoires parents.
- **Lecture** : si `storageBucket === 'local'` (constante code), lecture disque ; sinon délégation S3 (pièces historiques).
- **`storageBucket` en base** pour les uploads locaux : toujours la chaîne **`local`**.

### 4.4 Mode S3

- Comportement inchangé par rapport à l’implémentation RFC-034 : `HeadBucket` / `CreateBucket` au démarrage ou à l’usage, `PutObject` / `GetObject`, vérification que le bucket demandé correspond à la config active pour le download.

### 4.5 API plateforme `GET|PATCH /api/platform/procurement-s3-settings`

- **GET** — champs additionnels (noms indicatifs) :
  - `storageDriver` : valeur **DB** (`LOCAL` \| `S3` selon sérialisation).
  - `localRoot` : valeur **DB** (nullable) ; jamais de secret.
  - `effectiveDriver` : `local` \| `s3` (effet runtime après override env).
  - `effectiveS3Source` : `db` \| `env` \| `none` (pertinent si `effectiveDriver === s3`).
  - `effectiveLocalRootSource` : `env` \| `db` \| `none` (pertinent si `effectiveDriver === local`).
- Conserver `effectiveSource` existant comme alias **S3** ou le documenter comme `effectiveS3Source` si renommé côté implémentation (à garder **rétrocompatible** : préférence pour **ajouter** `effectiveS3Source` et conserver `effectiveSource` comme synonyme documenté = `effectiveS3Source` pour ne pas casser les clients).

**Décision d’implémentation dépôt** : conserver **`effectiveSource`** pour la source S3 (`db` \| `env` \| `none`) ; ajouter **`effectiveDriver`**, **`effectiveLocalRootSource`**, **`storageDriver`**, **`localRoot`**.

- **PATCH** — champs optionnels : `storageDriver`, `localRoot` (mêmes validations longueur que les autres chaînes plateforme).
- **Validation** lorsque `enabled === true` après patch :
  - driver effectif **local** : racine résolue non vide, répertoire créable / accessible en écriture.
  - driver effectif **s3** : contrôle connectivité S3 existant (`HeadBucket`, création si 404).

### 4.6 UX admin (valeur, pas ID)

- Tout sélecteur ou libellé côté UI plateforme pour le driver doit afficher des **libellés métier** (ex. « Disque serveur », « Stockage objet (S3) »), pas seulement les codes `local` / `s3`.
- Ne pas exposer aux **utilisateurs client** les chemins serveur ni les clés techniques ; périmètre **platform admin** uniquement pour `localRoot`.

---

## 5. Modifications Prisma

```prisma
enum ProcurementStorageDriver {
  LOCAL
  S3
}

model PlatformProcurementS3Settings {
  // ... champs existants ...
  storageDriver ProcurementStorageDriver @default(S3)
  localRoot     String?
}
```

- **Migration** : `storageDriver` **NOT NULL DEFAULT 'S3'** pour ne pas casser les environnements déjà calés sur MinIO / S3 sans variable d’env.
- **Aucun** changement sur `ProcurementAttachment` en V1 de cette RFC (sentinel `local` sur `storageBucket`).

---

## 6. Tests

- **Unitaires** : service de résolution (ordre env > DB, cas `enabled` + `localRoot`) ; stockage local (répertoire temporaire, rejet `..` dans `objectKey`) ; façade (mock local / S3).
- **Régression** : `PlatformProcurementS3SettingsService` / contrôleur avec driver S3.
- **CI** : possible exécution **sans** MinIO si `PROCUREMENT_STORAGE_DRIVER=local` et `PROCUREMENT_LOCAL_ROOT` pointent vers un dossier temporaire.

---

## 7. Récapitulatif final

- MinIO **n’est plus requis** pour les profils Docker par défaut : volume disque sur l’API + driver **local**.
- Les déploiements **S3** restent supportés (env `PROCUREMENT_STORAGE_DRIVER=s3` et `PROCUREMENT_S3_*` ou config DB).
- La RFC **complète** RFC-034 sur le plan stockage ; le reste (audit, RBAC, XOR PO/facture) est inchangé.

---

## 8. Points de vigilance

- **Sauvegarde** : inclure le volume / répertoire local dans la stratégie de backup (comme pour MinIO auparavant).
- **Migration MinIO → disque** : procédure manuelle ou script (liste des `objectKey`, copie des octets vers fichiers sous la racine locale, mise à jour des lignes `storageBucket` / `objectKey` si changement de convention) — **hors** chemin automatique obligatoire.
- **Multi-instance API** : le disque local doit être un **stockage partagé** (NFS, EFS, etc.) si plusieurs réplicas écrivent ; sinon rester en **S3**.
- **Permissions OS** : utilisateur du conteneur avec droits restreints sur la racine ; pas de partage world-readable involontaire.
- **Cohérence rétention** (RFC-034 §12) : purge physique disque alignée sur les mêmes règles métier / légales que pour les objets S3.

---

## 9. Historique des révisions

| Date | Auteur | Résumé |
| --- | --- | --- |
| 2026-04 | — | Création : dual backend local + S3, env prioritaire, sentinel `local`, migration sans changement `ProcurementAttachment` |

---

## Sources internes

- [RFC-034 — Documents et GED](./RFC-034%20%E2%80%94%20Documents%20et%20GED%20%E2%80%94%20Devis%20Commande%20Facture.md)
- [docs/ARCHITECTURE.md](../ARCHITECTURE.md)
- [docs/API.md](../API.md)
