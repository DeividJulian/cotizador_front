const PESOS = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'COP',
  currencyDisplay: 'narrowSymbol',
  maximumFractionDigits: 0,
});
const NUMBER = new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 });

/** 38275487 -> "$38,275,487" (pesos colombianos, mismo formato que la propuesta del backend) */
export function cop(value: number | null | undefined): string {
  return PESOS.format(value ?? 0);
}

/** 434.4 -> "434.4" */
export function num(value: number | null | undefined): string {
  return NUMBER.format(value ?? 0);
}

export function shortDate(iso: string): string {
  const date = new Date(iso.endsWith('Z') ? iso : `${iso}Z`);
  return date.toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' });
}
