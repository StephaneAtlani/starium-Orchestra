# Plan d’implémentation RFC-015-1B — Financial Core Backend (v2)

Version mise à jour avec : enums Prisma figés, recalcul transactionnel, formule remainingAmount, pagination uniforme, format liste stable, imports module allégés, helper BudgetLine, règles sourceId, tri par défaut, tests Decimal.

---

## 0. Noms exacts des enums Prisma (schema.prisma)

À utiliser **strictement** tels quels dans DTOs, services et tests (import depuis `@prisma/client`) :

| Usage | Nom exact dans schema.prisma |
|-------|-----------------------------|
| Type d’allocation | **AllocationType** |
| Type d’événement | **FinancialEventType** |
| Type de source | **FinancialSourceType** |

Modèles : `FinancialAllocation.allocationType` (AllocationType), `FinancialAllocation.sourceType` (FinancialSourceType), `FinancialAllocation.sourceId` (**String** obligatoire en base).  
`FinancialEvent.sourceId` est **String?** en base.

Ne pas inventer `FinancialAllocationType` ni `FinancialAllocationSourceType`.

---

## 1. Contexte et arborescence

- Schéma Prisma déjà en place. Préfixe global `api`. Guards : JwtAuthGuard, ActiveClientGuard, ModuleAccessGuard, PermissionsGuard. Permissions : budgets.read, budgets.create, budgets.update.
- Audit : AuditLogsService + CreateAuditLogInput.

Créer sous `apps/api/src/modules/financial-core/` :

- `financial-core.module.ts`
- `budget-line-calculator.service.ts`
- `allocations/` : controller, service, dto (create, list query)
- `events/` : controller, service, dto (create, list query)
- `budget-lines.controller.ts` (GET :id/allocations, GET :id/events avec pagination)

Enregistrer `FinancialCoreModule` dans `app.module.ts`.

---

## 2. Imports du module (allégés)

Dans `financial-core.module.ts` importer **uniquement** :

- **PrismaModule**
- **AuditLogsModule**

Ne pas importer AuthModule ni CommonModule : les guards/décorateurs utilisés dans les controllers sont fournis globalement ou par d’autres chemins ; garder le module léger et éviter dépendances inutiles.

---

## 3. API, guards, pagination, format de liste

- **Guards** : toutes les routes `@UseGuards(JwtAuthGuard, ActiveClientGuard, ModuleAccessGuard, PermissionsGuard)` + `@RequirePermissions(...)` (budgets.read pour GET, budgets.create pour POST). `clientId` toujours via client actif, jamais dans le body.

- **Pagination uniforme** pour **toutes** les listes (y compris GET /budget-lines/:id/allocations et GET /budget-lines/:id/events) :
  - Query : `limit` (défaut 20, max 200), `offset` (défaut 0).
  - Tri par défaut : voir §9.

- **Format de réponse des listes** (stable, évite rupture front plus tard) :

```ts
{
  items: T[],
  total: number,
  limit: number,
  offset: number
}
```

Appliqué à : GET /financial-allocations, GET /financial-events, GET /budget-lines/:id/allocations, GET /budget-lines/:id/events.

---

## 4. Règles sourceType / sourceId (figées)

- **Allocation** (CreateFinancialAllocationDto) :
  - `sourceId` **obligatoire** sauf si `sourceType === FinancialSourceType.MANUAL` (alors optionnel ou chaîne vide selon convention).
  - Validation : si sourceType !== MANUAL alors sourceId requis (IsNotEmpty / ValidateIf).

- **Event** (CreateFinancialEventDto) :
  - `sourceId` **optionnel** pour : MANUAL, et éventuellement types techniques (ex. BUDGET_INITIALIZED, ADJUSTMENT). Pour les types liés à une source métier (COMMITMENT_REGISTERED, CONSUMPTION_REGISTERED, etc.), exiger sourceId si la règle métier l’exige (à figer : au minimum MANUAL autorise null).

Documenter ces règles dans les DTOs (commentaires) et dans ce plan pour cohérence.

