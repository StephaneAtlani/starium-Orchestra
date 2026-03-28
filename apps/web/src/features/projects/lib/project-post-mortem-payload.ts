/** Scores de perception 0–100 (null = non renseigné). Alignés avec une grille RETEX (budget, délais, qualité, communication, risques). */
export type PostMortemIndicateursScores = {
  budget: number | null;
  delais: number | null;
  qualite: number | null;
  communication: number | null;
  pilotageRisques: number | null;
};

export const POST_MORTEM_INDICATEURS_EMPTY: PostMortemIndicateursScores = {
  budget: null,
  delais: null,
  qualite: null,
  communication: null,
  pilotageRisques: null,
};

/** Clés stables du retour d'expérience dans `contentPayload.postMortem` (clé JSON inchangée). */
export type PostMortemPayload = {
  objectifs: string;
  resultats: string;
  ecarts: string;
  causes: string;
  leconsApprises: string;
  recommandations: string;
  indicateurs: PostMortemIndicateursScores;
};

export const POST_MORTEM_EMPTY: PostMortemPayload = {
  objectifs: '',
  resultats: '',
  ecarts: '',
  causes: '',
  leconsApprises: '',
  recommandations: '',
  indicateurs: { ...POST_MORTEM_INDICATEURS_EMPTY },
};

function clampScore0to100(v: unknown): number | null {
  if (v === null || v === undefined) return null;
  const n = typeof v === 'number' ? v : Number(v);
  if (!Number.isFinite(n)) return null;
  return Math.max(0, Math.min(100, Math.round(n)));
}

function readIndicateurs(raw: unknown): PostMortemIndicateursScores {
  const out = { ...POST_MORTEM_INDICATEURS_EMPTY };
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return out;
  const o = raw as Record<string, unknown>;
  for (const k of Object.keys(out) as (keyof PostMortemIndicateursScores)[]) {
    out[k] = clampScore0to100(o[k]);
  }
  return out;
}

export function parseContentPayloadRoot(raw: unknown): Record<string, unknown> {
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    return { ...(raw as Record<string, unknown>) };
  }
  return {};
}

export function readPostMortemPayload(raw: unknown): PostMortemPayload {
  const root = parseContentPayloadRoot(raw);
  const pm = root.postMortem;
  const out = { ...POST_MORTEM_EMPTY };
  if (pm && typeof pm === 'object' && !Array.isArray(pm)) {
    const o = pm as Record<string, unknown>;
    const textKeys: (keyof Omit<PostMortemPayload, 'indicateurs'>)[] = [
      'objectifs',
      'resultats',
      'ecarts',
      'causes',
      'leconsApprises',
      'recommandations',
    ];
    for (const k of textKeys) {
      const v = o[k];
      if (typeof v === 'string') out[k] = v;
    }
    out.indicateurs = readIndicateurs(o.indicateurs);
  }
  return out;
}
