/** Clés stables du bilan post-mortem dans `contentPayload.postMortem`. */
export type PostMortemPayload = {
  objectifs: string;
  resultats: string;
  ecarts: string;
  causes: string;
  leconsApprises: string;
  recommandations: string;
};

export const POST_MORTEM_EMPTY: PostMortemPayload = {
  objectifs: '',
  resultats: '',
  ecarts: '',
  causes: '',
  leconsApprises: '',
  recommandations: '',
};

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
    for (const k of Object.keys(out) as (keyof PostMortemPayload)[]) {
      const v = o[k];
      if (typeof v === 'string') out[k] = v;
    }
  }
  return out;
}
