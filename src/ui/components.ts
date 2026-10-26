// Piezas de HTML que se repiten entre vistas.

import type { Participant } from '../shared/types';
import { state } from '../state';
import type { Friend } from '../types';
import { champIcon, champName } from './assets';
import { esc } from './format';

/** Cifra con etiqueta y detalle opcional (resúmenes del inicio y del perfil). */
export const stat = (label: string, value: string | number, sub = ''): string =>
  `<div class="stat"><span class="stat-label">${label}</span><b class="stat-value">${value}</b>${sub ? `<span class="stat-sub">${sub}</span>` : ''}</div>`;

export const champCell = (p: Participant): string =>
  `<span class="champ-cell"><img class="ci sm" src="${champIcon(p)}" alt="">${esc(champName(p))}</span>`;

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
