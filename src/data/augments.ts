import { CDRAGON } from '../config';
import { cleanName, RARITIES, type AugmentFile } from '../shared/augments';
import type { AugmentInfo } from '../types';
import { getJSON } from './load';

interface CDragonAugment {
  id: number;
  nameTRA: string;
  augmentNameId: string;
  augmentSmallIconPath?: string;
  rarity: string;
}

/**
 * Catálogo guardado por la sincronización junto a la página (public/data/augments.json + íconos en
 * public/augments/). Mapa vacío si todavía no existe.
 */
export async function loadAugments(): Promise<Map<number, AugmentInfo>> {
  try {
    const file = await getJSON<AugmentFile>('data/augments.json', 5000);
    return new Map(Object.entries(file).map(([id, a]) => [Number(id), { name: a.name, rarity: a.rarity, icon: `augments/${id}.png` }]));
  } catch {
    return new Map();
  }
}

/** Respaldo si el catálogo local no existe: CommunityDragon (puede estar caído; null si no responde). */
export async function loadRemoteAugments(): Promise<Map<number, AugmentInfo> | null> {
  try {
    const list = await getJSON<CDragonAugment[]>(`${CDRAGON}/global/es_mx/v1/cherry-augments.json`, 6000);
    return new Map(list.map((a) => [a.id, {
      name: cleanName(a.nameTRA, a.augmentNameId),
      icon: a.augmentSmallIconPath
        ? `${CDRAGON}/global/default/${a.augmentSmallIconPath.replace('/lol-game-data/assets/', '').toLowerCase()}`
        : null,
      rarity: RARITIES[a.rarity] ?? 'silver',
    }]));
  } catch {
    return null;
  }
}
