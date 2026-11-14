import { RARITY } from '../config';
import { state } from '../state';
import { recordsOf } from '../stats/aggregate';
import { byAugment, type AugmentStat } from '../stats/augments';
import { adjustedWr, baseWinrate, PRIORS } from '../stats/bayes';
import type { Game, Rarity } from '../types';
import { augImg, augInfo } from '../ui/assets';
import { chip, empty, searchBox, segmented, sortHeader } from '../ui/components';
import { esc, pct, wrClass } from '../ui/format';
import { normalize } from '../utils/text';

const MIN = 3;
const RARITY_ORDER: Record<Rarity, number> = { silver: 1, gold: 2, prism: 3 };
const NUMERIC: Record<string, (e: AugmentStat) => number> = {
  n: (e) => e.n,
  wr: (e) => e.wr,
  rarity: (e) => RARITY_ORDER[augInfo(e.id).rarity],
};

export function viewAugments(ms: Game[]): string {
  const recs = recordsOf(ms);
  const list = byAugment(recs);
  if (!list.length) return empty('Sin aumentos en este periodo.');
  // Mejor/peor por winrate ajustado: un 4 de 4 ya no le gana a un 11 de 12.
  const base = baseWinrate(recs);
  const adj = (e: AugmentStat) => adjustedWr(e.w, e.n, base, PRIORS.augment);
  const best = [...list].sort((a, b) => adj(b) - adj(a) || b.n - a.n)[0];
  const worst = [...list].sort((a, b) => adj(a) - adj(b) || b.n - a.n)[0];
  const prism = list.find((e) => augInfo(e.id).rarity === 'prism');

  // Filtro por texto (`augQ`) y por rareza (`augRarity`).
  const q = normalize(state.augQ);
  const rows = list.filter((e) => {
    const info = augInfo(e.id);
    return (!q || normalize(info.name).includes(q)) && (!state.augRarity || info.rarity === state.augRarity);
  });
  const filtered = Boolean(q || state.augRarity);
  if (state.augSort === 'name') rows.sort((a, b) => augInfo(a.id).name.localeCompare(augInfo(b.id).name));
  else if (state.augSort === 'adj') rows.sort((a, b) => adj(b) - adj(a) || b.n - a.n);
  else {
    const key = NUMERIC[state.augSort] ?? NUMERIC.n;
    rows.sort((a, b) => key(b) - key(a) || b.n - a.n);
  }
  return `
    <section class="hero">
      <h1>Aumentos</h1>
      <div class="duo-cards">
        ${augCard('Más elegido', list[0])}
        ${augCard('Prismático favorito', prism)}
        ${augCard('Mejor winrate', best, `ajustado ${pct(adj(best))}`)}
        ${augCard('Peor winrate', worst, `ajustado ${pct(adj(worst))}`)}
      </div>
    </section>
    <section class="panel">
      <div class="panel-bar">
        <h2 class="panel-title">Aumentos elegidos <span class="count">${filtered ? `${rows.length} de ${list.length}` : list.length}</span></h2>
        <div class="toolbar tight">
          ${segmented('rarity', state.augRarity, [['', 'Todas'], ['silver', 'Plata'], ['gold', 'Oro'], ['prism', 'Prismático']])}
          ${searchBox('augQ', state.augQ, 'Buscar aumento…')}
        </div>
      </div>
      ${rows.length ? `<div class="table-scroll">${augTable(rows, true, base)}</div>` : '<p class="empty">Ningún aumento coincide con la búsqueda.</p>'}
    </section>`;
}

function augCard(title: string, e: AugmentStat | undefined, note = ''): string {
  if (!e) return `<div class="duo-card empty"><span class="label">${title}</span><p class="muted">Faltan partidas</p></div>`;
  return `<div class="duo-card">
    <span class="label">${title}</span>
    <div class="aug-big">${augImg(e.id)}<b>${esc(augInfo(e.id).name)}</b></div>
    <b class="rval">${pct(e.wr)}</b>
    <span class="muted">Elegido ${e.n} veces · ${e.w}V ${e.n - e.w}D${note ? ` · ${note}` : ''}</span>
  </div>`;
}

/**
 * `full`: con orden por columnas y quién lo elige (página de aumentos); sin él, versión del perfil.
 * `base`: winrate promedio hacia el que se ajusta la columna "Ajustado".
 */
export function augTable(list: AugmentStat[], full: boolean, base: number): string {
  const th = full ? sortHeader('augsort', state.augSort) : (_: string, label: string) => `<th>${label}</th>`;
  return `<table class="tbl">
    <thead><tr>${th('name', 'Aumento')}${th('rarity', 'Rareza')}${th('n', 'Veces')}${th('wr', 'Winrate')}${th('adj', 'Ajustado')}${full ? '<th>Lo eligen</th>' : ''}</tr></thead>
    <tbody>${list.map((e) => {
      const info = augInfo(e.id);
      return `<tr>
      <td><span class="champ-cell">${augImg(e.id)}${esc(info.name)}</span></td>
      <td><span class="rarity ${info.rarity}">${RARITY[info.rarity]}</span></td>
      <td>${e.n}</td>
      <td class="${e.n >= MIN ? wrClass(e.wr) : ''}">${pct(e.wr)} <small class="muted">${e.w}V ${e.n - e.w}D</small></td>
      <td class="${wrClass(adjustedWr(e.w, e.n, base, PRIORS.augment))}" title="Winrate sumando ${PRIORS.augment} partidas con el promedio del grupo">${pct(adjustedWr(e.w, e.n, base, PRIORS.augment))}</td>
      ${full ? `<td class="who-list">${[...e.who].sort((a, b) => b[1] - a[1]).map(([f, n]) => chip(f, n)).join('')}</td>` : ''}
    </tr>`;
    }).join('')}</tbody>
  </table>`;
}
