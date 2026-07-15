type MicrosoftIconProps = {
  className?: string;
};

/** Logo Microsoft (4 carrés) pour le bouton SSO. */
export function MicrosoftIcon({ className }: MicrosoftIconProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 21 21"
      aria-hidden
      focusable="false"
    >
      <rect x="1" y="1" width="9" height="9" fill="#F25022" />
      <rect x="11" y="1" width="9" height="9" fill="#7FBA00" />
      <rect x="1" y="11" width="9" height="9" fill="#00A4EF" />
      <rect x="11" y="11" width="9" height="9" fill="#FFB900" />
    </svg>
  );
}
