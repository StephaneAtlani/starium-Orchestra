# RFC-SEC-001 — MFA Hardening & Recovery Codes

## Statut

📝 RFC rédigée

## Priorité

**P0 — Critique sécurité**

---

## 1. Contexte & problème

Starium Orchestra implémente une double authentification TOTP (RFC-002) avec fallback email et codes de secours. L'implémentation actuelle présente plusieurs faiblesses constatées en production :

1. **Recovery codes inutilisables si la clé de chiffrement MFA change** : le backend tente de déchiffrer le secret TOTP *avant* de tester les codes de secours. Si le déchiffrement échoue (`Erreur lecture secret MFA`), l'utilisateur est totalement verrouillé — y compris avec un recovery code valide.

2. **Clé de chiffrement MFA couplée au JWT** : sans `MFA_ENCRYPTION_KEY` explicite, le service dérive la clé depuis `JWT_SECRET`. Une rotation JWT casse silencieusement tous les comptes MFA.

3. **Pas de versioning de clé** : aucune rotation possible sans ré-enrôlement de masse.

4. **Fallback email silencieux** : sans `SMTP_HOST`, l'API simule l'envoi (log + return) ; l'utilisateur croit que l'email est parti.

5. **Pas de bouton "Utiliser un code de secours"** dans le formulaire MFA login : l'utilisateur doit saisir le code de secours dans le même champ TOTP sans indication claire.

---

## 2. Objectifs

| # | Objectif | Priorité |
|---|----------|----------|
| O1 | Recovery codes fonctionnent même si le déchiffrement TOTP échoue | P0 |
| O2 | Bouton / lien « Utiliser un code de secours » sur l'écran MFA login | P0 |
| O3 | `MFA_ENCRYPTION_KEY` obligatoire en production (fail-fast au démarrage) | P0 |
| O4 | Endpoint dédié `POST /auth/mfa/recovery/verify` | P1 |
| O5 | Key versioning (`keyVersion` sur `UserMfa`) | P1 |
| O6 | Fallback email : fail-fast ou message UI explicite si SMTP absent | P1 |
| O7 | Audit log dédié pour authentification par recovery code | P1 |
| O8 | Admin reset MFA d'un utilisateur (`PLATFORM_ADMIN` / `CLIENT_ADMIN`) | P1 |
| O9 | Envelope encryption (DEK/KEK) — roadmap | P2 |
| O10 | WebAuthn / Passkeys (NIST SP 800-63B-4) — roadmap | P3 |

---

## 3. Périmètre

### Inclus (cette RFC)

- Séparation du chemin recovery codes vs TOTP dans `MfaService`
- Nouvel endpoint `POST /auth/mfa/recovery/verify`
- DTO `MfaRecoveryVerifyDto`
- Service frontend `verifyMfaRecoveryApi`
- Bouton « Utiliser un code de secours » sur la page login (étape MFA)
- Écran dédié saisie recovery code (champ + trust device)
- Fail-fast `MFA_ENCRYPTION_KEY` en production
- Key versioning Prisma (`keyVersion` sur `UserMfa`)
- Support multi-clés decrypt dans `MfaCryptoService`
- Fail-fast ou message explicite SMTP absent
- Variable `MFA_ENCRYPTION_KEY` dans `docker-compose.yml`
- Audit logs : `auth.mfa.recovery_success`, `auth.mfa.recovery_failure`
- Tests unitaires backend
- Admin reset MFA via UI (`/admin/users`) avec scope client + audit
- Endpoint `POST /api/admin/users/:userId/reset-mfa`
- Mise à jour `_RFC Liste.md`

### Exclu

- Envelope encryption DEK/KEK (RFC future)
- WebAuthn / Passkeys (RFC future)
- Notification email automatique après admin reset (P2)

---

## 4. Architecture technique

### 4.1. Chemin recovery codes indépendant du déchiffrement TOTP

**Avant (actuel)** :

```
verifyLoginTotp(challengeId, otp)
  → loadActiveLoginChallenge(challengeId)
  → bumpAttempts
  → crypto.decrypt(totpSecretEncrypted)  ← THROW si clé incohérente
  → speakeasy.totp.verify(...)
  → si KO : test recovery codes (bcrypt)  ← jamais atteint
```

