import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MicrosoftOAuthService } from './microsoft-oauth.service';
import {
  MICROSOFT_GRAPH_BASE_URL,
  DEFAULT_MICROSOFT_GRAPH_HTTP_TIMEOUT_MS,
  DEFAULT_MICROSOFT_GRAPH_MAX_RETRIES,
  DEFAULT_MICROSOFT_GRAPH_MAX_429_ATTEMPTS,
  DEFAULT_MICROSOFT_GRAPH_MAX_RETRY_AFTER_SECONDS,
} from './microsoft.constants';
import {
  MicrosoftGraphHttpError,
  type MicrosoftGraphErrorBody,
} from './microsoft-graph.types';

const ENV_GRAPH_HTTP_TIMEOUT = 'MICROSOFT_GRAPH_HTTP_TIMEOUT_MS';

@Injectable()
export class MicrosoftGraphService {
  private readonly logger = new Logger(MicrosoftGraphService.name);
  private readonly timeoutMs: number;

  constructor(
    private readonly config: ConfigService,
    private readonly microsoftOAuth: MicrosoftOAuthService,
  ) {
    const raw = this.config.get<string>(ENV_GRAPH_HTTP_TIMEOUT);
    const n = raw !== undefined ? Number(raw) : NaN;
    this.timeoutMs =
      Number.isFinite(n) && n > 0 ? n : DEFAULT_MICROSOFT_GRAPH_HTTP_TIMEOUT_MS;
  }

  /**
   * Point d’entrée unique : URL, headers, timeout, retries (GET), parsing, erreurs.
   * Ne pas dupliquer cette logique dans les autres méthodes publiques.
   */
  async request<T>(
    accessToken: string,
    path: string,
    init?: RequestInit & { expectJson?: boolean },
  ): Promise<T | void> {
    const method = (init?.method ?? 'GET').toUpperCase();
    /** DELETE : aucun retry automatique (évite doubles suppressions). */
    if (method === 'DELETE') {
      return this.singleFetchNoRetry<T>(accessToken, path, init);
    }
    if (method === 'GET') {
      return this.getWithRetries<T>(accessToken, path, init);
    }
    return this.singleFetchNoRetry<T>(accessToken, path, init);
  }

  async requestForConnection<T>(
    clientId: string,
    connectionId: string,
    path: string,
    init?: RequestInit & { expectJson?: boolean },
  ): Promise<T | void> {
    const accessToken = await this.microsoftOAuth.ensureFreshAccessToken(
      connectionId,
      clientId,
    );
    return this.request<T>(accessToken, path, init);
  }

  getJson<T>(
    accessToken: string,
    path: string,
    init?: Omit<RequestInit, 'method' | 'body'> & { expectJson?: boolean },
  ): Promise<T | void> {
    const { expectJson, ...rest } = init ?? {};
    return this.request<T>(accessToken, path, {
      ...rest,
      method: 'GET',
      expectJson,
    });
  }

  /**
   * Planner task (ETag de la ressource `plannerTask`).
   *
   * ETags séparés : `GET /planner/tasks/{id}` et `GET /planner/tasks/{id}/details`
   * peuvent avoir des ETags différents côté Microsoft Graph.
   */
  async getPlannerTaskWithEtag<T = unknown>(
    accessToken: string,
    taskId: string,
  ): Promise<{ json: T | void; etag?: string }> {
    return this.getJsonWithEtagInternal<T>(
      accessToken,
      `planner/tasks/${taskId}`,
    );
  }

  /**
   * Planner task details (ETag de la ressource `plannerTaskDetails`).
   */
  async getPlannerTaskDetailsWithEtag<T = unknown>(
    accessToken: string,
    taskId: string,
  ): Promise<{ json: T | void; etag?: string }> {
    return this.getJsonWithEtagInternal<T>(
      accessToken,
      `planner/tasks/${taskId}/details`,
    );
  }

  postJson<T>(
    accessToken: string,
    path: string,
    body?: unknown,
    init?: Omit<RequestInit, 'method' | 'body'> & { expectJson?: boolean },
  ): Promise<T | void> {
    const { expectJson, headers, ...rest } = init ?? {};
    return this.request<T>(accessToken, path, {
      ...rest,
      method: 'POST',
      headers: this.mergeJsonHeaders(headers, body),
      body: body !== undefined ? JSON.stringify(body) : undefined,
      expectJson,
    });
  }

