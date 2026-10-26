import { CDRAGON } from '../config';
import type { AugmentInfo, Rarity } from '../types';
import { getJSON } from './load';

interface CDragonAugment {
  id: number;
  nameTRA: string;
  augmentSmallIconPath?: string;
  rarity: string;
}

const RARITIES: Record<string, Rarity> = { kSilver: 'silver', kGold: 'gold', kPrismatic: 'prism' };

// Nombres e íconos de aumentos (ARAM: Caos usa el mismo catálogo que Arena) desde CommunityDragon.
export async function loadAugments(): Promise<Map<number, AugmentInfo>> {
  try {
    const list = await getJSON<CDragonAugment[]>(`${CDRAGON}/global/es_mx/v1/cherry-augments.json`);
    return new Map(list.map((a) => [a.id, {
      name: a.nameTRA,
      icon: a.augmentSmallIconPath
        ? `${CDRAGON}/global/default/${a.augmentSmallIconPath.replace('/lol-game-data/assets/', '').toLowerCase()}`
        : null,
      rarity: RARITIES[a.rarity] ?? 'silver',
    }]));
  } catch {
    return new Map();
  }
}
