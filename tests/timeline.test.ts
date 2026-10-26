import { describe, expect, it } from 'vitest';
import { recordsOf } from '../src/stats/aggregate';
import { activitySpan, byDay, byHour } from '../src/stats/timeline';
import { build, match } from './fixtures';

const at = (day: number, hour: number) => new Date(2026, 9, day, hour).getTime();
const NOW = at(10, 23);

describe('byDay', () => {
  const { matches, friends } = build([
    match([{ who: 'ana' }, { who: 'beto' }], { blueWins: true, start: at(10, 21) }),
    match([{ who: 'ana' }], { blueWins: false, start: at(10, 22) }),
    match([{ who: 'ana' }, { who: 'beto', team: 200 }], { start: at(8, 20) }), // guerra civil
    match([{ who: 'ana' }], { blueWins: true, start: at(1, 20) }), // fuera del rango
  ]);

  it('incluye días vacíos y cuenta cada partida del grupo una vez', () => {
    const days = byDay(matches, 3, NOW);
    expect(days.map((d) => [d.key, d.w, d.l])).toEqual([
      ['2026-10-08', 0, 0], // la guerra civil no cuenta como victoria ni derrota
      ['2026-10-09', 0, 0],
      ['2026-10-10', 1, 1],
    ]);
  });

  it('con registros de un jugador cuenta sus resultados', () => {
    const beto = recordsOf(matches, friends[1]);
    const days = byDay(matches, 3, NOW, beto);
    expect(days[0]).toMatchObject({ w: 0, l: 1 }); // beto perdió la guerra civil
    expect(days[2]).toMatchObject({ w: 1, l: 0 });
  });
});

describe('byHour', () => {
  it('agrupa por hora local', () => {
    const { matches } = build([
      match([{ who: 'ana' }], { blueWins: true, start: at(5, 2) }),
      match([{ who: 'ana' }], { blueWins: false, start: at(6, 2) }),
    ]);
    const hours = byHour(matches);
    expect(hours).toHaveLength(24);
    expect(hours[2]).toEqual({ key: 2, w: 1, l: 1 });
  });
});

describe('activitySpan', () => {
  it('va entre 7 y 30 días', () => {
    const { matches } = build([match([{ who: 'ana' }], { start: at(9, 20) })]);
    expect(activitySpan(matches, NOW)).toBe(7);
    const { matches: old } = build([match([{ who: 'ana' }], { start: NOW - 90 * 864e5 })]);
    expect(activitySpan(old, NOW)).toBe(30);
  });
});
