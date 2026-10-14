import { HttpErrorResponse } from '@angular/common/http';

/** Convierte cualquier error HTTP en un mensaje que se pueda mostrar al usuario. */
export function errorMessage(error: unknown): string {
  if (error instanceof HttpErrorResponse) {
    if (error.status === 0) return 'Could not connect to the server. Check your connection or wait for it to wake up.';
    const detail = (error.error as { detail?: unknown } | null)?.detail;
    if (typeof detail === 'string') return detail;
    if (Array.isArray(detail)) return detail.map((d) => (d as { msg?: string }).msg ?? '').filter(Boolean).join('; ');
    return `Error ${error.status}`;
  }
  return error instanceof Error ? error.message : 'An unexpected error occurred';
}
