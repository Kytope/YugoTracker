import type { Rarity } from './types';

export const DD = 'https://ddragon.leagueoflegends.com';
export const CDRAGON = 'https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data';

export const RARITY: Record<Rarity, string> = { silver: 'Plata', gold: 'Oro', prism: 'Prismático' };

export const PERIODS = {
  all: { label: 'Todo', days: 0 },
  30: { label: 'Últimos 30 días', days: 30 },
  7: { label: 'Últimos 7 días', days: 7 },
} as const;
export type Period = keyof typeof PERIODS;

// Orden fijo, validado para daltonismo sobre el fondo oscuro. El color sigue al jugador, nunca a su posición.
export const COLORS = ['#3987e5', '#d95926', '#199e70', '#c98500', '#d55181', '#008300', '#9085e9', '#e66767'];

export const PAGE_SIZE = 40;
