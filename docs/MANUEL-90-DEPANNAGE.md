# Manuel utilisateur — 90 Dépannage opérationnel

## 1) Objectif

Résoudre vite les incidents sans passer en debug technique complet.

---

## 2) Arbre de diagnostic rapide

```mermaid
flowchart TD
start[Incident utilisateur] --> type{Type incident}
type --> login[Connexion]
type --> access[Acces menu or ecran]
type --> action[Action refusee]
type --> perf[Lenteur]
login --> mfa[MFA]
access --> client[Client actif]
action --> perms[Roles and permissions]
perf --> scope[Reduire filtre and perimetre]
```

---

## 3) Incident: impossible de se connecter

### Vérifier

1. Email correct.
2. Mot de passe correct.
3. Méthode de connexion adaptée (SSO ou password).
4. Horloge machine (MFA).

### Faire

1. Réessayer via Microsoft si compte SSO.
2. Utiliser fallback MFA email.
3. Utiliser recovery code.
4. Demander reset MFA à un admin.

---

## 4) Incident: pas de client sélectionnable

### Symptôme

Écran `/select-client` sans client exploitable.

### Faire

1. Vérifier rattachement utilisateur.
2. Vérifier statut `ACTIVE`.
3. Se reconnecter.

---

## 5) Incident: menu ou écran absent

### Causes principales

- mauvais client actif;
- rôle insuffisant;
- permission absente;
- module désactivé.

### Procédure

1. Vérifier client actif affiché.
2. Vérifier rôle utilisateur.
3. Vérifier permissions du rôle.
4. Vérifier activation module.
5. Forcer reconnexion.

---

## 6) Incident: erreur 403 sur action

### Procédure

1. Identifier la route exacte.
2. Contrôler l'autorisation attendue.
3. Vérifier droits du compte.
4. Tester avec compte admin du même client.

---

## 7) Incident: rôle impossible à supprimer

### Causes

- rôle système;
- rôle encore assigné.

### Procédure

1. Ouvrir la fiche rôle.
2. Contrôler statut système.
3. Retirer assignations utilisateurs.
4. Refaire suppression.

---

## 8) Incident: import budget en erreur

### Procédure

1. Vérifier mapping colonnes.
2. Contrôler format des valeurs.
3. Vérifier exercice/budget cible.
4. Rejouer import sur un petit échantillon.

---

## 9) Incident: lenteur

### Actions immédiates

1. Réduire filtres.
2. Limiter plage de données.
3. Utiliser pagination.
4. Fermer onglets lourds.

### Escalade support

Envoyer:

- URL;
- client actif;
- heure;
- action;
- fréquence;
- capture d'écran si possible.

---

## 10) Template ticket support

- Contexte: qui, quel client, quel rôle.
- Incident: quoi, où, quand.
- Attendu vs obtenu.
- Étapes de reproduction.
- Impact métier.

---

## 11) Références

- `docs/API.md`
- `docs/modules/client-rbac.md`
