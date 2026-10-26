import type { Friend, Rec } from '../types';

export interface AugmentStat {
  id: number;
  n: number;
  w: number;
  wr: number;
  /** Cuántas veces lo eligió cada amigo. */
  who: Map<Friend, number>;
}

/** Aumentos elegidos, de más a menos usado. */
export function byAugment(recs: Rec[]): AugmentStat[] {
  const map = new Map<number, Omit<AugmentStat, 'wr'>>();
  for (const r of recs) {
    for (const id of r.p.augments ?? []) {
      const e = map.get(id) ?? { id, n: 0, w: 0, who: new Map() };
      e.n++;
      e.w += r.p.win ? 1 : 0;
      e.who.set(r.p.friend, (e.who.get(r.p.friend) ?? 0) + 1);
      map.set(id, e);
    }
  }
  return [...map.values()]
    .map((e) => ({ ...e, wr: e.w / e.n }))
    .sort((a, b) => b.n - a.n || b.wr - a.wr);
}
