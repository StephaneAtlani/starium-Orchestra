/**
 * Corps d’erreur JSON Microsoft Graph (sous-ensemble stable pour le transport).
 * @see https://learn.microsoft.com/en-us/graph/errors
 */
export interface MicrosoftGraphInnerError {
  date?: string;
  /** Graph utilise souvent la clé littérale "request-id" dans le JSON. */
  'request-id'?: string;
  'client-request-id'?: string;
  requestId?: string;
}

export interface MicrosoftGraphErrorPayload {
  code?: string;
  message?: string;
  innerError?: MicrosoftGraphInnerError;
}

export interface MicrosoftGraphErrorBody {
  error?: MicrosoftGraphErrorPayload;
}

/** Réponse OData liste minimale (pagination éventuelle). */
export interface MicrosoftGraphODataListResponse<T> {
  '@odata.nextLink'?: string;
  value?: T[];
}

export class MicrosoftGraphHttpError extends Error {
  readonly name = 'MicrosoftGraphHttpError';

  constructor(
    message: string,
    readonly statusCode: number,
    readonly graphCode?: string,
    readonly graphMessage?: string,
    readonly requestId?: string,
    readonly retryAfterSeconds?: number,
  ) {
    super(message);
  }
}
