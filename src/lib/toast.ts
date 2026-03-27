'use client';

import { toast } from 'sonner';

export function toastError(message: string) {
  toast.error(message);
}

export function toastSuccess(message: string) {
  toast.success(message);
}

export function toastInfo(message: string) {
  toast.message(message);
}

export function socketErrorMessage(data: unknown): string {
  if (data && typeof data === 'object' && 'message' in data) {
    const m = (data as { message: unknown }).message;
    if (typeof m === 'string' && m.trim()) return m;
  }
  return 'Ocorreu um erro no servidor.';
}

export function errorMessageFromUnknown(err: unknown, fallback: string): string {
  if (err instanceof Error && err.message.trim()) return err.message;
  return fallback;
}
