import { CDRAGON } from '../config';
import type { AugmentInfo, Rarity } from '../types';
import { getJSON } from './load';

interface CDragonAugment {
  id: number;
  nameTRA: string;
  augmentNameId: string;
  augmentSmallIconPath?: string;
  rarity: string;
}

const RARITIES: Record<string, Rarity> = { kSilver: 'silver', kGold: 'gold', kPrismatic: 'prism' };

/**
 * Algunos aumentos de eventos traen un nombre de relleno ("GoH_PentakillAug_Generic_BlankName" o vacío).
 * En ese caso se arma uno legible desde su id interno.
 */
function cleanName(name: string, nameId: string): string {
  if (name.trim() && !name.includes('_')) return name;
  if (/pentakill/i.test(nameId)) return 'Pentakill';
  return nameId.replace(/^(ARAM|GoH)_/, '').replace(/_/g, ' ').replace(/([a-z])([A-Z])/g, '$1 $2').trim() || 'Aumento';
}

// Nombres e íconos de aumentos (ARAM: Caos usa el mismo catálogo que Arena) desde CommunityDragon.
export async function loadAugments(): Promise<Map<number, AugmentInfo>> {
  try {
    const list = await getJSON<CDragonAugment[]>(`${CDRAGON}/global/es_mx/v1/cherry-augments.json`);
    return new Map(list.map((a) => [a.id, {
      name: cleanName(a.nameTRA, a.augmentNameId),
      icon: a.augmentSmallIconPath
        ? `${CDRAGON}/global/default/${a.augmentSmallIconPath.replace('/lol-game-data/assets/', '').toLowerCase()}`
        : null,
      rarity: RARITIES[a.rarity] ?? 'silver',
    }]));
  } catch {
    return new Map();
  }
}
