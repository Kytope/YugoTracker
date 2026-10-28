// Puntaje de desempeño por partida (0–10), al estilo del "OP Score": cada estadística se compara con la
// mejor de esa misma partida, así un ARAM caótico y uno tranquilo se miden igual.

import type { Participant } from '../shared/types';

export type Badge = 'MVP' | 'ACE';

type ScoreInput = Pick<Participant, 'team' | 'win' | 'k' | 'd' | 'a' | 'dmg' | 'taken' | 'heal' | 'cc' | 'mitigated'>;

/** Pesos positivos (suman 1). Las muertes restan aparte. */
export const WEIGHTS = {
  dmg: 0.26, // daño a campeones
  kp: 0.2, // participación en kills del equipo
  kda: 0.2,
  tank: 0.12, // daño recibido + mitigado: que los tanques también puntúen
  heal: 0.08,
  cc: 0.06,
  win: 0.08,
} as const;
export const DEATH_PENALTY = 0.12;

/** Cada valor dividido por el máximo del grupo (0 si todos son 0). */
const relative = (values: number[]): number[] => {
  const max = Math.max(...values);
  return values.map((v) => (max > 0 ? v / max : 0));
};

export interface MatchScore {
  score: number;
  badge: Badge | null;
}

/** Puntaje y medalla de cada participante, en el mismo orden que `ps`. */
export function scoreMatch(ps: ScoreInput[]): MatchScore[] {
  if (!ps.length) return [];
  const teamKills = new Map<number, number>();
  for (const p of ps) teamKills.set(p.team, (teamKills.get(p.team) ?? 0) + p.k);

  const dmg = relative(ps.map((p) => p.dmg));
  const kda = relative(ps.map((p) => (p.k + p.a) / Math.max(1, p.d)));
  const tank = relative(ps.map((p) => p.taken + (p.mitigated ?? 0)));
  const heal = relative(ps.map((p) => p.heal));
  const cc = relative(ps.map((p) => p.cc || 0));
  const deaths = relative(ps.map((p) => p.d));

  const raw = ps.map((p, i) => {
    const tk = teamKills.get(p.team) ?? 0;
    const kp = tk ? Math.min(1, (p.k + p.a) / tk) : 0;
    const value =
      WEIGHTS.dmg * dmg[i] + WEIGHTS.kp * kp + WEIGHTS.kda * kda[i] + WEIGHTS.tank * tank[i] +
      WEIGHTS.heal * heal[i] + WEIGHTS.cc * cc[i] + (p.win ? WEIGHTS.win : 0) - DEATH_PENALTY * deaths[i];
    return Math.min(10, Math.max(0, value * 10));
  });

  // Las medallas se deciden con el valor sin redondear, para no desempatar por orden de aparición.
  const best = (win: boolean) => {
    let idx = -1;
    ps.forEach((p, i) => { if (p.win === win && (idx < 0 || raw[i] > raw[idx])) idx = i; });
    return idx;
  };
  const mvp = best(true);
  const ace = best(false);
  return raw.map((v, i) => ({ score: Math.round(v * 10) / 10, badge: i === mvp ? 'MVP' : i === ace ? 'ACE' : null }));
}
