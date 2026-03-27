# RFC-M365-001 — Authentification SSO Microsoft 365

## Statut

Draft

## Priorité

Haute

---

# 1. Objectif (corrigé)

Permettre à un utilisateur de **se connecter à Starium Orchestra via son compte Microsoft 365 (SSO)**.

L’authentification Microsoft est utilisée uniquement pour :

* **valider l’identité de l’utilisateur**
* **ouvrir une session Starium existante**

⚠️ Cette RFC ne couvre pas une connexion d’intégration Microsoft au niveau client.

---

# 4. Périmètre (corrigé)

## Inclus

* flux OAuth / OIDC Microsoft pour authentification utilisateur
* génération URL de login Microsoft
* callback sécurisé
* validation d’identité Microsoft côté backend
* création de session Starium (JWT / session existante)
* audit logs

## Exclus du MVP (corrigé)

* connexion Microsoft au niveau client (`MicrosoftConnection`)
* intégration Teams / Planner / fichiers
* synchronisation annuaire
* provisioning utilisateur
* création automatique de compte Starium
* rattachement automatique d’emails secondaires
* toute logique métier Graph

---

# 5. Cas d’usage (corrigé)

## 5.1 Connexion utilisateur

Un utilisateur clique sur :

👉 **Se connecter avec Microsoft**

## 5.2 Authentification

* Microsoft authentifie l’utilisateur
* Starium valide l’identité et ouvre une session

## 5.3 Échec

Si aucun utilisateur Starium ne correspond :

👉 accès refusé

---

# 6. Principes métier (corrigé)

## 6.1 Authentification SSO uniquement

Microsoft est utilisé uniquement comme **provider d’identité**.

Ce n’est **pas un mécanisme d’intégration client**.

---

## 6.2 Condition obligatoire d’accès

Un utilisateur peut se connecter via Microsoft uniquement si :

* un **compte Starium existe déjà**
* ET l’email Microsoft correspond :

### Cas autorisés

* email Microsoft = email principal du user Starium
* email Microsoft = email secondaire **déjà enregistrée ET validée**

### Cas interdits

* email secondaire non validée ❌
* email inconnu ❌
* email appartenant à un autre utilisateur ❌

---

## 6.3 Aucune création automatique

Le callback OAuth :

* ❌ ne crée jamais d’utilisateur Starium
* ❌ ne crée jamais de `ClientUser`
* ❌ ne crée jamais d’email secondaire

---

## 6.4 Contexte client

Après authentification :

* Starium recharge les `ClientUser`
* sélection du client actif via le comportement existant

👉 Microsoft ne donne aucun accès supplémentaire

---

## 6.5 Backend source de vérité

Le backend :

* valide l’identité
* décide du succès login
* génère la session

Le frontend :

* déclenche le flow
* affiche résultat

---

# 7. Décisions MVP (corrigé)

* ✅ pas d’auto-provisioning
* ✅ pas de connexion Microsoft par client
* ✅ pas de lien persistant obligatoire Microsoft ↔ User
* ✅ matching uniquement par email validé
* ✅ refus strict sinon

---

# 8. Modèle de données (corrigé)

## 8.1 MicrosoftOAuthState (conservé)

```prisma
model MicrosoftOAuthState {
  id             String   @id @default(cuid())
  stateTokenHash String   @unique
  userId         String?
  clientId       String?
  expiresAt      DateTime
  consumedAt     DateTime?
  createdAt      DateTime @default(now())
}
```

👉 plus de dépendance forte au client

---

## 8.2 (Optionnel MVP)

Aucun modèle `MicrosoftConnection` requis.

👉 supprimé du cœur de la RFC

---

# 10. Workflow fonctionnel (corrigé)

## 10.1 Déclenchement

1. utilisateur non connecté
2. clique “Se connecter avec Microsoft”
3. backend génère state
4. redirection Microsoft

---

## 10.2 Callback (critique)

1. validation du `state`
2. échange `code → token`
3. récupération identité Microsoft
4. extraction email fiable

---

## 10.3 Matching utilisateur (NOUVEAU)

Comparer email Microsoft avec Starium :

* email principal
* emails secondaires validés

### Si match

* créer session Starium
* générer JWT
* rediriger vers app

### Si échec

* refuser login
* rediriger vers login avec erreur

---

# 11. Endpoints API (corrigé)

## 11.1 Login URL

### GET `/api/auth/microsoft/url`

Retour :

```json
{
  "authorizationUrl": "https://login.microsoftonline.com/..."
}
```

---

## 11.2 Callback

### GET `/api/auth/microsoft/callback`

Comportement :

* validation state
* récupération identité
* matching user
* création session

Redirection :

```
/login?status=success
/login?status=error
```

---

# 12. Scopes (corrigé)

Minimum :

* `openid`
* `profile`
* `email`

👉 `User.Read` optionnel si besoin fallback

---

# 13. Sécurité (ajout critique)

## 13.6 Source de vérité email

* email issu uniquement :

  * id_token
  * ou Graph backend

❌ jamais depuis frontend

---

## 13.7 Absence email

Si Microsoft ne retourne pas un email fiable :

👉 refus login

---

# 14. Permissions (corrigé)

❌ suppression logique `projects.update`

Login autorisé si :

* user Starium existe
* user actif
* possède au moins un accès valide

---

# 17. Frontend (corrigé)

Remplacer page admin par :

```text
/login
```

Bouton :

👉 Se connecter avec Microsoft

Après callback :

* appel `/api/me`
* chargement clients

---

# 18. UX (corrigé)

### Succès

* utilisateur connecté
* redirection dashboard

### Échec

Message :

> Aucun compte Starium existant ne correspond à cette identité Microsoft.

---

# 20. Tests (corrigé)

### Succès

* email = principal
* email = secondaire validé

### Refus

* email inconnu
* email secondaire non validé
* email d’un autre user

### Sécurité

* aucun user créé
* aucun email ajouté
* aucun accès escaladé

---

# 21. Hors périmètre (corrigé)

* ❌ MicrosoftConnection
* ❌ intégration client
* ❌ Teams / Planner
* ❌ provisioning
* ❌ sync annuaire

---

# 22. Critères d’acceptation (corrigé)

* login Microsoft possible
* session Starium créée
* matching email respecté
* refus strict sinon
* aucun user créé automatiquement
* sécurité respectée

---

# 23. Évolutions

* RFC-M365-002 → connexion Microsoft par client (ce que tu avais au départ)
* RFC-M365-003 → sync collaborateurs
* RFC-M365-004 → Graph métier

---

# ⚠️ Conclusion importante

👉 Tu as maintenant **2 briques distinctes** :

1. **SSO Microsoft (cette RFC)**
2. **Connexion Microsoft client (RFC précédente)**

👉 Et c’est CRITIQUE de les séparer (tu viens d’éviter un énorme piège d’architecture).
