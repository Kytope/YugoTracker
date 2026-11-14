// Catálogo de aumentos. Lo escribe scripts/sync.ts en public/data/augments.json (con los íconos en
// public/augments/) y lo lee la página, así no depende de CommunityDragon.

export type Rarity = 'silver' | 'gold' | 'prism';

export interface AugmentEntry {
  name: string;
  rarity: Rarity;
  /** true si `name` ya está en español (vino de CommunityDragon); si no, es el nombre del cliente. */
  es: boolean;
}

/** public/data/augments.json: id → aumento. El ícono está en public/augments/<id>.png. */
export type AugmentFile = Record<string, AugmentEntry>;

export const RARITIES: Record<string, Rarity> = { kSilver: 'silver', kGold: 'gold', kPrismatic: 'prism' };

/**
 * Algunos aumentos de eventos traen un nombre de relleno ("GoH_PentakillAug_Generic_BlankName" o vacío).
 * En ese caso se arma uno legible desde su id interno.
 */
export function cleanName(name: string | undefined, nameId: string): string {
  if (name?.trim() && !name.includes('_')) return name;
  if (/pentakill/i.test(nameId)) return 'Pentakill';
  return nameId.replace(/^(ARAM|GoH)_/, '').replace(/_/g, ' ').replace(/([a-z])([A-Z])/g, '$1 $2').trim() || 'Aumento';
}