  patchJson<T>(
    accessToken: string,
    path: string,
    body?: unknown,
    init?: Omit<RequestInit, 'method' | 'body'> & { expectJson?: boolean },
  ): Promise<T | void> {
    const { expectJson, headers, ...rest } = init ?? {};
    return this.request<T>(accessToken, path, {
      ...rest,
      method: 'PATCH',
      headers: this.mergeJsonHeaders(headers, body),
      body: body !== undefined ? JSON.stringify(body) : undefined,
      expectJson,
    });
  }

  delete(
    accessToken: string,
    path: string,
    init?: Omit<RequestInit, 'method' | 'body'>,
  ): Promise<void> {
    return this.request<void>(accessToken, path, {
      ...init,
      method: 'DELETE',
      expectJson: false,
    }) as Promise<void>;
  }

  /** Exposé pour les tests unitaires (normalisation URL). */
  buildGraphUrl(path: string): string {
    const normalized = normalizeGraphPath(path);
    return `${MICROSOFT_GRAPH_BASE_URL}/${normalized}`;
  }

  private async getJsonWithEtagInternal<T>(
    accessToken: string,
    path: string,
  ): Promise<{ json: T | void; etag?: string }> {
    const url = this.buildGraphUrl(path);
    let res: Response;
    try {
      res = await this.fetchOnce(accessToken, url, { method: 'GET' });
    } catch (e: unknown) {
      throw this.toNetworkGraphError(e);
    }

    if (!res.ok) {
      await this.throwNormalizedError(res, undefined);
    }

    const etag = res.headers.get('etag') ?? res.headers.get('ETag') ?? undefined;
    const json = await this.parseSuccessBody<T>(res, true);
    return { json, etag };
  }

  private mergeJsonHeaders(
    headers: HeadersInit | undefined,
    body: unknown,
  ): HeadersInit | undefined {
    if (body === undefined) {
      return headers;
    }
    const h = new Headers(headers ?? undefined);
    if (!h.has('Content-Type')) {
      h.set('Content-Type', 'application/json');
    }
    return h;
  }

  private async getWithRetries<T>(
    accessToken: string,
    path: string,
    init?: RequestInit & { expectJson?: boolean },
  ): Promise<T | void> {
    const url = this.buildGraphUrl(path);
    let fetch429Count = 0;
    let fetch5xxCount = 0;
    let fetchNetworkCount = 0;

    while (true) {
      let res: Response;
      try {
        res = await this.fetchOnce(accessToken, url, init);
      } catch (e: unknown) {
        if (this.isAbortOrNetworkError(e)) {
          if (fetchNetworkCount >= DEFAULT_MICROSOFT_GRAPH_MAX_RETRIES) {
            throw this.toNetworkGraphError(e);
          }
          fetchNetworkCount++;
          await sleepMs(100);
          continue;
        }
        throw e;
      }

      if (res.ok) {
        return this.parseSuccessBody<T>(res, init?.expectJson);
      }

      if (res.status === 401) {
        await this.throwNormalizedError(res, undefined);
      }

      if (res.status === 429) {
        if (fetch429Count >= DEFAULT_MICROSOFT_GRAPH_MAX_429_ATTEMPTS - 1) {
          await this.throwNormalizedError(res, undefined);
        }
        fetch429Count++;
        const sec = this.cappedRetryAfterSeconds(res.headers);
        await sleepMs(sec * 1000);
        continue;
      }

      if (res.status >= 500 && res.status <= 599) {
        if (fetch5xxCount >= DEFAULT_MICROSOFT_GRAPH_MAX_RETRIES) {
          await this.throwNormalizedError(res, undefined);
        }
        fetch5xxCount++;
        await sleepMs(100);
        continue;
      }

      await this.throwNormalizedError(res, undefined);
    }
  }

  /**
   * POST / PATCH / DELETE / PUT : une seule exécution — pas de retry 5xx / 429 / réseau.
   */
  private async singleFetchNoRetry<T>(
    accessToken: string,
    path: string,
    init?: RequestInit & { expectJson?: boolean },
  ): Promise<T | void> {
    const url = this.buildGraphUrl(path);
    let res: Response;
    try {
      res = await this.fetchOnce(accessToken, url, init);
    } catch (e: unknown) {
      throw this.toNetworkGraphError(e);
    }

    if (res.ok) {
      return this.parseSuccessBody<T>(res, init?.expectJson);
    }

    await this.throwNormalizedError(res, undefined);
  }

