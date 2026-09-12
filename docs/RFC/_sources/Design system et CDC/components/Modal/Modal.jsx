/* global React */

/**
 * Modal — Starium dialog surface.
 * Self-contained: styles rely only on design-system tokens (colors_and_type.css),
 * so it renders correctly anywhere the DS stylesheet is loaded.
 *
 * Composition: <Modal open onClose title subtitle icon footer> ... body content ... </Modal>
 */
export function Modal({
  open = false,
  onClose,
  title,
  subtitle,
  icon = null,
  footer = null,
  width = 520,
  children,
}) {
  const overlayStyle = {
    position: 'fixed',
    inset: 0,
    background: 'rgba(14,14,16,0.4)',
    zIndex: 500,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    opacity: open ? 1 : 0,
    pointerEvents: open ? 'auto' : 'none',
    transition: 'opacity 200ms var(--ease-standard)',
  };

  const modalStyle = {
    width,
    maxWidth: '100%',
    maxHeight: '86vh',
    background: 'var(--bg-surface)',
    border: '1px solid var(--border-subtle)',
    borderRadius: 'var(--radius-xl)',
    boxShadow: 'var(--shadow-4)',
    display: 'flex',
    flexDirection: 'column',
    transform: open ? 'translateY(0) scale(1)' : 'translateY(10px) scale(0.98)',
    transition: 'transform 260ms cubic-bezier(0.2,0,0,1.2), opacity 200ms var(--ease-standard)',
  };

  const headStyle = {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 14,
    padding: '20px 22px',
    borderBottom: '1px solid var(--border-subtle)',
    flexShrink: 0,
  };

  const iconWrapStyle = {
    width: 38,
    height: 38,
    borderRadius: 10,
    background: 'var(--brand-gold-050)',
    color: 'var(--brand-gold-700)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  };

  const closeBtnStyle = {
    marginLeft: 'auto',
    width: 32,
    height: 32,
    borderRadius: 'var(--radius-md)',
    border: 'none',
    background: 'transparent',
    color: 'var(--fg-3)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    flexShrink: 0,
    transition: 'background 120ms var(--ease-standard)',
  };

  const bodyStyle = {
    padding: 22,
    overflowY: 'auto',
    color: 'var(--fg-2)',
    font: 'var(--text-body)',
  };

  const footStyle = {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: 10,
    padding: '16px 22px',
    borderTop: '1px solid var(--border-subtle)',
    flexShrink: 0,
  };

  const closeIcon = React.createElement(
    'svg',
    { viewBox: '0 0 24 24', width: 18, height: 18, fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round' },
    React.createElement('line', { x1: 18, y1: 6, x2: 6, y2: 18 }),
    React.createElement('line', { x1: 6, y1: 6, x2: 18, y2: 18 })
  );

  return React.createElement(
    'div',
    {
      style: overlayStyle,
      onClick: (e) => { if (e.target === e.currentTarget && onClose) onClose(); },
    },
    React.createElement(
      'div',
      { style: modalStyle, role: 'dialog', 'aria-modal': 'true' },
      (title || icon) && React.createElement(
        'div',
        { style: headStyle },
        icon ? React.createElement('div', { style: iconWrapStyle }, icon) : null,
        React.createElement(
          'div',
          null,
          title ? React.createElement('div', { style: { font: 'var(--text-h4)', color: 'var(--fg-1)' } }, title) : null,
          subtitle ? React.createElement('div', { style: { font: 'var(--text-body-s)', color: 'var(--fg-3)', marginTop: 2 } }, subtitle) : null
        ),
        React.createElement('button', { type: 'button', style: closeBtnStyle, onClick: onClose, 'aria-label': 'Fermer' }, closeIcon)
      ),
      React.createElement('div', { style: bodyStyle }, children),
      footer ? React.createElement('div', { style: footStyle }, footer) : null
    )
  );
}
