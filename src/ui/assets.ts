// URLs e imágenes de Data Dragon y CommunityDragon.

import { DD, RARITY } from '../config';
import type { Participant } from '../shared/types';
import { state } from '../state';
import type { AugmentInfo } from '../types';
import { esc } from './format';

type Champ = Pick<Participant, 'champId' | 'champ'>;

const champData = (p: Champ) => state.dd.champs.get(p.champId) ?? { id: p.champ, name: p.champ };

export const champName = (p: Champ): string => champData(p).name;
export const champIcon = (p: Champ): string => `${DD}/cdn/${state.dd.v}/img/champion/${champData(p).id}.png`;
export const splash = (p: Champ): string => `${DD}/cdn/img/champion/splash/${champData(p).id}_0.jpg`;
export const profileIcon = (id?: number): string => `${DD}/cdn/${state.dd.v}/img/profileicon/${id ?? 29}.png`;

export function itemImgs(p: Participant): string {
  return p.items
    .slice(0, 6)
    .map((id) => (id ? `<img src="${DD}/cdn/${state.dd.v}/img/item/${id}.png" alt="">` : '<i></i>'))
    .join('');
}

export function spellImg(key: number): string {
  const id = state.dd.spells.get(key);
  return id ? `<img src="${DD}/cdn/${state.dd.v}/img/spell/${id}.png" alt="">` : '<i></i>';
}

export const augInfo = (id: number): AugmentInfo =>
  state.augs.get(id) ?? { name: `Aumento ${id}`, icon: null, rarity: 'silver' };

export function augImg(id: number): string {
  const a = augInfo(id);
  return a.icon
    ? `<img class="aug ${a.rarity}" src="${a.icon}" title="${esc(a.name)} (${RARITY[a.rarity]})" alt="${esc(a.name)}">`
    : `<i class="aug ${a.rarity}" title="${esc(a.name)}"></i>`;
}

export const augImgs = (p: Participant): string => (p.augments ?? []).map(augImg).join('');
