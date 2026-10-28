import type { Friend, FriendPlayer, Game, Rec } from '../types';

export interface Totals {
  games: number;
  wins: number;
  losses: number;
  k: number;
  d: number;
  a: number;
  dmg: number;
  taken: number;
  heal: number;
  gold: number;
  triples: number;
  quadras: number;
  pentas: number;
  /** Segundos jugados en total. */
  secs: number;
  /** Puntaje promedio (0–10) y medallas. */
  avgScore: number;
  mvps: number;
  aces: number;
  wr: number;
  kda: number;
  avgK: number;
  avgD: number;
  avgA: number;
  avgDmg: number;
  /** Daño a campeones por minuto. */
  dpm: number;
}

/** Cada partida vista desde cada amigo del grupo (o solo desde `f`). */
export const recordsOf = (ms: Game[], f?: Friend): Rec[] =>
  ms.flatMap((m) => m.mine.filter((p) => !f || p.friend === f).map((p) => ({ m, p })));

export function agg(recs: Rec[]): Totals {
  let wins = 0, k = 0, d = 0, a = 0, dmg = 0, taken = 0, heal = 0, gold = 0, triples = 0, quadras = 0, pentas = 0, secs = 0;
  let score = 0, mvps = 0, aces = 0;
  for (const { m, p } of recs) {
    wins += p.win ? 1 : 0;
    k += p.k; d += p.d; a += p.a;
    dmg += p.dmg; taken += p.taken; heal += p.heal; gold += p.gold;
    triples += p.triples; quadras += p.quadras; pentas += p.pentas;
    secs += m.duration;
    score += p.score;
    if (p.badge === 'MVP') mvps++;
    else if (p.badge === 'ACE') aces++;
  }
  const games = recs.length;
  const n = Math.max(1, games);
  return {
    games, wins, losses: games - wins, k, d, a, dmg, taken, heal, gold, triples, quadras, pentas, secs,
    wr: wins / n,
    kda: (k + a) / Math.max(1, d),
    avgK: k / n, avgD: d / n, avgA: a / n,
    avgDmg: dmg / n,
    dpm: dmg / Math.max(1, secs / 60),
    avgScore: score / n,
    mvps,
    aces,
  };
}

export interface ChampGroup {
  /** Una partida de muestra, para el id y nombre del campeón. */
  p: FriendPlayer;
  recs: Rec[];
  s: Totals;
}

/** Agrupa por campeón, de más jugado a menos. */
export function byChamp(recs: Rec[]): ChampGroup[] {
  const groups = new Map<number, Rec[]>();
  for (const r of recs) {
    const list = groups.get(r.p.champId) ?? [];
    list.push(r);
    groups.set(r.p.champId, list);
  }
  return [...groups.values()]
    .map((rs) => ({ p: rs[0].p, recs: rs, s: agg(rs) }))
    .sort((a, b) => b.s.games - a.s.games || b.s.wr - a.s.wr);
}

/** Racha actual. `recs` va de la partida más reciente a la más antigua. */
export function streak(recs: Rec[]): { win: boolean; n: number } | null {
  if (!recs.length) return null;
  const win = recs[0].p.win;
  let n = 0;
  while (n < recs.length && recs[n].p.win === win) n++;
  return { win, n };
}

/** Racha más larga de victorias (o de derrotas con `win = false`). */
export function longestRun(recs: Rec[], win = true): number {
  let best = 0, cur = 0;
  for (let i = recs.length - 1; i >= 0; i--) {
    cur = recs[i].p.win === win ? cur + 1 : 0;
    best = Math.max(best, cur);
  }
  return best;
}

/** Mínimo de partidas para que un dúo o compañero entre en "mejor/peor". */
export const minGames = (ms: Game[]): number => (ms.length >= 40 ? 3 : 2);
