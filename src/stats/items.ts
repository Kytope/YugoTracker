import type { Rec } from '../types';

/** Corazón de Acero (Heartsteel). 223084 es la variante de algunos modos. */
export const HEARTSTEEL = [3084, 223084];

/**
 * Partidas en que el jugador terminó con alguno de esos ítems. Solo tenemos el inventario final:
 * si lo compró y lo vendió antes de que terminara, no cuenta.
 */
export const gamesWithItem = (recs: Rec[], ids: number[]): number =>
  recs.filter((r) => r.p.items.some((id) => ids.includes(id))).length;