---

## 5. Helper partagé “BudgetLine appartient au client”

- **Un seul point de vérité** : helper réutilisable utilisé par create (allocation/event), listByBudgetLine, et calculateur.
- Proposition : méthode privée ou service partagé du type  
  `assertBudgetLineExistsForClient(prisma, budgetLineId, clientId): Promise<BudgetLine>`  
  qui fait `findFirst({ where: { id: budgetLineId, clientId } })` et lance NotFoundException si absent. Retourne la ligne si besoin (ex. pour récupérer currency).
- Utiliser ce helper dans : FinancialAllocationsService (create, listByBudgetLine), FinancialEventsService (create, listByBudgetLine), BudgetLineCalculatorService (avant agrégations). Les controllers budget-lines/:id/... délèguent aux services qui s’appuient sur ce helper.

---

## 6. Tri par défaut (listes)

- **Allocations** : `orderBy: [{ effectiveDate: 'desc' }, { createdAt: 'desc' }]` (effectiveDate null en dernier selon moteur).
- **Events** : `orderBy: [{ eventDate: 'desc' }, { createdAt: 'desc' }]`.

À appliquer à toutes les listes (GET financial-allocations, GET financial-events, GET budget-lines/:id/allocations, GET budget-lines/:id/events).

---

## 7. BudgetLineCalculatorService et formule remainingAmount (figée)

- **Règle métier explicite** (à ne pas changer sans RFC) :
  - `budgetBase = revisedAmount`
  - `forecastAmount` = somme des `allocatedAmount` des allocations avec `allocationType === AllocationType.FORECAST`
  - `committedAmount` = somme des allocations `AllocationType.COMMITTED` + somme des `amount` des événements `FinancialEventType.COMMITMENT_REGISTERED`
  - `consumedAmount` = somme des allocations `AllocationType.CONSUMED` + somme des `amount` des événements `FinancialEventType.CONSUMPTION_REGISTERED`
  - **remainingAmount** = **budgetBase - committedAmount - consumedAmount**  
    Interprétation : reste “prudent” ; committed et consumed sont deux masses indépendantes (pas de déduplication engagé → consommé). À documenter dans la RFC si ce n’est pas déjà fait.

- Implémentation : utiliser le helper pour s’assurer que la ligne existe et appartient au client ; faire les agrégations ; update de la ligne avec les 4 montants (Decimal, gérer sommes avec Prisma.Decimal / toNumber selon besoin).

---

## 8. Recalcul transactionnel (création + recalcul dans une transaction)

- **Objectif** : éviter qu’une création réussisse alors que le recalcul échoue (ligne incohérente).

- **Option retenue** :
  - **Création allocation/event + recalcul** dans une **même** `prisma.$transaction(...)`.
  - **Audit log** : après la transaction (ou dans la transaction si AuditLogsService accepte un `tx`). Si on ne modifie pas AuditLogsService, faire l’audit **après** la transaction pour garder un MVP robuste sans toucher au module audit.

- Détail :
  1. Valider DTO et appeler `assertBudgetLineExistsForClient(budgetLineId, clientId)`.
  2. Dans `prisma.$transaction(async (tx) => { ... })` :
     - créer l’allocation ou l’événement avec `tx` ;
     - appeler la logique de recalcul en lui passant un **transaction client** `tx` (ex. `BudgetLineCalculatorService.recalculateForBudgetLine(budgetLineId, clientId, tx)`).
  3. Après la transaction : `auditLogs.create(...)`.

- **Signature calculateur** : prévoir une surcharge ou paramètre optionnel `tx?: Prisma.TransactionClient` ; si `tx` est fourni, utiliser `tx` pour les reads et l’update de la BudgetLine ; sinon utiliser `this.prisma` (pour les appels hors transaction si besoin plus tard).

---

## 9. DTOs (enums exacts, validation sourceId)

