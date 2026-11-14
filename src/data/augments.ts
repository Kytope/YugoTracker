import { CDRAGON } from '../config';
import type { AugmentInfo, Rarity } from '../types';
import { store } from '../utils/storage';
import { getJSON } from './load';

const CACHE_KEY = 'augments-v1';

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

/** Última copia buena del catálogo, guardada en el navegador (sirve si CommunityDragon está caído). */
export function cachedAugments(): Map<number, AugmentInfo> {
  try {
    const raw = store(CACHE_KEY);
    return raw ? new Map(JSON.parse(raw) as [number, AugmentInfo][]) : new Map();
  } catch {
    return new Map();
  }
}

// Nombres e íconos de aumentos (ARAM: Caos usa el mismo catálogo que Arena) desde CommunityDragon.
// Devuelve null si no responde a tiempo; quien llama sigue con la copia guardada.
export async function loadAugments(): Promise<Map<number, AugmentInfo> | null> {
  try {
    const list = await getJSON<CDragonAugment[]>(`${CDRAGON}/global/es_mx/v1/cherry-augments.json`, 6000);
    const map = new Map<number, AugmentInfo>(list.map((a) => [a.id, {
      name: cleanName(a.nameTRA, a.augmentNameId),
      icon: a.augmentSmallIconPath
        ? `${CDRAGON}/global/default/${a.augmentSmallIconPath.replace('/lol-game-data/assets/', '').toLowerCase()}`
        : null,
      rarity: RARITIES[a.rarity] ?? 'silver',
    }]));
    store(CACHE_KEY, JSON.stringify([...map]));
    return map;
  } catch {
    return null;
  }
}
