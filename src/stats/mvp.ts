// Puntaje de desempeño por partida (0–10), al estilo del "OP Score": cada estadística se compara con la
// mejor de esa misma partida, así un ARAM caótico y uno tranquilo se miden igual.

import type { Participant } from '../shared/types';

/** MVP = mejor del equipo ganador; ACE = mejor del perdedor; PEOR = puntaje más bajo de la partida. */
export type Badge = 'MVP' | 'ACE' | 'PEOR';

type ScoreInput = Pick<Participant, 'team' | 'win' | 'k' | 'd' | 'a' | 'dmg' | 'taken' | 'heal' | 'cc' | 'mitigated'>;

/**
 * Pesos positivos (suman 1); las muertes restan aparte.
 *
 * Calibrados con una regresión logística sobre sus partidas (nov. 2026, 2.070 filas): KDA y muertes son
 * lo que más separa a ganadores de perdedores. No se copiaron tal cual: la regresión deja tanqueo y control
 * en ~0 (su aporte no se ve en estas cifras) y con eso los tanques casi nunca serían MVP. Con estos pesos
 * el puntaje separa mejor a ganadores de perdedores (AUC 0,665 → 0,698) y los tanques siguen siendo
 * ~1/3 de los MVP.
 */
export const WEIGHTS = {
  dmg: 0.26, // daño a campeones
  kp: 0.08, // participación en kills (se solapa con el KDA y favorece al equipo que pierde)
  kda: 0.32,
  tank: 0.1, // daño recibido + mitigado: que los tanques también puntúen
  heal: 0.08,
  cc: 0.08,
  win: 0.08,
} as const;
export const DEATH_PENALTY = 0.2;

export type ScorePart = keyof typeof WEIGHTS | 'deaths';

/** Cada valor dividido por el máximo del grupo (0 si todos son 0). */
const relative = (values: number[]): number[] => {
  const max = Math.max(...values);
  return values.map((v) => (max > 0 ? v / max : 0));
};

export interface MatchScore {
  score: number;
  badge: Badge | null;
  /** Cuánto aportó cada estadística al puntaje (en puntos; las muertes en negativo). */
  parts: Record<ScorePart, number>;
}

/** Puntaje, medalla y desglose de cada participante, en el mismo orden que `ps`. */
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

  const parts = ps.map((p, i): Record<ScorePart, number> => {
    const tk = teamKills.get(p.team) ?? 0;
    const kp = tk ? Math.min(1, (p.k + p.a) / tk) : 0;
    return {
      dmg: 10 * WEIGHTS.dmg * dmg[i],
      kp: 10 * WEIGHTS.kp * kp,
      kda: 10 * WEIGHTS.kda * kda[i],
      tank: 10 * WEIGHTS.tank * tank[i],
      heal: 10 * WEIGHTS.heal * heal[i],
      cc: 10 * WEIGHTS.cc * cc[i],
      win: p.win ? 10 * WEIGHTS.win : 0,
      deaths: -10 * DEATH_PENALTY * deaths[i],
    };
  });
  const raw = parts.map((pt) => Math.min(10, Math.max(0, Object.values(pt).reduce((a, b) => a + b, 0))));

  // Las medallas se deciden con el valor sin redondear, para no desempatar por orden de aparición.
  const best = (win: boolean) => {
    let idx = -1;
    ps.forEach((p, i) => { if (p.win === win && (idx < 0 || raw[i] > raw[idx])) idx = i; });
    return idx;
  };
  const mvp = best(true);
  const ace = best(false);
  // El peor se busca entre los 10, sin contar a quienes ya tienen MVP o ACE.
  let worst = -1;
  raw.forEach((v, i) => { if (i !== mvp && i !== ace && (worst < 0 || v < raw[worst])) worst = i; });
  return raw.map((v, i) => ({
    score: Math.round(v * 10) / 10,
    badge: i === mvp ? 'MVP' : i === ace ? 'ACE' : i === worst ? 'PEOR' : null,
    parts: parts[i],
  }));
}
