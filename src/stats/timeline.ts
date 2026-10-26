import type { Game, Rec } from '../types';

export interface Bucket {
  /** Clave del día (YYYY-MM-DD, hora local) o de la hora (0-23). */
  key: string | number;
  w: number;
  l: number;
}

const dayKey = (ts: number): string => {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

/** Resultado del grupo en una partida; null si hubo amigos en ambos equipos. */
const groupWin = (m: Game): boolean | null =>
  new Set(m.mine.map((p) => p.team)).size > 1 ? null : m.mine[0].win;

/**
 * Victorias y derrotas por día, de `days` días atrás hasta `now` (incluye días sin partidas,
 * para que el eje de tiempo sea continuo). Sin `recs`, cuenta cada partida del grupo una vez.
 */
export function byDay(ms: Game[], days: number, now = Date.now(), recs?: Rec[]): Bucket[] {
  const buckets = new Map<string, Bucket>();
  for (let i = days - 1; i >= 0; i--) {
    const key = dayKey(now - i * 864e5);
    buckets.set(key, { key, w: 0, l: 0 });
  }
  const results = recs ? recs.map((r) => ({ start: r.m.start, win: r.p.win as boolean | null })) : ms.map((m) => ({ start: m.start, win: groupWin(m) }));
  for (const { start, win } of results) {
    const b = buckets.get(dayKey(start));
    if (!b || win === null) continue;
    if (win) b.w++; else b.l++;
  }
  return [...buckets.values()];
}

/** Victorias y derrotas del grupo según la hora local de inicio. */
export function byHour(ms: Game[]): Bucket[] {
  const hours: Bucket[] = Array.from({ length: 24 }, (_, h) => ({ key: h, w: 0, l: 0 }));
  for (const m of ms) {
    const win = groupWin(m);
    if (win === null) continue;
    const b = hours[new Date(m.start).getHours()];
    if (win) b.w++; else b.l++;
  }
  return hours;
}

/** Cuántos días mostrar en "actividad": desde la primera partida, entre 7 y 30. */
export function activitySpan(ms: Game[], now = Date.now()): number {
  if (!ms.length) return 7;
  const oldest = Math.min(...ms.map((m) => m.start));
  return Math.min(30, Math.max(7, Math.ceil((now - oldest) / 864e5) + 1));
}
