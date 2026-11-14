// Winrate "ajustado" (bayesiano, beta-binomial): a cada muestra se le suman PRIOR_GAMES partidas con el
// winrate promedio del grupo. Con pocas partidas el resultado queda cerca del promedio; con muchas, cerca
// del winrate real. Así un 2 de 2 no le gana a un 15 de 20 en los rankings de "mejor/peor".

import type { Rec } from '../types';

/** Cuántas partidas "promedio" se suman. Más alto = más desconfianza de las muestras chicas. */
export const PRIOR_GAMES = 10;

/**
 * Partidas "promedio" por tipo de ranking, estimadas con sus datos (bayes empírico, nov. 2026): cuanto
 * menos varían de verdad los winrates de esa categoría, más hay que desconfiar de una racha corta.
 * Los aumentos varían bastante (≈12); los dúos y jugadores casi no se alejan del 50% (≈30+).
 * Campeones daba ≈6, pero con pocos datos por campeón se deja en 10 por prudencia.
 */
export const PRIORS = { augment: 12, champion: 10, squad: 30, player: 30 } as const;

export const adjustedWr = (wins: number, games: number, base: number, k = PRIOR_GAMES): number =>
  (wins + k * base) / (games + k);

/** Winrate promedio del grupo por jugador-partida: el punto hacia el que se ajusta todo. */
export const baseWinrate = (recs: Rec[]): number =>
  recs.length ? recs.filter((r) => r.p.win).length / recs.length : 0.5;
