/**
 * Contrat seed Guide « Premiers pas » (RFC-AI-001 / Vague 0 B0.6).
 * Valeurs exactes — réutilisées par le seed Prisma et les tests de matching.
 */
export const PREMIERS_PAS_CATEGORY = {
  slug: 'premiers-pas',
  name: 'Premiers pas',
  description:
    'Prise en main Starium Orchestra : connexion, client actif, modules et aide.',
} as const;

export const PREMIERS_PAS_ENTRIES = [
  {
    slug: 'premiers-pas-connexion-mfa-client',
    title: 'Connexion, MFA et choix du client',
    question: 'Comment me connecter et choisir mon client ?',
    answer:
      'Connectez-vous avec votre e-mail, validez le MFA si demandé, puis sélectionnez le client actif dans le sélecteur. Toutes les données affichées sont limitées à ce client.',
    keywords: ['connexion', 'mfa', 'client', 'login', 'authentification'],
    content:
      'Après authentification, le client actif détermine le périmètre multi-tenant. Changez de client via le sélecteur en en-tête si vous avez plusieurs organisations.',
    structuredLinks: [
      { type: 'INTERNAL_PAGE' as const, label: 'Choisir un client', route: '/select-client' },
      { type: 'INTERNAL_PAGE' as const, label: 'Tableau de bord', route: '/dashboard' },
    ],
  },
  {
    slug: 'premiers-pas-modules-permissions',
    title: 'Modules et permissions',
    question: 'Pourquoi je ne vois pas un module ?',
    answer:
      'Un module peut être masqué si votre client ne l’a pas activé, ou si votre rôle n’a pas la permission requise. Consultez l’aide sur le modèle d’accès.',
    keywords: ['module', 'permission', 'droit', 'accès', 'rbac'],
    content:
      'L’administration client et les licences sièges contrôlent la visibilité. En cas de doute, demandez à un administrateur client de vérifier modules et rôles.',
    structuredLinks: [
      {
        type: 'INTERNAL_PAGE' as const,
        label: 'Aide modèle d’accès',
        route: '/client/help/access-model',
      },
    ],
  },
  {
    slug: 'premiers-pas-orion-vs-guide',
    title: 'Orion et le Guide',
    question: 'Quelle est la différence entre Orion et le Guide ?',
    answer:
      'Orion répond à une question courte via le chat (réponses préconfigurées). Le Guide laisse explorer des articles et catégories. Aucun des deux n’utilise d’IA générative.',
    keywords: ['orion', 'guide', 'chatbot', 'aide', 'explorer'],
    content:
      'Utilisez Orion pour une réponse rapide. Ouvrez Explorer pour parcourir la base de connaissance. Les réponses sont administrées par la plateforme.',
    structuredLinks: [
      { type: 'INTERNAL_PAGE' as const, label: 'Explorer le Guide', route: '/chatbot/explore' },
    ],
  },
] as const;

export type PremiersPasEntrySeed = (typeof PREMIERS_PAS_ENTRIES)[number];