**Après** :

```
verifyLoginTotp(challengeId, otp)
  → loadActiveLoginChallenge(challengeId)
  → bumpAttempts
  → TRY crypto.decrypt → speakeasy.totp.verify
  → SI decrypt échoue OU totp invalide :
      → test recovery codes (bcrypt) — TOUJOURS tenté
  → si tout KO : throw UnauthorizedException
```

Et un **endpoint dédié** recovery :

```
verifyLoginRecovery(challengeId, recoveryCode)
  → loadActiveLoginChallenge(challengeId)
  → bumpAttempts
  → test recovery codes UNIQUEMENT (bcrypt, pas de decrypt TOTP)
  → consume challenge
  → return userId
```

### 4.2. Nouvel endpoint API

| Méthode | Route | Description |
|---------|-------|-------------|
| `POST` | `/auth/mfa/recovery/verify` | Valide un recovery code pour un challenge LOGIN |

#### Request body (`MfaRecoveryVerifyDto`)

```json
{
  "challengeId": "clxyz...",
  "recoveryCode": "3F0ADD751C",
  "trustDevice": true
}
```

#### Réponse (identique aux autres endpoints MFA)

```json
{
  "status": "AUTHENTICATED",
  "accessToken": "...",
  "refreshToken": "...",
  "trustedDeviceToken": "..."
}
```

### 4.3. `MfaCryptoService` — fail-fast + key versioning

```typescript
constructor(config: ConfigService) {
  const envKey = config.get<string>('MFA_ENCRYPTION_KEY')?.trim();
  const isProd = config.get<string>('NODE_ENV') === 'production';

  if (!envKey && isProd) {
    throw new Error(
      'MFA_ENCRYPTION_KEY is required in production (64 hex chars = 32 bytes)',
    );
  }

  // Clé courante
  this.currentKeyVersion = Number(config.get('MFA_KEY_VERSION') ?? '1');
  this.keys = new Map();
  this.keys.set(this.currentKeyVersion, this.deriveKey(envKey, config));

  // Anciennes clés (MFA_ENCRYPTION_KEY_V1, _V2, etc.)
  for (let v = 1; v < this.currentKeyVersion; v++) {
    const old = config.get<string>(`MFA_ENCRYPTION_KEY_V${v}`)?.trim();
    if (old) {
      this.keys.set(v, this.deriveKey(old, config));
    }
  }
}
```

### 4.4. Modèle Prisma — ajout `keyVersion`

```prisma
model UserMfa {
  id                  String    @id @default(cuid())
  userId              String    @unique
  user                User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  totpSecretEncrypted String?
  totpPending         Boolean   @default(false)
  totpEnabledAt       DateTime?
  backupCodesHashes   Json?
  keyVersion          Int       @default(1)    // ← NOUVEAU
  createdAt           DateTime  @default(now())
  updatedAt           DateTime  @updatedAt
}
```

Migration :

```sql
ALTER TABLE "UserMfa" ADD COLUMN "keyVersion" INTEGER NOT NULL DEFAULT 1;
```

### 4.5. SMTP — fail-fast ou message explicite

```typescript
private async deliverEmailOtp(to: string, code: string): Promise<void> {
  const smtpHost = process.env.SMTP_HOST?.trim();
  if (!smtpHost) {
    const isProd = process.env.NODE_ENV === 'production';
    if (isProd) {
      throw new InternalServerErrorException(
        'Service email non configuré (SMTP_HOST manquant)',
      );
    }
    this.logger.warn(`[MFA] OTP email pour ${to} (dev, pas d'envoi) : ${code}`);
    return;
  }
  // ... envoi réel
}
```

### 4.6. `docker-compose.yml`

```yaml
x-api-base-env: &api-base-env
  DATABASE_URL: "postgresql://starium:starium@postgres:5432/starium"
  PORT: "3001"
  JWT_SECRET: ${JWT_SECRET:-change-me-in-prod}
  MFA_ENCRYPTION_KEY: ${MFA_ENCRYPTION_KEY}          # ← NOUVEAU — 64 hex
  MFA_KEY_VERSION: ${MFA_KEY_VERSION:-1}              # ← NOUVEAU
