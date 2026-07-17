/**
 * Personnalités visuelles d’Orion (assistant Starium).
 * Masters RGBA : `public/brand/orion/orion-{personality}.png`
 * Variantes : `public/brand/orion/sizes/{px}/orion-{personality}.png`
 * Régénération : `python3 scripts/process-orion-assets.py` (sources dans `orion/_sources/`).
 */

export const ORION_PERSONALITY = {
  /** Accueil, lanceur FAB / bottom nav, hero sur fond sombre. */
  normal: {
    id: 'normal',
    src: '/brand/orion/orion-normal.png',
    ariaLabel: 'Orion — assistant Starium',
  },
  /** Chargement, recherche KB, envoi message / feedback. */
  thinking: {
    id: 'thinking',
    src: '/brand/orion/orion-thinking.png',
    ariaLabel: 'Orion réfléchit',
  },
  /** Erreur, client actif requis, avertissement. */
  attention: {
    id: 'attention',
    src: '/brand/orion/orion-attention.png',
    ariaLabel: 'Orion — attention requise',
  },
  /** Fil de chat actif, reprise conversation, messages non lus. */
  message: {
    id: 'message',
    src: '/brand/orion/orion-message.png',
    ariaLabel: 'Orion — en conversation',
  },
} as const;

export type OrionPersonalityId = keyof typeof ORION_PERSONALITY;

/** Tailles pré-générées sous `public/brand/orion/sizes/`. */
export const ORION_ASSET_SIZES = [28, 40, 48, 56, 80, 96, 112, 128, 160] as const;

/** Lanceur (FAB, bottom nav). */
export const ORION_AVATAR_SRC = ORION_PERSONALITY.normal.src;

export const ORION_PRODUCT_NAME = 'Orion';

export const ORION_SUBTITLE = 'Assistant & base de connaissance';

export type OrionPersonalityContext = {
  tab: 'home' | 'news' | 'conversations' | 'help' | 'feedback';
  status: 'idle' | 'loading' | 'empty' | 'error' | 'unauthorized';
  feedbackStatus?: 'idle' | 'sending' | 'success' | 'error';
  remoteArticleLoading?: boolean;
  readerLoading?: boolean;
  hasConversationActivity?: boolean;
  hasRecentConversation?: boolean;
  hasUnread?: boolean;
  /** FAB ou onglet bottom nav — logique simplifiée. */
  launcher?: boolean;
};

export function resolveOrionPersonality(
  ctx: OrionPersonalityContext,
): OrionPersonalityId {
  if (ctx.launcher) {
    return ctx.hasUnread ? 'message' : 'normal';
  }

  if (
    ctx.status === 'error' ||
    ctx.status === 'unauthorized' ||
    ctx.feedbackStatus === 'error'
  ) {
    return 'attention';
  }

  if (
    ctx.status === 'loading' ||
    ctx.remoteArticleLoading ||
    ctx.readerLoading ||
    ctx.feedbackStatus === 'sending'
  ) {
    return 'thinking';
  }

  if (
    ctx.tab === 'conversations' ||
    ctx.hasConversationActivity ||
    (ctx.tab === 'home' && ctx.hasRecentConversation)
  ) {
    return 'message';
  }

  return 'normal';
}

export function orionPersonalitySrc(id: OrionPersonalityId): string {
  return ORION_PERSONALITY[id].src;
}

/** Variante redimensionnée si disponible, sinon master. */
export function orionPersonalitySrcAtSize(
  id: OrionPersonalityId,
  px: number,
): string {
  if ((ORION_ASSET_SIZES as readonly number[]).includes(px)) {
    return `/brand/orion/sizes/${px}/orion-${id}.png`;
  }
  return orionPersonalitySrc(id);
}

/** @deprecated Préférer `orionPersonalitySrc` — tous les assets Orion sont unifiés. */
export function orionPersonalitySrcForSurface(
  id: OrionPersonalityId,
  _surface: 'dark' | 'light',
): string {
  return orionPersonalitySrc(id);
}
