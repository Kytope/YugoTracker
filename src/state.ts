import { PAGE_SIZE, PERIODS, type Period } from './config';
import type { AugmentInfo, DDragon, Friend, Game } from './types';
import { store } from './utils/storage';

const saved = store('period');

export const state = {
  dd: { v: null, champs: new Map(), spells: new Map() } as DDragon,
  augs: new Map<number, AugmentInfo>(),
  friends: [] as Friend[],
  matches: [] as Game[],
  byId: new Map<string, Game>(),
  period: (saved && saved in PERIODS ? saved : 'all') as Period,
  champSort: 'games',
  augSort: 'n',
  /** Métrica de la comparativa del inicio y del gráfico de rendimiento del perfil. */
  compareMetric: 'dpm',
  perfMetric: 'dmg',
  limit: PAGE_SIZE,
};

export function currentMatches(): Game[] {
  const days = PERIODS[state.period].days;
  if (!days) return state.matches;
  const cutoff = Date.now() - days * 864e5;
  return state.matches.filter((m) => m.start >= cutoff);
}
