// Descarga las partidas de ARAM: Caos (queueId 2400) de cada amigo desde el cliente de League
// abierto en este PC y las guarda en public/data/matches.json. Es incremental.
//
// Se usa la API local del cliente (LCU) porque Riot no expone ARAM: Caos en su API pública.
//
//   npm run sync               sincroniza (avisa con error si el cliente está cerrado)
//   npm run sync -- --auto     modo tarea programada: cliente cerrado no es error
//   npm run sync -- --full     no corta en la primera partida ya conocida

import { execSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import https from 'node:https';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Match, MatchData, Participant, PlayerInfo, PlayersConfig, TeamId } from '../src/shared/types';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PLAYERS_FILE = path.join(ROOT, 'config', 'players.json');
const DATA_FILE = path.join(ROOT, 'public', 'data', 'matches.json');

const QUEUE_ID = Number(process.env.QUEUE_ID || 2400); // 2400 = ARAM: Caos (Mayhem)
const MAX_MATCHES = Number(process.env.MAX_MATCHES_PER_PLAYER || 300);
const PAGE = 20;
const FULL = process.argv.includes('--full');
const AUTO = process.argv.includes('--auto');

// ---------- Formato del cliente (solo los campos que usamos) ----------

interface LcuPlayer {
  puuid: string;
  gameName?: string;
  summonerName?: string;
  tagLine?: string;
  profileIcon?: number;
}

interface LcuStats {
  win: boolean;
  kills: number;
  deaths: number;
  assists: number;
  champLevel: number;
  totalDamageDealtToChampions: number;
  totalDamageTaken: number;
  totalHeal: number;
  damageSelfMitigated: number;
  goldEarned: number;
  totalMinionsKilled: number;
  neutralMinionsKilled: number;
  timeCCingOthers: number;
  doubleKills: number;
  tripleKills: number;
  quadraKills: number;
  pentaKills: number;
  gameEndedInEarlySurrender: boolean;
  [key: `item${number}` | `playerAugment${number}`]: number;
}

interface LcuGame {
  gameId: number;
  gameCreation: number;
  gameDuration: number;
  gameVersion: string;
  gameMode: string;
  queueId: number;
  endOfGameResult: string;
  participantIdentities: { participantId: number; player: LcuPlayer }[];
  participants: { participantId: number; championId: number; teamId: TeamId; spell1Id: number; spell2Id: number; stats: LcuStats }[];
}

interface LcuHistory {
  games?: { games?: Pick<LcuGame, 'gameId' | 'queueId'>[] };
}

// ---------- Cliente de League ----------

interface Client {
  port: string;
  password: string;
}

function findClient(): Client | null {
  const dirs = [process.env.LEAGUE_DIR, 'C:/Riot Games/League of Legends', 'D:/Riot Games/League of Legends'].filter(Boolean) as string[];
  for (const dir of dirs) {
    const file = path.join(dir, 'lockfile');
    if (existsSync(file)) {
      const [, , port, password] = readFileSync(file, 'utf8').split(':');
      return { port, password };
    }
  }
  // Instalación en otra ruta: se saca el puerto y la clave de la línea de comandos del proceso.
  try {
    const cmd = execSync(
      `powershell -NoProfile -Command "(Get-CimInstance Win32_Process -Filter \\"Name='LeagueClientUx.exe'\\").CommandLine"`,
      { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] },
    );
    const port = cmd.match(/--app-port=(\d+)/)?.[1];
    const password = cmd.match(/--remoting-auth-token=([\w-]+)/)?.[1];
    return port && password ? { port, password } : null;
  } catch {
    return null;
  }
}

const lcu = findClient();
if (!lcu) {
  if (AUTO) {
    console.log('Cliente cerrado, nada que sincronizar.');
    process.exit(0);
  }
  console.error('No encontré el cliente de League abierto. Ábrelo, inicia sesión y vuelve a intentar.');
  console.error('Si está instalado en otra carpeta, indícala con LEAGUE_DIR="X:/ruta/League of Legends".');
  process.exit(1);
}
const client = lcu;

