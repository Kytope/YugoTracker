// Tipos de la página: los datos crudos de shared/types enriquecidos con los amigos.

import type { Match, Participant, PlayerInfo } from './shared/types';
import type { Badge } from './stats/mvp';

export interface Friend extends PlayerInfo {
  slug: string;
  color: string;
  icon?: number;
  level?: number;
}

/** Un participante de una partida, marcado si es del grupo. */
export interface GamePlayer extends Participant {
  friend: Friend | null;
  /** Puntaje de desempeño 0–10 dentro de su partida (stats/mvp.ts). */
  score: number;
  /** MVP = mejor del equipo ganador; ACE = mejor del perdedor. */
  badge: Badge | null;
}

/** Participante que sí es del grupo. */
export interface FriendPlayer extends GamePlayer {
  friend: Friend;
}

export interface Game extends Omit<Match, 'participants'> {
  participants: GamePlayer[];
  /** Los participantes que son del grupo. */
  mine: FriendPlayer[];
}

/** Una partida vista desde un amigo. */
export interface Rec {
  m: Game;
  p: FriendPlayer;
}

export type Rarity = 'silver' | 'gold' | 'prism';

export interface AugmentInfo {
  name: string;
  icon: string | null;
  rarity: Rarity;
}

export interface DDragon {
  v: string | null;
  champs: Map<number, { id: string; name: string }>;
  spells: Map<number, string>;
  /** Nombre de cada ítem por id. */
  items: Map<number, string>;
}
