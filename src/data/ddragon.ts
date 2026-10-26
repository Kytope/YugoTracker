import { DD } from '../config';
import type { DDragon } from '../types';
import { getJSON } from './load';

interface DDList<T> {
  data: Record<string, T>;
}

/** Nombres en español e ids de imagen de campeones y hechizos de invocador. */
export async function loadDDragon(): Promise<DDragon> {
  try {
    const [v] = await getJSON<string[]>(`${DD}/api/versions.json`);
    const [champs, spells] = await Promise.all([
      getJSON<DDList<{ key: string; id: string; name: string }>>(`${DD}/cdn/${v}/data/es_MX/champion.json`),
      getJSON<DDList<{ key: string; id: string }>>(`${DD}/cdn/${v}/data/es_MX/summoner.json`),
    ]);
    return {
      v,
      champs: new Map(Object.values(champs.data).map((c) => [Number(c.key), { id: c.id, name: c.name }])),
      spells: new Map(Object.values(spells.data).map((s) => [Number(s.key), s.id])),
    };
  } catch {
    return { v: null, champs: new Map(), spells: new Map() };
  }
}
