// Formato de public/data/matches.json. Lo escribe scripts/sync.ts y lo lee la página.

export type TeamId = 100 | 200;

export interface Participant {
  puuid: string;
  name: string;
  tag: string;
  icon?: number;
  /** Solo en datos antiguos de la API pública; el cliente no lo entrega. */
  slvl?: number;
  /** Nombre o id del campeón como texto; el id numérico está en champId. */
  champ: string;
  champId: number;
  level: number;
  team: TeamId;
  win: boolean;
  k: number;
  d: number;
  a: number;
  dmg: number;
  taken: number;
  heal: number;
  mitigated?: number;
  gold: number;
  cs: number;
  cc: number;
  doubles: number;
  triples: number;
  quadras: number;
  pentas: number;
  /** item0..item6; 0 = espacio vacío. */
  items: number[];
  spells: number[];
  augments: number[];
}

export interface Match {
  id: string;
  /** Epoch en ms. */
  start: number;
  /** Segundos. */
  duration: number;
  version: string;
  queue: number;
  mode: string;
  remake: boolean;
  participants: Participant[];
}

export interface PlayerInfo {
  puuid: string;
  riotId: string;
  gameName: string;
  tagLine: string;
  alias: string;
}

export interface MatchData {
  updatedAt: number | null;
  players: PlayerInfo[];
  matches: Match[];
}

/** config/players.json */
export interface PlayersConfig {
  players: (string | { riotId: string; alias?: string })[];
}
