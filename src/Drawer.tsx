import { useEffect, useId, useRef } from "react";
import type { ReactNode } from "react";

type DrawerProps = {
  open: boolean;
  title: string;
  closeLabel: string;
  onClose: () => void;
  children: ReactNode;
  id?: string;
};

const restoreFocus = (opener: HTMLElement | null) => {
  if (opener?.isConnected && !opener.closest("[inert], dialog:not([open])")) {
    opener.focus({ preventScroll: true });
    if (document.activeElement === opener) return;
  }
  const fallback = document.querySelector<HTMLElement>(
    "dialog[open] h2, main h1, main, body",
  );
  if (!fallback) return;
  const needsTabIndex = !fallback.hasAttribute("tabindex");
  if (needsTabIndex) fallback.setAttribute("tabindex", "-1");
  fallback.focus({ preventScroll: true });
  if (needsTabIndex) fallback.removeAttribute("tabindex");
};

export function Drawer({
  open,
  title,
  closeLabel,
  onClose,
  children,
  id,
}: DrawerProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const headingId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!open || !dialog) return;
    const opener =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    if (!dialog.open) dialog.showModal();
    dialog.scrollTop = 0;
    headingRef.current?.focus({ preventScroll: true });
    return () => {
      if (dialog.open) dialog.close();
      // Restore synchronously so a StrictMode setup/cleanup cannot steal focus
      // from a subsequently reopened drawer or a parent-requested form focus.
      restoreFocus(opener);
    };
  }, [open]);

  return (
    <dialog
      id={id}
      ref={dialogRef}
      className="dashboard-drawer"
      aria-modal="true"
      aria-labelledby={headingId}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
    >
      <header className="drawer-heading">
        <h2 id={headingId} ref={headingRef} tabIndex={-1}>
          {title}
        </h2>
        <button
          type="button"
          className="button quiet small-button drawer-close"
          onClick={onClose}
        >
          {closeLabel}
        </button>
      </header>
      <div className="drawer-body">{children}</div>
    </dialog>
  );
}
