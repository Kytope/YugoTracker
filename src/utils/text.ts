/** Texto para comparar en búsquedas: minúsculas, sin tildes ni signos ("Cho'Gath" → "chogath"). */
export const normalize = (s: string): string =>
  s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9#]+/g, '');

/** Puntaje de coincidencia: 0 = no coincide; más alto = mejor (empieza igual > contiene). */
export function matchScore(haystack: string, query: string): number {
  const h = normalize(haystack);
  const q = normalize(query);
  if (!q) return 0;
  if (h === q) return 3;
  if (h.startsWith(q)) return 2;
  return h.includes(q) ? 1 : 0;
}
