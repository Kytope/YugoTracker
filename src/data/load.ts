import { COLORS } from '../config';
import type { MatchData } from '../shared/types';
import type { Friend, FriendPlayer, Game, GamePlayer } from '../types';
import { nameKey, slugify } from '../ui/format';

export async function getJSON<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(url);
  return res.json() as Promise<T>;
}

export async function loadData(): Promise<MatchData | null> {
  try {
    const res = await fetch('data/matches.json', { cache: 'no-store' });
    return res.ok ? ((await res.json()) as MatchData) : null;
  } catch {
    return null;
  }
}

/** Arma los amigos y las partidas del grupo (sin remakes, más recientes primero). */
export function prepare(data: MatchData): { friends: Friend[]; matches: Game[] } {
  const used = new Set<string>();
  const friends: Friend[] = data.players.map((pl, i) => {
    let slug = slugify(pl.alias || pl.gameName) || `p${i}`;
    while (used.has(slug)) slug += i;
    used.add(slug);
    return { ...pl, slug, color: COLORS[i % COLORS.length] };
  });
  const byPuuid = new Map(friends.map((f) => [f.puuid, f]));
  const byName = new Map(friends.map((f) => [nameKey(f.gameName, f.tagLine), f]));

  const matches: Game[] = data.matches
    .filter((m) => !m.remake)
    .map((m) => {
      const participants: GamePlayer[] = m.participants.map((p) => ({
        ...p,
        friend: byPuuid.get(p.puuid) ?? byName.get(nameKey(p.name, p.tag)) ?? null,
      }));
      const mine = participants.filter((p): p is FriendPlayer => p.friend !== null);
      return { ...m, participants, mine };
    })
    .filter((m) => m.mine.length)
    .sort((a, b) => b.start - a.start);

  for (const f of friends) {
    const last = matches.flatMap((m) => m.mine).find((p) => p.friend === f);
    f.icon = last?.icon;
    f.level = last?.slvl;
  }
  return { friends, matches };
}