// El cliente usa un certificado autofirmado y solo escucha en 127.0.0.1.
const agent = new https.Agent({ rejectUnauthorized: false });
const auth = 'Basic ' + Buffer.from(`riot:${client.password}`).toString('base64');

function get<T>(pathname: string, attempt = 0): Promise<T | null> {
  return new Promise((resolve, reject) => {
    const req = https.get({ host: '127.0.0.1', port: client.port, path: pathname, agent, headers: { Authorization: auth } }, (res) => {
      let body = '';
      res.setEncoding('utf8');
      res.on('data', (c: string) => (body += c));
      res.on('end', () => {
        const status = res.statusCode ?? 0;
        if (status === 404) return resolve(null);
        if (status >= 500 || status === 429) {
          if (attempt >= 4) return reject(new Error(`${status} en ${pathname}`));
          setTimeout(() => get<T>(pathname, attempt + 1).then(resolve, reject), 1500 * (attempt + 1));
          return;
        }
        if (status >= 400) return reject(new Error(`${status} en ${pathname}: ${body.slice(0, 200)}`));
        try {
          resolve(JSON.parse(body) as T);
        } catch {
          reject(new Error(`Respuesta inválida en ${pathname}`));
        }
      });
    });
    req.on('error', (e: NodeJS.ErrnoException) => reject(new Error(`No pude conectar con el cliente (${e.code ?? e.message}). ¿Sigue abierto?`)));
  });
}

// ---------- Sincronización ----------

const config = JSON.parse(await readFile(PLAYERS_FILE, 'utf8')) as PlayersConfig;
const data: MatchData = existsSync(DATA_FILE)
  ? (JSON.parse(await readFile(DATA_FILE, 'utf8')) as MatchData)
  : { updatedAt: null, players: [], matches: [] };

const known = new Set(data.matches.map((m) => m.id));
let changed = false;
const players: PlayerInfo[] = [];

try {
  for (const entry of config.players) {
    const { riotId, alias } = typeof entry === 'string' ? { riotId: entry, alias: undefined } : entry;
    const [gameName, tagLine] = riotId.split('#');
    if (!gameName || !tagLine) {
      console.warn(`⚠ "${riotId}" no tiene formato Nombre#TAG, lo salto.`);
      continue;
    }
    const acc = await get<{ puuid: string; gameName?: string; tagLine?: string }>(
      `/lol-summoner/v1/alias/lookup?gameName=${encodeURIComponent(gameName)}&tagLine=${encodeURIComponent(tagLine)}`,
    );
    if (!acc?.puuid) {
      console.warn(`⚠ No encontré la cuenta ${riotId}, la salto.`);
      continue;
    }
    players.push({ puuid: acc.puuid, riotId, gameName: acc.gameName || gameName, tagLine: acc.tagLine || tagLine, alias: alias || gameName });
  }
  if (JSON.stringify(players) !== JSON.stringify(data.players)) changed = true;

  const newIds = new Set<number>();
  for (const p of players) {
    const ids = await fetchGameIds(p.puuid);
    const fresh = ids.filter((id) => !known.has(matchId(id)));
    fresh.forEach((id) => newIds.add(id));
    console.log(`${p.riotId}: ${ids.length} partidas de Caos revisadas, ${fresh.length} nuevas`);
  }

  let i = 0;
  for (const id of newIds) {
    i++;
    const game = await get<LcuGame>(`/lol-match-history/v1/games/${id}`).catch((e: Error) => {
      console.warn(`  ⚠ ${id}: ${e.message}`);
      return null;
    });
    if (!game?.participants?.length) continue;
    data.matches.push(compact(game));
    known.add(matchId(id));
    changed = true;
    if (i % 10 === 0 || i === newIds.size) console.log(`  descargadas ${i}/${newIds.size}`);
  }
} catch (e) {
  console.error(`✖ ${(e as Error).message}`);
  process.exitCode = 1;
} finally {
  if (players.length) data.players = players;
  if (changed) {
    data.updatedAt = Date.now();
    await save();
    console.log(`✔ Guardadas ${data.matches.length} partidas en total.`);
  } else {
    console.log('Sin cambios.');
  }
}

