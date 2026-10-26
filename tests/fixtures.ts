// Constructores de datos de prueba: partidas mínimas con solo lo que importa en cada test.

import { prepare } from '../src/data/load';
import type { Match, MatchData, Participant, PlayerInfo, TeamId } from '../src/shared/types';

export const PLAYERS: PlayerInfo[] = ['Ana', 'Beto', 'Cata', 'Dani'].map((n) => ({
  puuid: n.toLowerCase(),
  riotId: `${n}#LAS`,
  gameName: n,
  tagLine: 'LAS',
  alias: n,
}));

type Line = { who: string; team?: TeamId; win?: boolean } & Partial<Participant>;

export function participant({ who, team = 100, win, ...rest }: Line): Participant {
  return {
    puuid: who, name: who, tag: 'LAS', champ: 'Ahri', champId: 103, level: 18,
    team, win: win ?? team === 100,
    k: 5, d: 5, a: 10, dmg: 30000, taken: 20000, heal: 5000, gold: 15000, cs: 50, cc: 10,
    doubles: 0, triples: 0, quadras: 0, pentas: 0, items: [0, 0, 0, 0, 0, 0, 0], spells: [4, 32], augments: [],
    ...rest,
  };
}

let seq = 0;

/** Partida donde el equipo 100 gana si `blueWins`. Los amigos se indican por puuid en minúsculas. */
export function match(lines: Line[], opts: { blueWins?: boolean; start?: number; duration?: number } = {}): Match {
  const blueWins = opts.blueWins ?? true;
  seq++;
  return {
    id: `T_${seq}`,
    start: opts.start ?? Date.UTC(2026, 9, 1, 20) + seq * 36e5,
    duration: opts.duration ?? 900,
    version: '16.21.1.1',
    queue: 2400,
    mode: 'KIWI',
    remake: false,
    participants: lines.map((l) => participant({ ...l, win: l.win ?? ((l.team ?? 100) === 100) === blueWins })),
  };
}

export function build(matches: Match[]) {
  const data: MatchData = { updatedAt: 0, players: PLAYERS, matches };
  return prepare(data);
}
