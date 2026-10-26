import type { Friend, Game, Rec } from '../types';
import { agg, byChamp, longestRun, recordsOf, type ChampGroup, type Totals } from './aggregate';

export interface PlayerExtras extends Totals {
  distinct: number;
  top: ChampGroup | undefined;
  /** Participación en kills del equipo, promedio. */
  kp: number;
  gpm: number;
  cc: number;
  avgTaken: number;
  avgHeal: number;
  perfect: number;
  night: number;
  best: number;
  worstRun: number;
}

export function playerExtras(recs: Rec[]): PlayerExtras {
  const s = agg(recs);
  const champs = byChamp(recs);
  let kp = 0;
  for (const { m, p } of recs) {
    const teamKills = m.participants.filter((q) => q.team === p.team).reduce((n, q) => n + q.k, 0);
    kp += teamKills ? (p.k + p.a) / teamKills : 0;
  }
  const n = Math.max(1, s.games);
  return {
    ...s,
    distinct: champs.length,
    top: champs[0],
    kp: kp / n,
    gpm: s.gold / Math.max(1, s.secs / 60),
    cc: recs.reduce((t, r) => t + (r.p.cc || 0), 0) / n,
    avgTaken: s.taken / n,
    avgHeal: s.heal / n,
    perfect: recs.filter((r) => r.p.d === 0).length,
    night: recs.filter((r) => new Date(r.m.start).getHours() < 6).length,
    best: longestRun(recs, true),
    worstRun: longestRun(recs, false),
  };
}

export interface AwardDef {
  id: string;
  title: string;
  desc: string;
  /** Premio basado en promedios: exige un mínimo de partidas para que no gane alguien con 1. */
  avg?: boolean;
  /** Gana el valor más bajo. */
  low?: boolean;
  value: (s: PlayerExtras) => number;
}

export interface AwardResult<D extends AwardDef = AwardDef> {
  def: D;
  ranking: { f: Friend; s: PlayerExtras; v: number }[];
  min: number;
}

/** Ranking de cada premio entre los amigos con partidas en `ms`. */
export function computeAwards<D extends AwardDef>(defs: D[], ms: Game[], friends: Friend[]): AwardResult<D>[] {
  const stats = friends
    .map((f) => ({ f, s: playerExtras(recordsOf(ms, f)) }))
    .filter((x) => x.s.games);
  const min = Math.min(5, Math.max(0, ...stats.map((x) => x.s.games)));
  return defs
    .map((def) => {
      const ranking = stats
        .filter((x) => !def.avg || x.s.games >= min)
        .map((x) => ({ ...x, v: def.value(x.s) }))
        .filter((x) => x.v > 0 || def.low)
        .sort((a, b) => (def.low ? a.v - b.v : b.v - a.v) || b.s.games - a.s.games);
      return { def, ranking, min };
    })
    .filter((a) => a.ranking.length);
}
