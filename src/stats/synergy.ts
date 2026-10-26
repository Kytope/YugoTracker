import type { Friend, FriendPlayer, Game } from '../types';

export interface Squad {
  friends: Friend[];
  n: number;
  w: number;
  k: number;
  d: number;
  a: number;
  dmg: number;
  wr: number;
  kda: number;
}

export function combos<T>(list: T[], size: number): T[][] {
  if (size === 0) return [[]];
  const out: T[][] = [];
  list.forEach((x, i) => combos(list.slice(i + 1), size - 1).forEach((rest) => out.push([x, ...rest])));
  return out;
}

const orderOf = (friends: Friend[]) => new Map(friends.map((f, i) => [f, i]));

/** Combinaciones de `size` amigos que jugaron en el mismo equipo. */
export function squadStats(ms: Game[], size: number, friends: Friend[]): Squad[] {
  const order = orderOf(friends);
  const rank = (p: FriendPlayer) => order.get(p.friend) ?? 0;
  const groups = new Map<string, Omit<Squad, 'wr' | 'kda'>>();
  for (const m of ms) {
    for (const team of [100, 200]) {
      const side = m.mine.filter((p) => p.team === team).sort((x, y) => rank(x) - rank(y));
      for (const combo of combos(side, size)) {
        const key = combo.map((p) => p.friend.slug).join('|');
        const e = groups.get(key) ?? { friends: combo.map((p) => p.friend), n: 0, w: 0, k: 0, d: 0, a: 0, dmg: 0 };
        e.n++;
        e.w += combo[0].win ? 1 : 0;
        for (const p of combo) { e.k += p.k; e.d += p.d; e.a += p.a; e.dmg += p.dmg; }
        groups.set(key, e);
      }
    }
  }
  return [...groups.values()].map((e) => ({ ...e, wr: e.w / e.n, kda: (e.k + e.a) / Math.max(1, e.d) }));
}

export interface Rivalry {
  a: Friend;
  b: Friend;
  aw: number;
  bw: number;
}

/** Enfrentamientos entre amigos que cayeron en equipos contrarios. */
export function rivalries(ms: Game[], friends: Friend[]): Rivalry[] {
  const order = orderOf(friends);
  const map = new Map<string, Rivalry>();
  for (const m of ms) {
    for (const x of m.mine) for (const y of m.mine) {
      if (x.team !== 100 || y.team !== 200) continue;
      const [a, b] = (order.get(x.friend) ?? 0) < (order.get(y.friend) ?? 0) ? [x, y] : [y, x];
      const key = `${a.friend.slug}|${b.friend.slug}`;
      const e = map.get(key) ?? { a: a.friend, b: b.friend, aw: 0, bw: 0 };
      if (a.win) e.aw++; else e.bw++;
      map.set(key, e);
    }
  }
  return [...map.values()].sort((x, y) => y.aw + y.bw - (x.aw + x.bw));
}

/** Resultado según cuántos amigos había en el equipo (1 = solo, 5 = premade completo). */
export function bySquadSize(ms: Game[]): { n: number; games: number; wins: number }[] {
  const rows = [1, 2, 3, 4, 5].map((n) => ({ n, games: 0, wins: 0 }));
  for (const m of ms) {
    for (const team of [100, 200]) {
      const side = m.mine.filter((p) => p.team === team);
      if (!side.length) continue;
      const row = rows[Math.min(side.length, 5) - 1];
      row.games++;
      row.wins += side[0].win ? 1 : 0;
    }
  }
  return rows;
}

export interface Mate {
  g: Friend;
  /** Partidas en el mismo equipo y victorias en ellas. */
  n: number;
  w: number;
  /** Partidas en contra y victorias de `f` en ellas. */
  vs: number;
  vsW: number;
}

/** Cómo le va a `f` con cada otro amigo. */
export function matesOf(f: Friend, ms: Game[], friends: Friend[]): Mate[] {
  const recs = ms.flatMap((m) => m.mine.filter((p) => p.friend === f).map((p) => ({ m, p })));
  return friends
    .filter((g) => g !== f)
    .map((g) => {
      const together = recs.filter((r) => r.m.mine.some((q) => q.friend === g && q.team === r.p.team));
      const against = recs.filter((r) => r.m.mine.some((q) => q.friend === g && q.team !== r.p.team));
      return {
        g,
        n: together.length,
        w: together.filter((r) => r.p.win).length,
        vs: against.length,
        vsW: against.filter((r) => r.p.win).length,
      };
    })
    .filter((x) => x.n || x.vs)
    .sort((a, b) => b.n - a.n);
}
