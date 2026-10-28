import { state } from '../state';
import { filterGames } from '../stats/filters';
import type { Game } from '../types';
import { champName } from '../ui/assets';
import { empty, moreButton, searchBox, segmented } from '../ui/components';
import { esc } from '../ui/format';
import { matchRow } from '../ui/match';

export function viewMatches(ms: Game[]): string {
  if (!ms.length) return empty();
  const f = state.matchFilter;
  const list = filterGames(ms, f, champName);
  const focus = f.player ? state.friends.find((x) => x.slug === f.player) : undefined;
  const active = Boolean(f.q || f.player || f.result);

  return `
    <section class="hero">
      <h1>Partidas del grupo <span class="count">${active ? `${list.length} de ${ms.length}` : ms.length}</span></h1>
    </section>
    <div class="toolbar">
      ${searchBox('q', f.q, 'Campeón o jugador…')}
      <select data-filter="player" id="f-player" aria-label="Jugador">
        <option value="">Todos los jugadores</option>
        ${state.friends.map((x) => `<option value="${x.slug}" ${x.slug === f.player ? 'selected' : ''}>${esc(x.alias)}</option>`).join('')}
      </select>
      ${segmented('result', f.result, [['', 'Todas'], ['w', 'Victorias'], ['l', 'Derrotas']])}
      ${active ? '<button type="button" class="link-btn" data-clear="matches">Limpiar filtros</button>' : ''}
    </div>
    ${list.length
      ? `<div class="matches">${list.slice(0, state.limit).map((m) => matchRow(m, focus ? m.mine.find((p) => p.friend === focus) ?? null : null)).join('')}</div>
         ${moreButton(list.length)}`
      : empty('Ninguna partida coincide con los filtros.')}`;
}