// El historial del cliente trae todas las colas mezcladas: se pagina y se filtra por QUEUE_ID.
// Ojo: hoy el cliente ignora la paginación y solo devuelve las ~20 partidas más recientes,
// por eso conviene sincronizar seguido. El corte por página repetida evita pedir lo mismo.
async function fetchGameIds(puuid: string): Promise<number[]> {
  const seen = new Set<number>();
  const ids: number[] = [];
  for (let beg = 0; beg < MAX_MATCHES * 3; beg += PAGE) {
    const res = await get<LcuHistory>(`/lol-match-history/v1/products/lol/${puuid}/matches?begIndex=${beg}&endIndex=${beg + PAGE - 1}`);
    const games = (res?.games?.games ?? []).filter((g) => !seen.has(g.gameId));
    if (!games.length) break;
    games.forEach((g) => seen.add(g.gameId));
    const caos = games.filter((g) => g.queueId === QUEUE_ID).map((g) => g.gameId);
    ids.push(...caos);
    if (games.length < PAGE || ids.length >= MAX_MATCHES) break;
    if (!FULL && caos.some((id) => known.has(matchId(id)))) break;
  }
  return ids.slice(0, MAX_MATCHES);
}

function matchId(gameId: number): string {
  return `LA2_${gameId}`;
}

function compact(g: LcuGame): Match {
  const who = new Map(g.participantIdentities.map((x) => [x.participantId, x.player]));
  return {
    id: matchId(g.gameId),
    start: g.gameCreation,
    duration: g.gameDuration,
    version: g.gameVersion,
    queue: g.queueId,
    mode: g.gameMode,
    remake: g.endOfGameResult !== 'GameComplete' || g.participants.some((p) => p.stats.gameEndedInEarlySurrender),
    participants: g.participants.map(({ participantId, championId, teamId, spell1Id, spell2Id, stats: s }): Participant => {
      const pl = who.get(participantId);
      return {
        puuid: pl?.puuid ?? '',
        name: pl?.gameName || pl?.summonerName || '',
        tag: pl?.tagLine || '',
        icon: pl?.profileIcon,
        champ: String(championId),
        champId: championId,
        level: s.champLevel,
        team: teamId,
        win: s.win,
        k: s.kills,
        d: s.deaths,
        a: s.assists,
        dmg: s.totalDamageDealtToChampions,
        taken: s.totalDamageTaken,
        heal: s.totalHeal,
        mitigated: s.damageSelfMitigated,
        gold: s.goldEarned,
        cs: (s.totalMinionsKilled || 0) + (s.neutralMinionsKilled || 0),
        cc: s.timeCCingOthers,
        doubles: s.doubleKills,
        triples: s.tripleKills,
        quadras: s.quadraKills,
        pentas: s.pentaKills,
        items: [0, 1, 2, 3, 4, 5, 6].map((n) => s[`item${n}`]),
        spells: [spell1Id, spell2Id],
        augments: [1, 2, 3, 4, 5, 6].map((n) => s[`playerAugment${n}`]).filter(Boolean),
      };
    }),
  };
}

async function save() {
  data.matches.sort((a, b) => b.start - a.start);
  await mkdir(path.dirname(DATA_FILE), { recursive: true });
  // Una partida por línea: diffs legibles en git.
  const body =
    `{"updatedAt":${data.updatedAt},"players":${JSON.stringify(data.players)},"matches":[\n` +
    data.matches.map((m) => JSON.stringify(m)).join(',\n') +
    '\n]}\n';
  await writeFile(DATA_FILE, body);
}
