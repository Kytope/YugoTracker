import { state } from '../state';
import { byChamp, recordsOf, type ChampGroup } from '../stats/aggregate';
import type { Game } from '../types';
import { champName } from '../ui/assets';
import { champCell, chip, sortHeader } from '../ui/components';
import { pct, short, wrClass } from '../ui/format';

const NUMERIC: Record<string, (c: ChampGroup) => number> = {
  games: (c) => c.s.games,
  wr: (c) => c.s.wr,
  kda: (c) => c.s.kda,
  dmg: (c) => c.s.avgDmg,
};

export function viewChamps(ms: Game[]): string {
  const rows = byChamp(recordsOf(ms)).map((c) => ({
    ...c,
    players: state.friends
      .map((f) => ({ f, n: c.recs.filter((r) => r.p.friend === f).length }))
      .filter((x) => x.n)
      .sort((a, b) => b.n - a.n),
  }));
  const sort = state.champSort;
  if (sort === 'name') rows.sort((a, b) => champName(a.p).localeCompare(champName(b.p)));
  else {
    const key = NUMERIC[sort] ?? NUMERIC.games;
    rows.sort((a, b) => key(b) - key(a) || b.s.games - a.s.games);
  }
  const th = sortHeader('sort', sort);
  return `<section class="panel">
    <h2 class="panel-title">Campeones jugados <span class="count">${rows.length}</span></h2>
    <table class="tbl">
      <thead><tr>${th('name', 'Campeón')}${th('games', 'Partidas')}${th('wr', 'Winrate')}${th('kda', 'KDA')}${th('dmg', 'Daño prom.')}<th>Lo juegan</th></tr></thead>
      <tbody>${rows.map((c) => `<tr>
        <td>${champCell(c.p)}</td>
        <td>${c.s.games}</td>
        <td class="${wrClass(c.s.wr)}">${pct(c.s.wr)}</td>
        <td>${c.s.kda.toFixed(2)}</td>
        <td>${short(c.s.avgDmg)}</td>
        <td class="who-list">${c.players.map((x) => chip(x.f, x.n)).join('')}</td>
      </tr>`).join('')}</tbody>
    </table>
  </section>`;
}