  private async fetchOnce(
    accessToken: string,
    url: string,
    init?: RequestInit & { expectJson?: boolean },
  ): Promise<Response> {
    const rest = { ...(init ?? {}) } as RequestInit & { expectJson?: boolean };
    delete rest.expectJson;
    const headers = new Headers(rest.headers ?? undefined);
    headers.set('Authorization', `Bearer ${accessToken}`);
    headers.set('Accept', 'application/json');

    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      return await fetch(url, {
        ...rest,
        headers,
        signal: controller.signal,
      });
    } finally {
      clearTimeout(t);
    }
  }

  private async parseSuccessBody<T>(
    res: Response,
    expectJson?: boolean,
  ): Promise<T | void> {
    if (res.status === 204) {
      return undefined;
    }

    const text = await res.text();

    if (expectJson === true) {
      if (!text.trim()) {
        return undefined;
      }
      return JSON.parse(text) as T;
    }

    if (expectJson === false) {
      if (!text.trim()) {
        return undefined;
      }
      throw new MicrosoftGraphHttpError(
        'Réponse succès avec corps alors que expectJson=false',
        res.status,
        undefined,
        text.slice(0, 500),
        extractRequestIdFromHeaders(res.headers),
        undefined,
      );
    }

    const ct = res.headers.get('content-type');
    const looksJson =
      ct !== null &&
      (ct.includes('application/json') || ct.includes('+json'));

    if (looksJson) {
      if (!text.trim()) {
        return undefined;
      }
      return JSON.parse(text) as T;
    }

    if (!text.trim()) {
      return undefined;
    }
    throw new MicrosoftGraphHttpError(
      'Réponse succès avec corps non JSON',
      res.status,
      undefined,
      text.slice(0, 500),
      extractRequestIdFromHeaders(res.headers),
      undefined,
    );
  }

  private cappedRetryAfterSeconds(headers: Headers): number {
    const raw = headers.get('Retry-After');
    if (!raw) {
      return DEFAULT_MICROSOFT_GRAPH_MAX_RETRY_AFTER_SECONDS;
    }
    const sec = Number(raw);
    if (Number.isFinite(sec) && sec >= 0) {
      return Math.min(sec, DEFAULT_MICROSOFT_GRAPH_MAX_RETRY_AFTER_SECONDS);
    }
    return DEFAULT_MICROSOFT_GRAPH_MAX_RETRY_AFTER_SECONDS;
  }

  private isAbortOrNetworkError(e: unknown): boolean {
    if (e instanceof DOMException && e.name === 'AbortError') {
      return true;
    }
    if (e instanceof Error) {
      const msg = e.message.toLowerCase();
      if (msg.includes('abort')) {
        return true;
      }
    }
    return e instanceof TypeError;
  }

  private toNetworkGraphError(e: unknown): MicrosoftGraphHttpError {
    const msg =
      e instanceof Error ? e.message : 'Erreur réseau vers Microsoft Graph';
    this.logger.warn(`Graph: ${msg}`);
    return new MicrosoftGraphHttpError(msg, 0, undefined, msg, undefined, undefined);
  }

  private async throwNormalizedError(
    res: Response,
    retryAfterSeconds?: number,
  ): Promise<never> {
    const headerReqId = extractRequestIdFromHeaders(res.headers);
    const ct = res.headers.get('content-type');
    const text = await res.text();

    if (ct?.includes('json') || text.trim().startsWith('{')) {
      try {
        const json = JSON.parse(text) as MicrosoftGraphErrorBody;
        const err = json.error;
        const inner = err?.innerError;
        const bodyReqId =
          inner?.['request-id'] ??
          inner?.requestId ??
          inner?.['client-request-id'];
        const requestId = headerReqId ?? bodyReqId;
        const graphCode = err?.code;
        const graphMessage = err?.message ?? text.slice(0, 500);
        const msg = graphMessage || `HTTP ${res.status}`;
        this.logger.warn(`Graph HTTP ${res.status} code=${graphCode ?? 'n/a'}`);
        throw new MicrosoftGraphHttpError(
          msg,
          res.status,
          graphCode,
          graphMessage,
          requestId,
          retryAfterSeconds,
        );
      } catch (e) {
        if (e instanceof MicrosoftGraphHttpError) {
          throw e;
        }
      }
    }

    const requestId = headerReqId;
    const msg = text.trim()
      ? text.slice(0, 500)
      : `HTTP ${res.status}`;
    this.logger.warn(`Graph HTTP ${res.status} (corps non JSON)`);
    throw new MicrosoftGraphHttpError(
      msg,
      res.status,
      undefined,
      msg,
      requestId,
      retryAfterSeconds,
    );
  }
}

function normalizeGraphPath(path: string): string {
  const trimmed = path.trim();
  const segments = trimmed
    .split('/')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
  return segments.join('/');
}

function extractRequestIdFromHeaders(headers: Headers): string | undefined {
  return (
    headers.get('request-id') ??
    headers.get('client-request-id') ??
    undefined
  );
}

function sleepMs(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
