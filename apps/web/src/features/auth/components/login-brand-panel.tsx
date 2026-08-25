'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import {
  fetchLoginNewsApi,
  type LoginNewsMessageType,
} from '@/services/login-news';
import { useLoginAppEnv } from './login-env-provider';
import { cn } from '@/lib/utils';
import { LoginNewsMessageView } from './login-news-message-view';

export function LoginBrandPanel() {
  const year = new Date().getFullYear();
  const appEnv = useLoginAppEnv();
  const isDev = appEnv === 'development';
  const isPreprod = appEnv === 'preproduction';
  const isNonProd = isDev || isPreprod;
  const [newsMessage, setNewsMessage] = useState<string | null>(null);
  const [newsMessageType, setNewsMessageType] =
    useState<LoginNewsMessageType>('INFORMATION');
  useEffect(() => {
    void fetchLoginNewsApi().then(({ message, messageType }) => {
      setNewsMessage(message);
      setNewsMessageType(messageType);
    });
  }, []);

  const accentClass = isNonProd
    ? 'text-white'
    : 'text-[color:var(--brand-gold)]';

  const overlineLabel = isDev
    ? 'Développement'
    : isPreprod
      ? 'Préproduction'
      : 'Portail de pilotage';

  return (
    <aside
      className={cn(
        'starium-login-brand relative hidden min-h-screen min-w-0 flex-col justify-between overflow-hidden p-8 text-white md:flex md:p-10 lg:p-12',
        isDev
          ? 'starium-login-brand--dev bg-[color:var(--login-brand-dev)]'
          : isPreprod
            ? 'starium-login-brand--preprod bg-[color:var(--login-brand-preprod)]'
            : 'bg-[color:var(--brand-ink)]',
      )}
      aria-hidden={false}
      data-node-env={isNonProd ? appEnv : undefined}
    >
      <Image
        src="/login-brand-pattern.svg"
        alt=""
        fill
        priority
        unoptimized
        aria-hidden
        className="pointer-events-none object-cover opacity-80"
      />

      <div className="relative z-10 starium-login-enter">
        <div className="flex items-center gap-3">
          <Image
            src="/brand/icon-starium-white.png"
            alt=""
            width={44}
            height={44}
            priority
            aria-hidden
            className="size-11 shrink-0 object-contain"
          />
          <div>
            <p className="text-xl font-bold tracking-tight">Starium</p>
            <p className={cn('starium-login-overline mt-0.5', accentClass)}>
              Révélez vos talents
            </p>
          </div>
        </div>
      </div>

      <div className="relative z-10 min-w-0 space-y-4 starium-login-enter starium-login-enter--delay-1">
        <p className={cn('starium-login-overline', accentClass)}>
          {overlineLabel}
        </p>
        <h1 className="max-w-full text-[clamp(1.875rem,4.2vw,2.75rem)] font-bold leading-tight tracking-tight text-balance">
          Reprenez de la hauteur
        </h1>
        <p className="max-w-md text-base leading-relaxed text-white/70 lg:text-lg">
          Pilotez vos directions, projets, budgets et ressources depuis un seul
          endroit.
        </p>

        {newsMessage ? (
          <LoginNewsMessageView
            message={newsMessage}
            messageType={newsMessageType}
            animated
          />
        ) : null}
      </div>

      <p className="relative z-10 text-xs text-white/45 starium-login-enter starium-login-enter--delay-2">
        © {year} Starium — Tous droits réservés
      </p>
    </aside>
  );
}
