'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { AlertOctagon, AlertTriangle, Info } from 'lucide-react';
import {
  fetchLoginNewsApi,
  LOGIN_NEWS_MESSAGE_TYPE_LABEL,
  type LoginNewsMessageType,
} from '@/services/login-news';

const LOGIN_NEWS_TYPE_CLASS: Record<LoginNewsMessageType, string> = {
  INFORMATION: 'starium-login-news--information',
  WARNING: 'starium-login-news--warning',
  URGENT: 'starium-login-news--urgent',
};

function LoginNewsIcon({ messageType }: { messageType: LoginNewsMessageType }) {
  const className = 'starium-login-news-accent mt-0.5 size-5 shrink-0';
  switch (messageType) {
    case 'WARNING':
      return <AlertTriangle className={className} aria-hidden />;
    case 'URGENT':
      return <AlertOctagon className={className} aria-hidden />;
    case 'INFORMATION':
    default:
      return <Info className={className} aria-hidden />;
  }
}

export function LoginBrandPanel() {
  const year = new Date().getFullYear();
  const [newsMessage, setNewsMessage] = useState<string | null>(null);
  const [newsMessageType, setNewsMessageType] =
    useState<LoginNewsMessageType>('INFORMATION');

  useEffect(() => {
    void fetchLoginNewsApi().then(({ message, messageType }) => {
      setNewsMessage(message);
      setNewsMessageType(messageType);
    });
  }, []);

  return (
    <aside
      className="starium-login-brand relative hidden min-h-screen flex-col justify-between overflow-hidden bg-[color:var(--brand-ink)] p-8 text-white md:flex md:p-10 lg:p-12"
      aria-hidden={false}
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
            <p className="starium-login-overline mt-0.5 text-[color:var(--brand-gold)]">
              Révélez vos talents
            </p>
          </div>
        </div>
      </div>

      <div className="relative z-10 space-y-4 starium-login-enter starium-login-enter--delay-1">
        <p className="starium-login-overline text-[color:var(--brand-gold)]">
          Portail de pilotage
        </p>
        <h1 className="text-4xl font-bold leading-tight tracking-tight whitespace-nowrap lg:text-[2.75rem]">
          Reprenez de la hauteur
        </h1>
        <p className="max-w-md text-base leading-relaxed text-white/70 lg:text-lg">
          Pilotez vos directions, projets, budgets et ressources depuis un seul
          endroit.
        </p>

        {newsMessage ? (
          <div
            className={`starium-login-news starium-login-news--enter max-w-md ${LOGIN_NEWS_TYPE_CLASS[newsMessageType]}`}
            role="status"
            aria-live="polite"
          >
            <div className="flex items-start gap-3">
              <LoginNewsIcon messageType={newsMessageType} />
              <div className="space-y-1">
                <p className="starium-login-news-title starium-login-news-accent">
                  {LOGIN_NEWS_MESSAGE_TYPE_LABEL[newsMessageType]}
                </p>
                <p className="text-sm leading-relaxed text-white/85 whitespace-pre-wrap lg:text-base">
                  {newsMessage}
                </p>
              </div>
            </div>
          </div>
        ) : null}
      </div>

      <p className="relative z-10 text-xs text-white/45 starium-login-enter starium-login-enter--delay-2">
        © {year} Starium — Tous droits réservés
      </p>
    </aside>
  );
}
