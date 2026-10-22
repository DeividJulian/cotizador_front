import { HttpErrorResponse } from '@angular/common/http';

/** Turns any HTTP error into a message that can be shown to the user (in Spanish, like the backend). */
export function errorMessage(error: unknown): string {
  if (error instanceof HttpErrorResponse) {
    if (error.status === 0) {
      return 'No se pudo conectar con el servidor. Revisa tu conexión o espera unos segundos a que despierte.';
    }
    const detail = (error.error as { detail?: unknown } | null)?.detail;
    if (typeof detail === 'string') return detail;
    if (Array.isArray(detail)) return detail.map((d) => (d as { msg?: string }).msg ?? '').filter(Boolean).join('; ');
    if (error.status === 429) return 'Se alcanzó el límite de uso. Espera unos minutos y vuelve a intentarlo.';
    if (error.status >= 500) return 'El servidor tuvo un problema. Intenta de nuevo en un momento.';
    return `Error ${error.status}`;
  }
  return error instanceof Error ? error.message : 'Ocurrió un error inesperado';
}
