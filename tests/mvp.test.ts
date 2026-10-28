import { describe, expect, it } from 'vitest';
import { scoreMatch } from '../src/stats/mvp';
import { participant } from './fixtures';

const line = (who: string, team: 100 | 200, win: boolean, extra = {}) => participant({ who, team, win, ...extra });

describe('scoreMatch', () => {
  it('el que más aporta del equipo ganador es MVP y el del perdedor es ACE', () => {
    const ps = [
      line('carry', 100, true, { k: 20, d: 2, a: 10, dmg: 60000 }),
      line('normal', 100, true, { k: 5, d: 6, a: 15, dmg: 25000 }),
      line('ace', 200, false, { k: 12, d: 8, a: 8, dmg: 50000 }),
      line('feeder', 200, false, { k: 1, d: 15, a: 3, dmg: 9000 }),
    ];
    const res = scoreMatch(ps);
    expect(res.map((r) => r.badge)).toEqual(['MVP', null, 'ACE', null]);
    expect(res[0].score).toBeGreaterThan(res[1].score);
    expect(res[3].score).toBeLessThan(res[2].score);
  });

  it('los puntajes quedan entre 0 y 10 con un decimal', () => {
    const ps = [line('a', 100, true, { k: 30, d: 0, a: 30, dmg: 99999, taken: 99999, heal: 99999, cc: 99 }), line('b', 200, false, { k: 0, d: 30, a: 0, dmg: 0, taken: 0, heal: 0, cc: 0 })];
    for (const { score } of scoreMatch(ps)) {
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(10);
      expect(Math.round(score * 10)).toBe(score * 10);
    }
  });

  it('un tanque que recibe y controla mucho puntúa aunque haga poco daño', () => {
    const ps = [
      line('tank', 100, true, { k: 2, d: 5, a: 25, dmg: 12000, taken: 90000, mitigated: 60000, cc: 80 }),
      line('nada', 100, true, { k: 2, d: 5, a: 5, dmg: 12000, taken: 15000, mitigated: 0, cc: 0 }),
      line('rival', 200, false, { k: 5, d: 5, a: 5, dmg: 30000 }),
    ];
    const [tank, nada] = scoreMatch(ps);
    expect(tank.score).toBeGreaterThan(nada.score + 1);
  });

  it('partida vacía o sin perdedores no rompe', () => {
    expect(scoreMatch([])).toEqual([]);
    const solo = scoreMatch([line('a', 100, true, { k: 0, d: 0, a: 0, dmg: 0, taken: 0, heal: 0, cc: 0 })]);
    expect(solo[0].badge).toBe('MVP');
  });
});