- **CreateFinancialAllocationDto** : budgetLineId, sourceType (IsEnum(FinancialSourceType)), sourceId (ValidateIf: requis si sourceType !== MANUAL), allocationType (IsEnum(AllocationType)), allocatedAmount (nombre ≥ 0), currency, effectiveDate?, notes?. Pas de clientId.
- **ListFinancialAllocationsQueryDto** : budgetLineId?, allocationType?, offset?, limit? (Min/Max).
- **CreateFinancialEventDto** : budgetLineId, sourceType, sourceId? (optionnel pour MANUAL / types techniques selon règle figée), eventType (IsEnum(FinancialEventType)), amount, currency, eventDate, label, description?. Pas de clientId.
- **ListFinancialEventsQueryDto** : budgetLineId?, eventType?, offset?, limit?.

Utiliser **strictement** les enums depuis `@prisma/client` : `AllocationType`, `FinancialEventType`, `FinancialSourceType`.

---

## 10. Audit logs

- Après transaction réussie : création d’allocation → `action: 'financial_allocation.created', resourceType: 'financial_allocation', resourceId, newValue: { ... }`.
- Idem pour événement → `action: 'financial_event.created', resourceType: 'financial_event', ...`.
- Contexte : clientId, userId (actor), meta (ipAddress, userAgent, requestId) depuis controllers.

---

## 11. Tests (dont Decimal)

- **BudgetLineCalculatorService** : forecast (somme FORECAST), committed (COMMITTED + COMMITMENT_REGISTERED), consumed (CONSUMED + CONSUMPTION_REGISTERED), remaining = budgetBase - committed - consumed ; **inclure cas avec décimaux** : 100.50, 99.99, sommes de plusieurs Decimal (ex. 10.01 + 20.02 + 69.96 = 99.99) pour éviter bugs Prisma Decimal / JS number.
- **FinancialAllocationsService** : create → recalcul appelé dans la même transaction ; audit appelé après ; **isolation client** : budgetLineId d’un autre client → NotFoundException.
- **FinancialEventsService** : create COMMITMENT_REGISTERED → recalcul appelé ; create LINE_CREATED (ou autre non agrégé) → recalcul non appelé ; audit après ; isolation client.
- **Helper** : test unitaire ou intégration que assertBudgetLineExistsForClient rejette une ligne d’un autre client.

---

## 12. Récapitulatif des ajustements par rapport à la v1

| # | Ajustement |
|---|------------|
| 1 | Enums Prisma : **AllocationType**, **FinancialEventType**, **FinancialSourceType** uniquement ; pas de noms simplifiés. |
| 2 | Création + recalcul dans **prisma.$transaction** ; audit après la transaction. Calculateur accepte `tx` optionnel. |
| 3 | Formule **remainingAmount** figée et documentée (budgetBase - committed - consumed ; pas de déduplication engagé/consommé). |
| 4 | **Pagination** (limit, offset) sur GET /budget-lines/:id/allocations et GET /budget-lines/:id/events. |
| 5 | Format de liste **{ items, total, limit, offset }** pour toutes les listes. |
| 6 | Module : imports **PrismaModule + AuditLogsModule** uniquement. |
| 7 | **assertBudgetLineExistsForClient** (ou équivalent) mutualisé pour create, listByBudgetLine, calculateur. |
| 8 | Règles **sourceId** : allocation obligatoire sauf MANUAL ; event optionnel pour MANUAL (et types techniques à lister). |
| 9 | Tri par défaut : allocations effectiveDate desc puis createdAt desc ; events eventDate desc puis createdAt desc. |
| 10 | Tests avec **valeurs décimales** (100.50, 99.99, sommes de Decimal). |

---

## 13. Fichiers à créer / modifier (inchangé dans l’esprit)

- Créer : financial-core.module.ts, budget-line-calculator.service.ts, allocations (controller, service, DTOs), events (controller, service, DTOs), budget-lines.controller.ts, specs (calculator, allocations service, events service, isolation client + Decimal).
- Modifier : app.module.ts (import FinancialCoreModule).

Optionnel : ajouter une phrase dans la RFC-015-1B elle-même pour figer la formule remainingAmount et les règles sourceId (recommandé).
