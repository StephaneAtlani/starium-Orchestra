# Checklist validation sécurité — identité / sync / merge

À signer avant généralisation `autoProvisionUsers` et avant suppression définitive en masse.

- [ ] Revue de code (auteur ≠ relecteur)
- [ ] Revue architecture identité + `EmailAddressRegistry`
- [ ] Tests resolver + `EmailReservationService` passants
- [ ] Tests concurrence PostgreSQL (staging)
- [ ] Exercice rollback réconciliation validé
- [ ] Exercice restauration snapshot validé
- [ ] Pentest ciblé SSO + `link-platform-user` / `DELETE link-platform-user`
- [ ] Parcours UI Membres : ADDS → membre Starium uniquement (pas ADDS→ADDS) ; badge **Lié** = `Collaborator.userId` ; MFA + reauth ≤ 10 min
- [ ] `/teams/collaborators*` redirige vers `/client/members`

Signataire : _______________  Date : _______________
