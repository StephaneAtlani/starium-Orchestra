import Image from 'next/image';

export function LoginBrandPanel() {
  const year = new Date().getFullYear();

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

      <div className="relative z-10">
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

      <div className="relative z-10 space-y-4">
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
      </div>

      <p className="relative z-10 text-xs text-white/45">
        © {year} Starium — Tous droits réservés
      </p>
    </aside>
  );
}
