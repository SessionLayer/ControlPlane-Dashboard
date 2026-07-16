import { useEffect, useId, useRef, type ReactNode } from 'react';

/**
 * A modal dialog. Accessible: `role="dialog"` + `aria-modal`, labelled by its
 * title, closes on Escape and backdrop click, and moves focus into the dialog on
 * open (restoring it to the trigger on close). Rendered inline (no portal) — the
 * overlay is fixed-positioned above the app.
 */
export function Dialog({
  title,
  onClose,
  children,
  footer,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
}) {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const previousFocus = useRef<Element | null>(null);

  useEffect(() => {
    previousFocus.current = document.activeElement;
    panelRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      if (previousFocus.current instanceof HTMLElement) {
        previousFocus.current.focus();
      }
    };
  }, [onClose]);

  return (
    <div className="dialog-backdrop" onMouseDown={onClose}>
      <div
        className="dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        ref={panelRef}
        onMouseDown={(e) => {
          e.stopPropagation();
        }}
      >
        <div className="dialog-head">
          <h2 id={titleId} className="dialog-title">
            {title}
          </h2>
          <button
            type="button"
            className="dialog-close"
            aria-label="Close dialog"
            onClick={onClose}
          >
            ✕
          </button>
        </div>
        <div className="dialog-body">{children}</div>
        {footer !== undefined && <div className="dialog-footer">{footer}</div>}
      </div>
    </div>
  );
}
