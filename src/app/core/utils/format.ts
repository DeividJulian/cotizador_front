const PESOS = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });
const NUMBER = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 1 });
const INTEGER = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 });

/** 33218866 -> "$ 33.218.866" (Colombian pesos, like the proposal of the backend) */
export function cop(value: number | null | undefined): string {
  return PESOS.format(value ?? 0);
}

/** 434.4 -> "434,4" */
export function num(value: number | null | undefined): string {
  return NUMBER.format(value ?? 0);
}

/** 1000000 -> "1.000.000" */
export function int(value: number | null | undefined): string {
  return INTEGER.format(value ?? 0);
}

/** "2026-10-10T…" -> "10 oct 2026" */
export function shortDate(iso: string): string {
  const date = new Date(iso.endsWith('Z') || iso.includes('+') ? iso : `${iso}Z`);
  return date.toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' });
}

/** Initials for the avatar: "Daniela Ruiz" -> "DR" */
export function initials(name: string | null | undefined): string {
  const parts = (name ?? '').trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? '') + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase() || '?';
}

/** Chart colour (1-5) of each role, so the same role always has the same swatch. */
const ROLE_COLORS: Record<string, number> = {
  Backend: 1,
  Frontend: 2,
  'Diseño UX/UI': 3,
  QA: 4,
  'Gestión de proyecto': 5,
  DevOps: 5,
};

export function roleColor(role: string): number {
  return ROLE_COLORS[role] ?? 5;
}
