import { state } from '../state';
import type { Game } from '../types';
import { empty, moreButton } from '../ui/components';
import { matchRow } from '../ui/match';

export function viewMatches(ms: Game[]): string {
  if (!ms.length) return empty();
  return `
    <section class="hero">
      <h1>Partidas del grupo <span class="count">${ms.length}</span></h1>
    </section>
    <div class="matches">${ms.slice(0, state.limit).map((m) => matchRow(m, null)).join('')}</div>
    ${moreButton(ms.length)}`;
}
