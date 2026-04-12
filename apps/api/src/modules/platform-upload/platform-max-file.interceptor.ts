import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
  PayloadTooLargeException,
} from '@nestjs/common';
import multer from 'multer';
import { Observable, from, throwError } from 'rxjs';
import { catchError, mergeMap } from 'rxjs/operators';
import { PlatformUploadSettingsService } from './platform-upload-settings.service';

const FILE_FIELD = 'file';

/** Types Express multer — évite les conflits de versions @types/express. */
function runMulterSingle(
  req: Record<string, unknown>,
  res: Record<string, unknown>,
  fieldName: string,
  maxBytes: number,
): Promise<void> {
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: maxBytes },
  }).single(fieldName);
  return new Promise((resolve, reject) => {
    upload(req as never, res as never, (err: unknown) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

function formatMaxLabelMb(maxBytes: number): string {
  const mb = maxBytes / (1024 * 1024);
  return Number.isInteger(mb) ? String(mb) : mb.toFixed(1).replace(/\.0$/, '');
}

/**
 * Multer `single('file')` avec limite lue depuis le réglage plateforme (cache synchrone).
 * Utilisé pour imports budget et pièces jointes procurement.
 */
@Injectable()
export class PlatformMaxFileInterceptor implements NestInterceptor {
  constructor(
    private readonly platformUploadSettings: PlatformUploadSettingsService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const http = context.switchToHttp();
    const req = http.getRequest<Record<string, unknown>>();
    const res = http.getResponse<Record<string, unknown>>();
    const maxBytes = this.platformUploadSettings.getEffectiveMaxBytes();

    return from(
      runMulterSingle(req, res, FILE_FIELD, maxBytes),
    ).pipe(
      mergeMap(() => next.handle()),
      catchError((err: unknown) => {
        const code = (err as { code?: string })?.code;
        if (code === 'LIMIT_FILE_SIZE') {
          return throwError(
            () =>
              new PayloadTooLargeException(
                `Fichier trop volumineux (maximum ${formatMaxLabelMb(maxBytes)} Mo, réglage plateforme).`,
              ),
          );
        }
        return throwError(() => err);
      }),
    );
  }
}
