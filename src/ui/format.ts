import type { Participant } from '../shared/types';

/** Escapa texto para insertarlo en HTML. Todo dato que venga de jugadores pasa por aquí. */
export const esc = (s: unknown): string =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

export const pct = (x: number): string => `${Math.round(x * 100)}%`;
export const short = (n: number): string => (n >= 1000 ? `${(n / 1000).toFixed(n >= 1e5 ? 0 : 1)}k` : String(Math.round(n)));
export const dur = (s: number): string => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
export const plural = (n: number, w: string): string => `${n} ${w}${n === 1 ? '' : 's'}`;
export const ratio = (p: Pick3): string => (p.d ? ((p.k + p.a) / p.d).toFixed(2) : 'Perfecto');
export const wrClass = (x: number): string => (x >= 0.55 ? 'good' : x < 0.45 ? 'bad' : '');
export const nameKey = (name: string, tag: string): string => `${name}#${tag}`.toLowerCase();
export const slugify = (s: string): string =>
  s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

type Pick3 = Pick<Participant, 'k' | 'd' | 'a'>;

const DAY = new Intl.DateTimeFormat('es', { day: 'numeric', month: 'numeric' });
const DAY_LONG = new Intl.DateTimeFormat('es', { weekday: 'long', day: 'numeric', month: 'long' });
/** "20/10" para ejes de gráficos. Acepta epoch o clave de día (YYYY-MM-DD). */
export const shortDate = (d: number | string): string => DAY.format(toDate(d));
/** "lunes, 20 de octubre" para tooltips. */
export const longDate = (d: number | string): string => DAY_LONG.format(toDate(d));
const toDate = (d: number | string) => (typeof d === 'number' ? new Date(d) : new Date(`${d}T12:00:00`));

const rtf = new Intl.RelativeTimeFormat('es', { numeric: 'auto' });
const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ['year', 31536e3], ['month', 2592e3], ['week', 604800], ['day', 86400], ['hour', 3600], ['minute', 60],
];

export function ago(ts: number): string {
  const s = (ts - Date.now()) / 1000;
  for (const [unit, sec] of UNITS) if (Math.abs(s) >= sec) return rtf.format(Math.round(s / sec), unit);
  return 'recién';
}

/** Escala divergente para winrate: rojo < 50% < azul (colores de derrota/victoria), gris en el medio. */
export function divColor(wr: number): string {
  const mid = [52, 56, 64];
  const pole = wr >= 0.5 ? [79, 140, 230] : [214, 83, 92];
  const t = Math.min(1, Math.abs(wr - 0.5) * 2);
  return `rgb(${mid.map((v, i) => Math.round(v + (pole[i] - v) * t)).join(',')})`;
}
