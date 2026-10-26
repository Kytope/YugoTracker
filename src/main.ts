import './styles.css';
import { PAGE_SIZE, PERIODS, type Period } from './config';
import { loadAugments } from './data/augments';
import { loadDDragon } from './data/ddragon';
import { loadData, prepare } from './data/load';
import type { MatchData } from './shared/types';
import { currentMatches, state } from './state';
import type { Game } from './types';
import { mountCharts } from './ui/charts';
import { ago } from './ui/format';
import { scoreboard } from './ui/match';
import { store } from './utils/storage';
import { viewAugments } from './views/augments';
import { viewAwards } from './views/awards';
import { viewChamps } from './views/champions';
import { viewHome } from './views/home';
import { viewMatches } from './views/matches';
import { viewPlayer } from './views/player';
import { viewRecords } from './views/records';
import { viewSynergy } from './views/synergy';

const app = document.getElementById('app')!;

const VIEWS: Record<string, (ms: Game[]) => string> = {
  partidas: viewMatches,
  sinergias: viewSynergy,
  campeones: viewChamps,
  aumentos: viewAugments,
  logros: viewAwards,
  records: viewRecords,
};

init();

async function init() {
  const [data, dd, augs] = await Promise.all([loadData(), loadDDragon(), loadAugments()]);
  state.dd = dd;
  state.augs = augs;
  if (!data?.matches.length) {
    app.innerHTML = emptyState(data);
    return;
  }
  const { friends, matches } = prepare(data);
  state.friends = friends;
  state.matches = matches;
  state.byId = new Map(matches.map((m) => [m.id, m]));
  // Sin Data Dragon, se deduce la versión de la última partida (ej. 16.21.829 → 16.21.1).
  if (!state.dd.v && matches[0]) state.dd.v = matches[0].version.split('.').slice(0, 2).join('.') + '.1';

  setupHeader(data);
  document.addEventListener('click', onClick);
  document.addEventListener('error', (e) => {
    if (e.target instanceof HTMLImageElement) e.target.classList.add('broken');
  }, true);
  window.addEventListener('hashchange', () => {
    state.limit = PAGE_SIZE;
    scrollTo(0, 0);
    route();
  });
  route();
}

function setupHeader(data: MatchData) {
  const sel = document.getElementById('period') as HTMLSelectElement;
  sel.innerHTML = Object.entries(PERIODS)
    .map(([k, p]) => `<option value="${k}" ${k === state.period ? 'selected' : ''}>${p.label}</option>`)
    .join('');
  sel.addEventListener('change', () => {
    state.period = sel.value as Period;
    store('period', sel.value);
    route();
  });
  if (data.updatedAt) document.getElementById('updated')!.textContent = `Actualizado ${ago(data.updatedAt)}`;
}

function route() {
  const [, view = '', arg = '', tab = ''] = location.hash.slice(1).split('/');
  const ms = currentMatches();
  const friend = view === 'p' ? state.friends.find((x) => x.slug === decodeURIComponent(arg)) : undefined;
  app.innerHTML = friend ? viewPlayer(friend, ms, tab) : (VIEWS[view] ?? viewHome)(ms);
  mountCharts(app);
  const active = VIEWS[view] ? view : 'home';
  document.querySelectorAll<HTMLAnchorElement>('.nav a').forEach((a) => a.classList.toggle('active', a.dataset.view === active));
}

function onClick(e: MouseEvent) {
  const t = (e.target as Element).closest<HTMLElement>('[data-toggle],[data-sort],[data-augsort],[data-more],[data-metric],[data-pmetric]');
  if (!t) return;
  const { toggle, sort, augsort, more, metric, pmetric } = t.dataset;
  if (toggle) {
    const sb = document.getElementById(`sb-${toggle}`)!;
    const m = state.byId.get(toggle);
    if (!sb.innerHTML && m) sb.innerHTML = scoreboard(m);
    sb.hidden = !sb.hidden;
    t.closest('.match')?.classList.toggle('open', !sb.hidden);
    return;
  }
  if (sort) state.champSort = sort;
  else if (augsort) state.augSort = augsort;
  else if (more) state.limit += PAGE_SIZE;
  else if (metric) state.compareMetric = metric;
  else if (pmetric) state.perfMetric = pmetric;
  route();
}

function emptyState(data: MatchData | null): string {
  return `<section class="panel empty-state">
    <h1>${data ? 'Sin partidas de ARAM: Caos' : 'Todavía no hay datos'}</h1>
    <p>${data
      ? 'La sincronización corrió pero no encontró partidas de ARAM: Caos para los jugadores configurados.'
      : 'Abre el cliente de League, inicia sesión y ejecuta la sincronización:'}</p>
    <pre>npm run sync</pre>
    <p class="muted">Los jugadores se editan en <code>config/players.json</code>.</p>
  </section>`;
}
