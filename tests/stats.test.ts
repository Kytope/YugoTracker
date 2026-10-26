import { describe, expect, it } from 'vitest';
import { agg, byChamp, longestRun, recordsOf, streak } from '../src/stats/aggregate';
import { byAugment } from '../src/stats/augments';
import { computeAwards } from '../src/stats/awards';
import { bySquadSize, combos, matesOf, rivalries, squadStats } from '../src/stats/synergy';
import { build, match } from './fixtures';

describe('prepare', () => {
  it('descarta remakes y partidas sin amigos, y ordena de más reciente a más antigua', () => {
    const old = match([{ who: 'ana' }], { start: 1000 });
    const recent = match([{ who: 'ana' }], { start: 2000 });
    const remake = { ...match([{ who: 'ana' }]), remake: true };
    const strangers = match([{ who: 'zzz' }]);
    const { matches } = build([old, remake, strangers, recent]);
    expect(matches.map((m) => m.id)).toEqual([recent.id, old.id]);
  });

  it('reconoce a un amigo por nombre#tag si el puuid no coincide', () => {
    const { matches } = build([match([{ who: 'otro-puuid', name: 'Ana', tag: 'las' }])]);
    expect(matches[0].mine[0].friend.alias).toBe('Ana');
  });
});

describe('agg', () => {
  it('suma totales y calcula winrate, KDA y daño por minuto', () => {
    const { matches } = build([
      match([{ who: 'ana', k: 10, d: 2, a: 4, dmg: 60000 }], { blueWins: true, duration: 600 }),
      match([{ who: 'ana', k: 0, d: 8, a: 6, dmg: 0 }], { blueWins: false, duration: 600 }),
    ]);
    const s = agg(recordsOf(matches));
    expect(s.games).toBe(2);
    expect(s.wins).toBe(1);
    expect(s.wr).toBe(0.5);
    expect(s.kda).toBe((10 + 0 + 4 + 6) / 10);
    expect(s.dpm).toBe(60000 / 20);
  });

  it('con cero muertes el KDA no divide por cero', () => {
    const { matches } = build([match([{ who: 'ana', k: 3, d: 0, a: 7 }])]);
    expect(agg(recordsOf(matches)).kda).toBe(10);
  });
});

describe('rachas', () => {
  // recordsOf entrega de la más reciente a la más antigua.
  const results = [true, true, false, true, true, true, false, false];
  const { matches, friends } = build(
    results.map((win, i) => match([{ who: 'ana' }], { blueWins: win, start: 10_000 - i })),
  );
  const recs = recordsOf(matches, friends[0]);

  it('racha actual', () => expect(streak(recs)).toEqual({ win: true, n: 2 }));
  it('racha de victorias más larga', () => expect(longestRun(recs, true)).toBe(3));
  it('racha de derrotas más larga', () => expect(longestRun(recs, false)).toBe(2));
});

describe('byChamp', () => {
  it('agrupa por campeón y ordena por partidas', () => {
    const { matches } = build([
      match([{ who: 'ana', champId: 1 }]),
      match([{ who: 'ana', champId: 2 }]),
      match([{ who: 'ana', champId: 2 }]),
    ]);
    const champs = byChamp(recordsOf(matches));
    expect(champs.map((c) => [c.p.champId, c.s.games])).toEqual([[2, 2], [1, 1]]);
  });
});

describe('sinergias', () => {
  const { matches, friends } = build([
    match([{ who: 'ana' }, { who: 'beto' }, { who: 'cata' }], { blueWins: true }),
    match([{ who: 'ana' }, { who: 'beto' }], { blueWins: false }),
    match([{ who: 'ana' }, { who: 'cata', team: 200 }], { blueWins: true }),
    match([{ who: 'dani' }]),
  ]);
  const [ana, beto, cata] = friends;

  it('combos', () => {
    expect(combos([1, 2, 3], 2)).toEqual([[1, 2], [1, 3], [2, 3]]);
  });

  it('dúos: solo cuenta a los del mismo equipo', () => {
    const duos = squadStats(matches, 2, friends);
    const anaBeto = duos.find((d) => d.friends[0] === ana && d.friends[1] === beto);
    const anaCata = duos.find((d) => d.friends[0] === ana && d.friends[1] === cata);
    expect(anaBeto).toMatchObject({ n: 2, w: 1, wr: 0.5 });
    expect(anaCata).toMatchObject({ n: 1, w: 1 });
  });

  it('tríos', () => {
    expect(squadStats(matches, 3, friends)).toHaveLength(1);
  });

  it('rivalidades: amigos en equipos contrarios', () => {
    expect(rivalries(matches, friends)).toEqual([{ a: ana, b: cata, aw: 1, bw: 0 }]);
  });

  it('winrate por tamaño del grupo', () => {
    const sizes = bySquadSize(matches);
    expect(sizes[0]).toEqual({ n: 1, games: 3, wins: 2 }); // ana sola, cata sola, dani solo
    expect(sizes[1]).toEqual({ n: 2, games: 1, wins: 0 });
    expect(sizes[2]).toEqual({ n: 3, games: 1, wins: 1 });
  });

  it('compañeros de un jugador', () => {
    const mates = matesOf(ana, matches, friends);
    expect(mates.find((x) => x.g === beto)).toMatchObject({ n: 2, w: 1, vs: 0 });
    expect(mates.find((x) => x.g === cata)).toMatchObject({ n: 1, w: 1, vs: 1, vsW: 1 });
  });
});

describe('aumentos', () => {
  it('cuenta veces, winrate y quién lo elige', () => {
    const { matches, friends } = build([
      match([{ who: 'ana', augments: [7, 8] }, { who: 'beto', augments: [7] }], { blueWins: true }),
      match([{ who: 'ana', augments: [7] }], { blueWins: false }),
    ]);
    const [top] = byAugment(recordsOf(matches));
    expect(top).toMatchObject({ id: 7, n: 3, w: 2 });
    expect(top.who.get(friends[0])).toBe(2);
  });
});

describe('logros', () => {
  it('los premios por promedio exigen el mínimo de partidas', () => {
    const many = Array.from({ length: 5 }, (_, i) => match([{ who: 'ana', k: 5 }], { start: i }));
    const { matches, friends } = build([...many, match([{ who: 'beto', k: 40 }])]);
    const [kills] = computeAwards([{ id: 'k', title: '', desc: '', avg: true, value: (s) => s.avgK }], matches, friends);
    expect(kills.ranking.map((r) => r.f.alias)).toEqual(['Ana']);
  });

  it('los premios "low" ganan con el valor más bajo', () => {
    const { matches, friends } = build([
      match([{ who: 'ana', d: 9 }, { who: 'beto', d: 1 }]),
    ]);
    const [deaths] = computeAwards([{ id: 'd', title: '', desc: '', low: true, value: (s) => s.avgD }], matches, friends);
    expect(deaths.ranking[0].f.alias).toBe('Beto');
  });
});
