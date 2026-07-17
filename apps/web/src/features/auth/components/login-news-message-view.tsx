'use client';

import { AlertOctagon, AlertTriangle, Info } from 'lucide-react';
import {
  LOGIN_NEWS_MESSAGE_TYPE_LABEL,
  type LoginNewsMessageType,
} from '@/services/login-news';
import { cn } from '@/lib/utils';

const LOGIN_NEWS_TYPE_CLASS: Record<LoginNewsMessageType, string> = {
  INFORMATION: 'starium-login-news--information',
  WARNING: 'starium-login-news--warning',
  URGENT: 'starium-login-news--urgent',
};

function loginNewsLightShellClass(messageType: LoginNewsMessageType): string {
  switch (messageType) {
    case 'WARNING':
      return 'border-[color:var(--state-warning)] bg-[color-mix(in_srgb,var(--state-warning-bg)_72%,var(--color-surface))] shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--state-warning)_25%,transparent)]';
    case 'URGENT':
      return 'border-[color:var(--state-danger)] bg-[color-mix(in_srgb,var(--state-danger)_14%,var(--color-surface))] shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--state-danger)_22%,transparent)]';
    case 'INFORMATION':
    default:
      return 'border-[color:var(--purple)] bg-[color-mix(in_srgb,var(--purple-bg)_70%,var(--color-surface))] shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--purple)_18%,transparent)]';
  }
}

function loginNewsLightTitleClass(messageType: LoginNewsMessageType): string {
  switch (messageType) {
    case 'WARNING':
      return 'bg-[color-mix(in_srgb,var(--state-warning-bg)_85%,var(--state-warning))] text-[color:var(--brand-ink)]';
    case 'URGENT':
      return 'bg-[color-mix(in_srgb,var(--state-danger)_88%,var(--brand-ink))] text-white';
    case 'INFORMATION':
    default:
      return 'bg-[color-mix(in_srgb,var(--purple-bg)_82%,var(--purple))] text-[color:var(--purple)]';
  }
}

function loginNewsLightIconClass(messageType: LoginNewsMessageType): string {
  switch (messageType) {
    case 'WARNING':
      return 'text-[color:var(--state-warning)]';
    case 'URGENT':
      return 'text-[color:var(--state-danger)]';
    case 'INFORMATION':
    default:
      return 'text-[color:var(--purple)]';
  }
}

function LoginNewsIcon({
  messageType,
  variant,
}: {
  messageType: LoginNewsMessageType;
  variant: 'dark' | 'light';
}) {
  const className = cn(
    'mt-0.5 size-5 shrink-0',
    variant === 'dark' ? 'starium-login-news-accent' : loginNewsLightIconClass(messageType),
  );
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

export type LoginNewsMessageViewProps = {
  message: string;
  messageType: LoginNewsMessageType;
  variant?: 'dark' | 'light';
  animated?: boolean;
  className?: string;
};

export function LoginNewsMessageView({
  message,
  messageType,
  variant = 'dark',
  animated = false,
  className,
}: LoginNewsMessageViewProps) {
  if (variant === 'light') {
    return (
      <article
        className={cn(
          'rounded-[var(--radius-lg,14px)] border p-4',
          loginNewsLightShellClass(messageType),
          className,
        )}
        role="status"
        aria-live="polite"
      >
        <div className="flex items-start gap-3">
          <LoginNewsIcon messageType={messageType} variant="light" />
          <div className="min-w-0 space-y-2">
            <p
              className={cn(
                'inline-flex w-fit items-center rounded-[var(--radius-pill,999px)] px-3 py-1 text-[0.6875rem] font-bold uppercase tracking-[0.1em]',
                loginNewsLightTitleClass(messageType),
              )}
            >
              {LOGIN_NEWS_MESSAGE_TYPE_LABEL[messageType]}
            </p>
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
              {message}
            </p>
          </div>
        </div>
      </article>
    );
  }

  return (
    <div
      className={cn(
        'starium-login-news max-w-md',
        LOGIN_NEWS_TYPE_CLASS[messageType],
        animated && 'starium-login-news--enter',
        className,
      )}
      role="status"
      aria-live="polite"
    >
      <div className="flex items-start gap-3">
        <LoginNewsIcon messageType={messageType} variant="dark" />
        <div className="space-y-1">
          <p className="starium-login-news-title starium-login-news-accent">
            {LOGIN_NEWS_MESSAGE_TYPE_LABEL[messageType]}
          </p>
          <p className="text-sm leading-relaxed text-white/85 whitespace-pre-wrap lg:text-base">
            {message}
          </p>
        </div>
      </div>
    </div>
  );
}
