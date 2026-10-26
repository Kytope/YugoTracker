import { RARITY } from '../config';
import { state } from '../state';
import { recordsOf } from '../stats/aggregate';
import { byAugment, type AugmentStat } from '../stats/augments';
import type { Game, Rarity } from '../types';
import { augImg, augInfo } from '../ui/assets';
import { chip, empty, sortHeader } from '../ui/components';
import { esc, pct, wrClass } from '../ui/format';

const MIN = 3;
const RARITY_ORDER: Record<Rarity, number> = { silver: 1, gold: 2, prism: 3 };
const NUMERIC: Record<string, (e: AugmentStat) => number> = {
  n: (e) => e.n,
  wr: (e) => e.wr,
  rarity: (e) => RARITY_ORDER[augInfo(e.id).rarity],
};

export function viewAugments(ms: Game[]): string {
  const list = byAugment(recordsOf(ms));
  if (!list.length) return empty('Sin aumentos en este periodo.');
  const ranked = list.filter((e) => e.n >= MIN);
  const best = [...ranked].sort((a, b) => b.wr - a.wr || b.n - a.n)[0];
  const worst = [...ranked].sort((a, b) => a.wr - b.wr || b.n - a.n)[0];
  const prism = list.find((e) => augInfo(e.id).rarity === 'prism');

  const rows = [...list];
  if (state.augSort === 'name') rows.sort((a, b) => augInfo(a.id).name.localeCompare(augInfo(b.id).name));
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
        ${augCard('Mejor winrate', best, `mínimo ${MIN} veces`)}
        ${augCard('Peor winrate', worst, `mínimo ${MIN} veces`)}
      </div>
    </section>
    <section class="panel">
      <h2 class="panel-title">Aumentos elegidos <span class="count">${list.length}</span></h2>
      ${augTable(rows, true)}
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

/** `full`: con orden por columnas y quién lo elige (página de aumentos); sin él, versión del perfil. */
export function augTable(list: AugmentStat[], full: boolean): string {
  const th = full ? sortHeader('augsort', state.augSort) : (_: string, label: string) => `<th>${label}</th>`;
  return `<table class="tbl">
    <thead><tr>${th('name', 'Aumento')}${th('rarity', 'Rareza')}${th('n', 'Veces')}${th('wr', 'Winrate')}${full ? '<th>Lo eligen</th>' : ''}</tr></thead>
    <tbody>${list.map((e) => {
      const info = augInfo(e.id);
      return `<tr>
      <td><span class="champ-cell">${augImg(e.id)}${esc(info.name)}</span></td>
      <td><span class="rarity ${info.rarity}">${RARITY[info.rarity]}</span></td>
      <td>${e.n}</td>
      <td class="${e.n >= MIN ? wrClass(e.wr) : ''}">${pct(e.wr)} <small class="muted">${e.w}V ${e.n - e.w}D</small></td>
      ${full ? `<td class="who-list">${[...e.who].sort((a, b) => b[1] - a[1]).map(([f, n]) => chip(f, n)).join('')}</td>` : ''}
    </tr>`;
    }).join('')}</tbody>
  </table>`;
}
