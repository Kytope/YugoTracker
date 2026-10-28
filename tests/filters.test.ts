import { describe, expect, it } from 'vitest';
import { EMPTY_FILTER, filterGames } from '../src/stats/filters';
import type { GamePlayer } from '../src/types';
import { matchScore, normalize } from '../src/utils/text';
import { build, match } from './fixtures';

const NAMES: Record<number, string> = { 31: "Cho'Gath", 103: 'Ahri', 222: 'Jinx' };
const champName = (p: GamePlayer) => NAMES[p.champId];

describe('normalize / matchScore', () => {
  it('ignora mayúsculas, tildes y signos', () => {
    expect(normalize("Cho'Gath")).toBe('chogath');
    expect(normalize('Ángel Díaz')).toBe('angeldiaz');
  });

  it('prioriza coincidencia exacta, luego prefijo, luego contiene', () => {
    expect(matchScore('Jinx', 'jinx')).toBe(3);
    expect(matchScore('Jinx', 'ji')).toBe(2);
    expect(matchScore("Cho'Gath", 'gath')).toBe(1);
    expect(matchScore('Ahri', 'zed')).toBe(0);
    expect(matchScore('Ahri', '')).toBe(0);
  });
});

describe('filterGames', () => {
  const { matches } = build([
    match([{ who: 'ana', champId: 31 }, { who: 'beto', champId: 103 }], { blueWins: true }),
    match([{ who: 'ana', champId: 222 }], { blueWins: false }),
    match([{ who: 'beto', champId: 31 }], { blueWins: false }),
  ]);
  const run = (f: Partial<typeof EMPTY_FILTER>) => filterGames(matches, { ...EMPTY_FILTER, ...f }, champName).length;

  it('sin filtros devuelve todo', () => expect(run({})).toBe(3));
  it('por campeón, sin importar tildes ni signos', () => expect(run({ q: 'chogath' })).toBe(2));
  it('por alias de amigo', () => expect(run({ q: 'beto' })).toBe(2));
  it('por jugador', () => expect(run({ player: 'ana' })).toBe(2));
  it('jugador + campeón: el campeón tiene que ser de ese jugador', () => {
    expect(run({ player: 'ana', q: 'ahri' })).toBe(0);
    expect(run({ player: 'beto', q: 'ahri' })).toBe(1);
  });
  it('por resultado', () => {
    expect(run({ result: 'w' })).toBe(1);
    expect(run({ result: 'l', player: 'ana' })).toBe(1);
  });
});