```

---

## 5. Frontend — Bouton « Utiliser un code de secours »

### 5.1. Page login — étape MFA (`mfaStep === 'totp'`)

Ajout d'un nouveau state `mfaStep: 'recovery'` et d'un bouton dans l'écran TOTP :

```
┌─────────────────────────────────────────┐
│ Double authentification                  │
│                                          │
│ Code TOTP / secours : [______]           │
│                                          │
│ ☑ Faire confiance à cet appareil (30j)  │
│                                          │
│ [ Valider ]                              │
│ [ Recevoir un code par email à la place ]│
│ [ Utiliser un code de secours ]   ← NEW │
│ [ Retour ]                               │
└─────────────────────────────────────────┘
```

### 5.2. Nouvel écran recovery (`mfaStep === 'recovery'`)

```
┌─────────────────────────────────────────┐
│ Code de secours                          │
│                                          │
│ Saisissez l'un de vos codes de secours   │
│ (usage unique).                          │
│                                          │
│ Code : [__________]                      │
│                                          │
│ ☑ Faire confiance à cet appareil (30j)  │
│                                          │
│ [ Valider le code de secours ]           │
│ [ Retour au code application ]           │
└─────────────────────────────────────────┘
```

### 5.3. Service frontend

Nouveau service `verifyMfaRecoveryApi` dans `apps/web/src/services/auth.ts` :

```typescript
export async function verifyMfaRecoveryApi(
  challengeId: string,
  recoveryCode: string,
  trustDevice?: boolean,
): Promise<{
  status: 'AUTHENTICATED';
  accessToken: string;
  refreshToken: string;
  trustedDeviceToken?: string;
}>
```

### 5.4. Auth context

Ajout de `completeMfaRecovery` dans `AuthContextValue` :

```typescript
completeMfaRecovery: (
  challengeId: string,
  recoveryCode: string,
  trustDevice?: boolean,
) => Promise<{ user: AuthUser; accessToken: string }>;
```

---

## 6. Fichiers à créer / modifier

### Nouveaux fichiers

| Fichier | Description |
|---------|-------------|
| `apps/api/src/modules/auth/dto/mfa-recovery-verify.dto.ts` | DTO recovery code |

### Fichiers modifiés

| Fichier | Modification |
|---------|-------------|
| `apps/api/prisma/schema.prisma` | Ajout `keyVersion` sur `UserMfa` |
| `apps/api/src/modules/mfa/mfa.service.ts` | Recovery codes indépendants du decrypt ; nouveau `verifyLoginRecovery` |
| `apps/api/src/modules/mfa/mfa-crypto.service.ts` | Fail-fast prod ; key versioning multi-clés |
| `apps/api/src/modules/mfa/mfa.constants.ts` | (inchangé ou constantes recovery si besoin) |
| `apps/api/src/modules/auth/auth.service.ts` | Nouveau `verifyMfaRecoveryAfterLogin` |
| `apps/api/src/modules/auth/auth.controller.ts` | Route `POST /auth/mfa/recovery/verify` |
| `apps/web/src/services/auth.ts` | `verifyMfaRecoveryApi` |
| `apps/web/src/context/auth-context.tsx` | `completeMfaRecovery` |
| `apps/web/src/app/login/page.tsx` | State `recovery` + bouton + écran dédié |
| `docker-compose.yml` | `MFA_ENCRYPTION_KEY`, `MFA_KEY_VERSION` |

---

## 7. Audit logs

| Événement | Quand |
|-----------|-------|
| `auth.mfa.recovery_success` | Recovery code valide, challenge consommé |
| `auth.mfa.recovery_failure` | Recovery code invalide |
| `auth.mfa.decrypt_fallback` | Decrypt TOTP échoué, tentative recovery code (warning) |

---

## 8. Tests

### Backend

| Test | Description |
|------|-------------|
| `verifyLoginRecovery` — code valide | Authentification OK, challenge consommé, code supprimé |
| `verifyLoginRecovery` — code invalide | 401 + audit log failure |
| `verifyLoginRecovery` — challenge expiré | 401 |
| `verifyLoginRecovery` — trop de tentatives | 403 |
| `verifyLoginTotp` — decrypt fail + recovery code valide | Authentification OK (chemin dégradé) |
| `verifyLoginTotp` — decrypt fail + recovery code invalide | 401 |
| `MfaCryptoService` — fail-fast sans `MFA_ENCRYPTION_KEY` en prod | Throw au démarrage |
| `MfaCryptoService` — multi-clés decrypt (ancienne + courante) | Decrypt OK avec les deux |
| `deliverEmailOtp` — pas de SMTP en prod | 500 |

### Frontend

| Test | Description |
|------|-------------|
| Bouton « Utiliser un code de secours » visible sur l'écran TOTP | Rendu conditionnel |
| Navigation TOTP → Recovery → TOTP | States corrects |
| Soumission recovery code → authentification | Flux complet |

---

## 9. Récapitulatif des bonnes pratiques appliquées

| Bonne pratique | Source | Implémentation |
|----------------|--------|---------------|
| Recovery codes indépendants du chiffrement TOTP | NIST / industrie | Chemin `verifyLoginRecovery` sans decrypt |
| Recovery codes hashés bcrypt, one-time-use | NIST SP 800-63B-4 | Existant (conservé) |
| Secret TOTP chiffré AES-256-GCM au repos | knowledgelib.io / NIST | Existant (conservé) |
| Clé MFA dédiée, séparée du JWT | Pratique standard SaaS | `MFA_ENCRYPTION_KEY` obligatoire |
| Key versioning pour rotation sans casse | FusionAuth / Vault | `keyVersion` + multi-clés |
| Rate-limit MFA (5 tentatives/challenge) | OWASP | Existant (conservé) |
| Fenêtre TOTP ±1 step (30s) | RFC 6238 | Existant (conservé) |
| Fail-fast config critique en production | 12-factor app | Throw au démarrage si clé absente |
| Audit de chaque événement MFA | SOC2 / ISO 27001 | Événements dédiés recovery |
| UX claire : bouton recovery code distinct | UX auth (WordPress 2FA, Auth0, Okta) | Écran dédié login |

---

## 10. Admin reset MFA (P1)

### 10.1. Contexte

Quand un utilisateur a perdu son app TOTP **et** ses recovery codes **et** n'a pas accès au fallback email, seul un administrateur peut débloquer le compte. C'est le flux standard chez Okta, Auth0, Microsoft Entra, Google Workspace.

### 10.2. Qui peut reset

| Rôle | Peut reset MFA de… |
|------|---------------------|
| `PLATFORM_ADMIN` | Tout utilisateur de la plateforme |
| `CLIENT_ADMIN` | Utilisateurs de son client uniquement |

Un admin **ne peut pas** reset sa propre MFA via cette interface (empêche un attaquant ayant compromis un admin de se reset lui-même). Le self-reset passe par recovery code ou fallback email.

### 10.3. Endpoint API

| Méthode | Route | Auth | Description |
|---------|-------|------|-------------|
| `POST` | `/api/admin/users/:userId/reset-mfa` | JWT + `PLATFORM_ADMIN` ou `CLIENT_ADMIN` (client-scoped) | Supprime MFA, challenges, devices de confiance et sessions |

#### Request body

Aucun body requis.

#### Réponse

```json
{
  "success": true,
  "message": "MFA réinitialisée pour l'utilisateur"
}
```

#### Erreurs

| Code | Cas |
|------|-----|
| `403` | Admin tente de reset un user hors de son scope client |
| `403` | Admin tente de reset sa propre MFA |
| `404` | Utilisateur introuvable |
| `400` | MFA non activée sur ce compte |

### 10.4. Actions backend

```
1. Vérifier que l'admin a le droit (PLATFORM_ADMIN ou CLIENT_ADMIN du même client)
2. Vérifier que targetUserId ≠ adminUserId
3. Vérifier que la MFA est activée sur le compte cible
4. DELETE UserMfa       WHERE userId = targetUserId
5. DELETE MfaChallenge  WHERE userId = targetUserId
6. DELETE TrustedDevice WHERE userId = targetUserId
7. DELETE RefreshToken  WHERE userId = targetUserId   (force re-login)
8. INSERT SecurityLog :
     event: 'admin.mfa.reset'
     userId: adminUserId
     targetUserId: targetUserId
     email: targetUser.email
     success: true
