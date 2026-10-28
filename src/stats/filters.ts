import type { Game, GamePlayer } from '../types';
import { normalize } from '../utils/text';

export interface MatchFilter {
  /** Texto libre: campeón o alias de algún amigo de la partida. */
  q: string;
  /** Slug de un amigo que tiene que estar en la partida ('' = cualquiera). */
  player: string;
  /** Resultado del amigo elegido (o del grupo): '' | 'w' | 'l'. */
  result: '' | 'w' | 'l';
}

export const EMPTY_FILTER: MatchFilter = { q: '', player: '', result: '' };

/**
 * Filtra partidas del grupo. `champName` traduce el campeón de un participante a su nombre
 * (viene de Data Dragon, por eso se inyecta).
 */
export function filterGames(ms: Game[], f: MatchFilter, champName: (p: GamePlayer) => string): Game[] {
  const q = normalize(f.q);
  return ms.filter((m) => {
    const focus = f.player ? m.mine.filter((p) => p.friend.slug === f.player) : m.mine;
    if (!focus.length) return false;
    if (f.result) {
      const won = f.result === 'w';
      if (!focus.some((p) => p.win === won)) return false;
    }
    if (q) {
      const hit = focus.some((p) => normalize(champName(p)).includes(q) || normalize(p.friend.alias).includes(q));
      if (!hit) return false;
    }
    return true;
  });
}
