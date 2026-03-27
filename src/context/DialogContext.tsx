'use client';

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import type { ReactNode } from 'react';
import { toastSuccess } from '../lib/toast';

export type ConfirmOptions = {
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'default';
};

export type AlertOptions = {
  title?: string;
  message: string;
  okLabel?: string;
};

export type CopyLinkOptions = {
  title?: string;
  message: string;
  url: string;
};

type Pending =
  | { kind: 'confirm'; resolve: (value: boolean) => void; options: ConfirmOptions }
  | { kind: 'alert'; resolve: () => void; options: AlertOptions }
  | { kind: 'copyLink'; resolve: () => void; options: CopyLinkOptions };

type DialogContextValue = {
  confirm: (options: ConfirmOptions) => Promise<boolean>;
  alert: (options: AlertOptions) => Promise<void>;
  showCopyLink: (options: CopyLinkOptions) => Promise<void>;
};

const DialogContext = createContext<DialogContextValue | undefined>(undefined);

export function DialogProvider({ children }: { children: ReactNode }) {
  const [pending, setPending] = useState<Pending | null>(null);
  const pendingRef = useRef<Pending | null>(null);

  const close = useCallback(() => {
    const p = pendingRef.current;
    pendingRef.current = null;
    setPending(null);
    if (!p) return;
    if (p.kind === 'confirm') p.resolve(false);
    else p.resolve();
  }, []);

  const confirm = useCallback((options: ConfirmOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      const next: Pending = { kind: 'confirm', resolve, options };
      pendingRef.current = next;
      setPending(next);
    });
  }, []);

  const alert = useCallback((options: AlertOptions): Promise<void> => {
    return new Promise((resolve) => {
      const next: Pending = { kind: 'alert', resolve, options };
      pendingRef.current = next;
      setPending(next);
    });
  }, []);

  const showCopyLink = useCallback((options: CopyLinkOptions): Promise<void> => {
    return new Promise((resolve) => {
      const next: Pending = { kind: 'copyLink', resolve, options };
      pendingRef.current = next;
      setPending(next);
    });
  }, []);

  const resolveConfirm = useCallback((value: boolean) => {
    const p = pendingRef.current;
    pendingRef.current = null;
    setPending(null);
    if (p?.kind === 'confirm') p.resolve(value);
  }, []);

  const resolveSimple = useCallback(() => {
    const p = pendingRef.current;
    pendingRef.current = null;
    setPending(null);
    if (p && p.kind !== 'confirm') p.resolve();
  }, []);

  useEffect(() => {
    if (!pending) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [pending, close]);

  const handleCopyFromModal = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      toastSuccess('Link copiado para a área de transferência.');
    } catch {
      /* usuário pode copiar manualmente do campo */
    }
  };

  const value = React.useMemo(
    () => ({ confirm, alert, showCopyLink }),
    [confirm, alert, showCopyLink]
  );

  return (
    <DialogContext.Provider value={value}>
      {children}
      {pending && (
        <div
          className="modal-backdrop show d-block"
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.75)',
            zIndex: 2000,
          }}
          role="presentation"
          onClick={close}
        >
          <div
            className="modal-dialog modal-dialog-centered mx-auto"
            style={{ maxWidth: '480px', marginTop: '10vh' }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="system-dialog-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className="modal-content border rounded p-4 text-start"
              style={{
                backgroundColor: 'var(--dark)',
                borderColor: 'var(--dark-lighter) !important',
                color: 'white',
              }}
            >
              <h2 id="system-dialog-title" className="fs-5 fw-bold mb-2">
                {pending.kind === 'confirm' &&
                  (pending.options.title ?? 'Confirmar')}
                {pending.kind === 'alert' && (pending.options.title ?? 'Aviso')}
                {pending.kind === 'copyLink' &&
                  (pending.options.title ?? 'Copiar link')}
              </h2>
              <p className="text-secondary small mb-3">{pending.options.message}</p>

              {pending.kind === 'copyLink' && (
                <div className="mb-3">
                  <label htmlFor="system-dialog-copy-url" className="form-label small">
                    Link
                  </label>
                  <input
                    id="system-dialog-copy-url"
                    type="text"
                    readOnly
                    className="form-control form-control-sm"
                    value={pending.options.url}
                    onFocus={(e) => e.target.select()}
                    style={{
                      backgroundColor: 'var(--dark-light)',
                      borderColor: 'var(--dark-lighter)',
                      color: 'white',
                    }}
                  />
                </div>
              )}

              <div className="d-flex justify-content-end gap-2 flex-wrap">
                {pending.kind === 'confirm' && (
                  <>
                    <button
                      type="button"
                      className="btn btn-outline-secondary"
                      onClick={() => resolveConfirm(false)}
                    >
                      {pending.options.cancelLabel ?? 'Cancelar'}
                    </button>
                    <button
                      type="button"
                      className={
                        pending.options.variant === 'danger'
                          ? 'btn btn-danger'
                          : 'btn btn-primary'
                      }
                      style={
                        pending.options.variant !== 'danger'
                          ? { backgroundColor: 'var(--primary)', borderColor: 'var(--primary)' }
                          : undefined
                      }
                      onClick={() => resolveConfirm(true)}
                    >
                      {pending.options.confirmLabel ?? 'OK'}
                    </button>
                  </>
                )}
                {pending.kind === 'alert' && (
                  <button type="button" className="btn btn-primary" onClick={resolveSimple}>
                    {pending.options.okLabel ?? 'OK'}
                  </button>
                )}
                {pending.kind === 'copyLink' && (
                  <>
                    <button type="button" className="btn btn-outline-secondary" onClick={resolveSimple}>
                      Fechar
                    </button>
                    <button
                      type="button"
                      className="btn btn-primary"
                      style={{
                        backgroundColor: 'var(--primary)',
                        borderColor: 'var(--primary)',
                      }}
                      onClick={() => handleCopyFromModal(pending.options.url)}
                    >
                      Copiar link
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </DialogContext.Provider>
  );
}

export function useDialog(): DialogContextValue {
  const ctx = useContext(DialogContext);
  if (!ctx) {
    throw new Error('useDialog deve ser usado dentro de um DialogProvider');
  }
  return ctx;
}