9. (Optionnel P2) Notification email au user cible : "Votre 2FA a été réinitialisée par un administrateur"
```

### 10.5. UI — Page `/admin/users`

Ajout d'une action dans la fiche utilisateur (ou menu contextuel de la liste) :

```
┌─────────────────────────────────────────┐
│ Utilisateur : jean.dupont@client.com    │
│ MFA : Activée                           │
│                                         │
│ [ Réinitialiser la 2FA ]  ← bouton     │
│                                         │
│ ┌─ Confirmation ──────────────────────┐ │
│ │ Êtes-vous sûr de vouloir           │ │
│ │ réinitialiser la 2FA de cet        │ │
│ │ utilisateur ?                      │ │
│ │                                    │ │
│ │ L'utilisateur devra reconfigurer   │ │
│ │ sa double authentification à la    │ │
│ │ prochaine connexion.              │ │
│ │                                    │ │
│ │ [ Annuler ]  [ Confirmer le reset ]│ │
│ └────────────────────────────────────┘ │
└─────────────────────────────────────────┘
```

- Bouton visible uniquement si l'admin a le droit et la MFA est activée sur le compte cible
- Dialog de confirmation obligatoire (action destructive)
- Toast de succès après reset

### 10.6. Audit logs

| Événement | Données |
|-----------|---------|
| `admin.mfa.reset` | `adminUserId`, `targetUserId`, `targetEmail`, `ipAddress`, `userAgent` |

Visible dans `/admin/audit` avec filtre sur événement `admin.mfa.reset`.

### 10.7. Fichiers à créer / modifier

| Fichier | Modification |
|---------|-------------|
| `apps/api/src/modules/admin/admin-users.controller.ts` | Route `POST /admin/users/:userId/reset-mfa` |
| `apps/api/src/modules/admin/admin-users.service.ts` | Logique reset + scope check |
| `apps/api/src/modules/mfa/mfa.service.ts` | Méthode `adminResetMfa(targetUserId, adminUserId, meta)` |
| `apps/web/src/app/(protected)/admin/users/page.tsx` | Bouton + dialog + appel API |
| `apps/web/src/services/admin.ts` | `resetUserMfa(userId)` |

### 10.8. Tests

| Test | Description |
|------|-------------|
| PLATFORM_ADMIN reset MFA d'un user → OK | MFA supprimée, sessions invalidées, audit log |
| CLIENT_ADMIN reset MFA d'un user de son client → OK | Scope respecté |
| CLIENT_ADMIN reset MFA d'un user d'un autre client → 403 | Isolation client |
| Admin reset sa propre MFA → 403 | Self-reset interdit |
| Reset d'un user sans MFA → 400 | Pas de suppression inutile |
| User cible se reconnecte après reset → login sans MFA | Flux normal |

---

## 11. Roadmap post-RFC

| Phase | Sujet | Dépendances |
|-------|-------|-------------|
| P2 | Envelope encryption (DEK par user chiffré par KEK) | Cette RFC (key versioning) |
| P2 | Régénération recovery codes (sans désactiver MFA) | Endpoint `/me/mfa/recovery-codes/regenerate` |
| P2 | Notification email à l'utilisateur après admin reset MFA | SMTP configuré |
| P3 | WebAuthn / Passkeys (FIDO2) | NIST SP 800-63B-4 ; phishing-resistant |
| P3 | MFA obligatoire par politique client (admin studio) | Module admin configurable |

---

## 12. Points de vigilance

1. **Migration Prisma** : le champ `keyVersion` a un default `1`, donc migration non-breaking.
2. **Rétrocompatibilité** : les comptes existants ont `keyVersion=1` et continuent de fonctionner avec la clé courante.
3. **Docker Compose** : la variable `MFA_ENCRYPTION_KEY` doit être ajoutée au `.env` prod **avant** le prochain déploiement.
4. **Recovery codes restants** : un recovery code utilisé est supprimé du tableau JSON. Quand tous sont épuisés, l'utilisateur doit ré-enrôler la MFA pour en obtenir de nouveaux (phase P2 : régénération sans désactivation).
5. **Nombre d'attempts** : le endpoint recovery partage le même `attemptCount` du challenge (anti-brute-force unifié).
6. **Ne pas exposer** la raison de l'échec decrypt dans la réponse API (risque d'information leakage). L'audit log interne capture le détail.
