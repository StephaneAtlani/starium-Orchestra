/* global React */

/**
 * Button — Starium primary action control.
 * Self-contained: styles rely only on design-system tokens (colors_and_type.css),
 * so it renders correctly anywhere the DS stylesheet is loaded.
 */
export function Button({
  children,
  variant = 'primary',
  size = 'md',
  iconLeft = null,
  iconRight = null,
  disabled = false,
  onClick,
}) {
  const pad = size === 'lg' ? '12px 20px' : size === 'sm' ? '7px 12px' : '9px 15px';
  const fontSize = size === 'lg' ? 14 : size === 'sm' ? 12.5 : 13;

  const variants = {
    primary: { background: 'var(--brand-gold)', color: 'var(--fg-on-gold)', border: '1.5px solid transparent' },
    secondary: { background: 'var(--bg-surface)', color: 'var(--fg-1)', border: '1.5px solid var(--border-subtle)' },
    modifier: { background: 'var(--bg-surface)', color: 'var(--brand-gold-700)', border: '1.5px solid var(--brand-gold-100)' },
    ghost: { background: 'transparent', color: 'var(--fg-2)', border: '1.5px solid transparent' },
    danger: { background: 'var(--state-danger)', color: '#fff', border: '1.5px solid transparent' },
  };

  const style = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    padding: pad,
    borderRadius: 'var(--radius-md)',
    font: 'var(--font-sans)',
    fontSize,
    fontWeight: 700,
    lineHeight: 1,
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.5 : 1,
    whiteSpace: 'nowrap',
    transition: 'background var(--duration-fast) var(--ease-standard), box-shadow var(--duration-fast) var(--ease-standard)',
    ...variants[variant],
  };

  return React.createElement(
    'button',
    { type: 'button', style, disabled, onClick },
    iconLeft,
    children != null ? React.createElement('span', null, children) : null,
    iconRight
  );
}
