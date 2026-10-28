// Piezas de HTML que se repiten entre vistas.

import type { Participant } from '../shared/types';
import { state } from '../state';
import type { Friend } from '../types';
import { champIcon, champName } from './assets';
import { esc } from './format';

/** Cifra con etiqueta y detalle opcional (resúmenes del inicio y del perfil). */
export const stat = (label: string, value: string | number, sub = ''): string =>
  `<div class="stat"><span class="stat-label">${label}</span><b class="stat-value">${value}</b>${sub ? `<span class="stat-sub">${sub}</span>` : ''}</div>`;

/** Campeón con ícono; enlaza a su página. No usar dentro de un <button> (fila de partida). */
export const champCell = (p: Pick<Participant, 'champId' | 'champ'>): string =>
  `<a class="champ-cell" href="#/c/${p.champId}"><img class="ci sm" src="${champIcon(p)}" alt="">${esc(champName(p))}</a>`;

/**
 * Caja de búsqueda que filtra la vista. main.ts guarda el valor en `state[key]` (o en el filtro de
 * partidas) y vuelve a dibujar; el foco y el cursor se restauran por el id.
 */
export const searchBox = (key: string, value: string, placeholder: string): string =>
  `<label class="search-box"><svg aria-hidden="true" viewBox="0 0 16 16"><circle cx="7" cy="7" r="4.5"/><path d="m10.5 10.5 3 3"/></svg>
    <input id="f-${key}" type="search" data-filter="${key}" value="${esc(value)}" placeholder="${placeholder}" autocomplete="off" spellcheck="false"></label>`;

export const who = (f: Friend): string =>
  `<a class="who" href="#/p/${f.slug}" style="--c:${f.color}">${esc(f.alias)}</a>`;

export const chip = (f: Friend, n: number): string =>
  `<a class="chip" href="#/p/${f.slug}" style="--c:${f.color}">${esc(f.alias)} <b>${n}</b></a>`;

export const moreButton = (total: number): string =>
  total > state.limit ? `<button class="more" data-more="1">Mostrar más (${total - state.limit})</button>` : '';

export const empty = (text = 'Sin partidas en este periodo.'): string => `<p class="empty">${text}</p>`;

export function multiBadge(p: Participant): string {
  const t = p.pentas ? 'PENTA' : p.quadras ? 'QUADRA' : p.triples ? 'TRIPLE' : '';
  return t ? `<span class="badge ${t.toLowerCase()}">${t}</span>` : '';
}

/** Grupo de botones para elegir una opción (métricas de los gráficos). El clic lo maneja main.ts. */
export const segmented = (attr: string, current: string, options: [string, string][]): string =>
  `<div class="seg" role="group">${options
    .map(([key, label]) => `<button type="button" data-${attr}="${key}" aria-pressed="${key === current}" class="${key === current ? 'on' : ''}">${label}</button>`)
    .join('')}</div>`;

/** Encabezado de tabla ordenable; el clic lo maneja main.ts por el atributo data-*. */
export const sortHeader = (attr: string, current: string) => (key: string, label: string): string =>
  `<th><button class="sort ${current === key ? 'on' : ''}" data-${attr}="${key}">${label}</button></th>`;
