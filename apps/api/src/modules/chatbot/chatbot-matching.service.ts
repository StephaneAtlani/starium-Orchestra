import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ChatbotKnowledgeEntryType } from '@prisma/client';
import type { ChatbotEntryWithCategory } from './chatbot-entry-filter.service';
import { normalizeAndTokenize, normalizeForMatch } from './chatbot-text-normalizer';

/** Mots outils FR trop ambigus pour le recoupement seul titre/question. */
const QUERY_STOPWORDS = new Set([
  'avec',
  'aux',
  'cette',
  'comment',
  'dans',
  'des',
  'de',
  'du',
  'elle',
  'est',
  'et',
  'ils',
  'je',
  'la',
  'le',
  'les',
  'leur',
  'lui',
  'ma',
  'mes',
  'mon',
  'notre',
  'nos',
  'ou',
  'par',
  'pas',
  'pour',
  'pourquoi',
  'quand',
  'que',
  'qui',
  'sa',
  'sans',
  'ses',
  'son',
  'sur',
  'ta',
  'tes',
  'ton',
  'tres',
  'un',
  'une',
  'vos',
  'votre',
]);

export type MatchResult = {
  entry: ChatbotEntryWithCategory;
  score: number;
  tier: number;
};

/**
 * Hiérarchie : exact > partial (question/title) > keywords > tags ; `priority` sert au départage (RFC §6).
 * Les **FAQ** et les **ARTICLE** sont candidates (les guides longs étaient ignorés avant, ex. « créer un projet »).
 */
@Injectable()
export class ChatbotMatchingService {
  constructor(private readonly config: ConfigService) {}

  private minScore(): number {
    const v = this.config.get<string>('CHATBOT_MATCH_MIN_SCORE');
    const n = v != null ? Number(v) : NaN;
    return Number.isFinite(n) ? n : 50;
  }

  matchBest(
    questionRaw: string,
    candidates: ChatbotEntryWithCategory[],
  ): MatchResult | null {
    const matchable = candidates.filter(
      (e) =>
        e.type === ChatbotKnowledgeEntryType.FAQ ||
        e.type === ChatbotKnowledgeEntryType.ARTICLE,
    );
    if (matchable.length === 0) return null;

    const { normalized: qNorm, tokens: qTokens } = normalizeAndTokenize(questionRaw);
    if (!qNorm.length) return null;

    let best: MatchResult | null = null;

    for (const entry of matchable) {
      const eq = normalizeForMatch(entry.question);
      const et = normalizeForMatch(entry.title);
      const ekw = entry.keywords.map((k) => normalizeForMatch(k)).filter(Boolean);
      const etag = entry.tags.map((t) => normalizeForMatch(t)).filter(Boolean);

      let tier = 0;
      let score = 0;

      if (eq === qNorm) {
        tier = 4;
        score = 1000;
      } else if (
        eq.length >= 3 &&
        (eq.includes(qNorm) || (qNorm.length >= 3 && qNorm.includes(eq)))
      ) {
        tier = 3;
        score = 750;
      } else if (
        et.length >= 3 &&
        (et.includes(qNorm) || (qNorm.length >= 3 && qNorm.includes(et)))
      ) {
        tier = 3;
        score = 720;
      } else {
        // Recoupement par tokens : la question ne reprend pas toujours le titre mot pour mot
        // (ex. « comment créer un projet » vs « Guide des projets »).
        const hay = `${et} ${eq}`;
        let overlapPoints = 0;
        for (const tok of qTokens) {
          if (tok.length < 4 || QUERY_STOPWORDS.has(tok)) continue;
          if (hay.includes(tok)) {
            overlapPoints += tok.length >= 6 ? 14 : tok.length >= 5 ? 12 : 9;
          }
        }
        if (overlapPoints > 0) {
          tier = 2;
          score = 470 + Math.min(overlapPoints, 55);
        } else {
          let kwHit = false;
          for (const k of ekw) {
            if (!k) continue;
            if (qNorm.includes(k) || [...qTokens].some((t) => k.includes(t) || t.includes(k))) {
              kwHit = true;
              break;
            }
          }
          if (kwHit) {
            tier = 2;
            score = 500;
          } else {
            let tagHit = false;
            for (const t of etag) {
              if (!t) continue;
              if (qNorm.includes(t) || [...qTokens].some((qt) => t.includes(qt) || qt.includes(t))) {
                tagHit = true;
                break;
              }
            }
            if (tagHit) {
              tier = 1;
              score = 300;
            }
          }
        }
      }

      if (tier === 0) continue;

      score += entry.priority;

      if (
        !best ||
        tier > best.tier ||
        (tier === best.tier && score > best.score) ||
        (tier === best.tier && score === best.score && entry.priority > best.entry.priority) ||
        (tier === best.tier &&
          score === best.score &&
          entry.priority === best.entry.priority &&
          entry.type === ChatbotKnowledgeEntryType.FAQ &&
          best.entry.type === ChatbotKnowledgeEntryType.ARTICLE)
      ) {
        best = { entry, score, tier };
      }
    }

    const min = this.minScore();
    if (!best || best.score < min) return null;
    return best;
  }
}
