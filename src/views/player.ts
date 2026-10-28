import { state } from '../state';
import { agg, byChamp, longestRun, minGames, recordsOf } from '../stats/aggregate';
import { byAugment } from '../stats/augments';
import { matesOf } from '../stats/synergy';
import { activitySpan, byDay } from '../stats/timeline';
import type { FriendPlayer, Friend, Game, Rec } from '../types';
import { champName, profileIcon, splash } from '../ui/assets';
import { chart, perGameLine, winLossBars } from '../ui/charts';
import { champCell, moreButton, searchBox, segmented, stat } from '../ui/components';
import { ago, esc, longDate, pct, short, shortDate, wrClass } from '../ui/format';
import { matchRow } from '../ui/match';
import { normalize } from '../utils/text';
import { augTable } from './augments';
import { awards } from './awards';

interface PerfMetric {
  label: string;
  value: (p: FriendPlayer) => number;
  fmt: (v: number) => string;
}

const PERF: Record<string, PerfMetric> = {
  dmg: { label: 'Daño', value: (p) => p.dmg, fmt: short },
  kda: { label: 'KDA', value: (p) => (p.k + p.a) / Math.max(1, p.d), fmt: (v) => v.toFixed(2) },
  k: { label: 'Kills', value: (p) => p.k, fmt: (v) => String(Math.round(v * 10) / 10) },
  d: { label: 'Muertes', value: (p) => p.d, fmt: (v) => String(Math.round(v * 10) / 10) },
  a: { label: 'Asistencias', value: (p) => p.a, fmt: (v) => String(Math.round(v * 10) / 10) },
  gold: { label: 'Oro', value: (p) => p.gold, fmt: short },
};


const TABS = [
  ['', 'Resumen'],
  ['campeones', 'Campeones'],
  ['aumentos', 'Aumentos'],
] as const;

export function viewPlayer(f: Friend, ms: Game[], tab = ''): string {
  const recs = recordsOf(ms, f);
  const champs = byChamp(recs);
  const body = !recs.length
    ? '<p class="empty">Sin partidas en este periodo.</p>'
    : tab === 'campeones' ? champsTab(f, ms)
    : tab === 'aumentos' ? augmentsTab(f, ms)
    : overview(f, ms);

  return `
    <section class="profile" style="--c:${f.color}">
      ${champs[0] ? `<div class="profile-banner" style="background-image:url('${splash(champs[0].p)}')"></div>` : ''}
      <div class="profile-id">
        <img class="avatar xl" src="${profileIcon(f.icon)}" alt="">
        <div>
          <h1>${esc(f.alias)} <span class="tag">#${esc(f.tagLine)}</span></h1>
          <div class="profile-meta">
            <span class="pill">LAS</span>
            ${f.alias !== f.gameName ? `<span class="muted">${esc(f.gameName)}</span>` : ''}
            ${f.level ? `<span class="muted">Nivel ${f.level}</span>` : ''}
          </div>
        </div>
      </div>
      <nav class="tabs">${TABS.map(([key, label]) => `<a href="#/p/${f.slug}${key ? `/${key}` : ''}" class="${tab === key ? 'active' : ''}">${label}</a>`).join('')}</nav>
    </section>
    ${body}`;
}

function overview(f: Friend, ms: Game[]): string {
  const recs = recordsOf(ms, f);
  const s = agg(recs);
  const champs = byChamp(recs);
  const mates = matesOf(f, ms, state.friends);
  const trophies = awards(ms).filter((a) => a.ranking[0].f === f);
  const buddy = mates
    .filter((x) => x.n >= minGames(ms))
    .sort((a, b) => b.w / b.n - a.w / a.n || b.n - a.n)[0];

  return `<div class="split">
    <aside class="side">
      <section class="panel">
        <h2 class="panel-title">ARAM: Caos</h2>
        <div class="stat-grid">
          ${stat('Partidas', s.games, `${s.wins}V ${s.losses}D`)}
          ${stat('Winrate', `<span class="${wrClass(s.wr)}">${pct(s.wr)}</span>`)}
          ${stat('KDA', s.kda.toFixed(2), `${s.avgK.toFixed(1)} / ${s.avgD.toFixed(1)} / ${s.avgA.toFixed(1)}`)}
          ${stat('Daño/min', Math.round(s.dpm), `${short(s.avgDmg)} por partida`)}
          ${stat('Mejor racha', longestRun(recs), 'victorias seguidas')}
          ${stat('Multikills', s.pentas + s.quadras, `${s.pentas} pentas · ${s.quadras} quadras`)}
        </div>
        ${buddy ? `<div class="buddy"><span class="muted">Mejor compañero</span> <a class="who" href="#/p/${buddy.g.slug}" style="--c:${buddy.g.color}">${esc(buddy.g.alias)}</a> <span class="good">${pct(buddy.w / buddy.n)}</span> <small class="muted">en ${buddy.n}</small></div>` : ''}
      </section>
      ${trophies.length ? `<section class="panel">
        <h2 class="panel-title">Logros</h2>
        <div class="trophies">${trophies.map((a) => `<a class="trophy" href="#/logros" title="${a.def.desc}: ${a.def.fmt(a.ranking[0].s)}">${a.def.title}</a>`).join('')}</div>
      </section>` : ''}
      <section class="panel flush">
        <h2 class="panel-title pad-x">Campeones</h2>
        <ul class="mini-list">${champs.slice(0, 7).map((c) => `<li>
          ${champCell(c.p)}
          <span class="${wrClass(c.s.wr)}">${pct(c.s.wr)}</span>
          <span class="muted">${c.s.games} · ${c.s.kda.toFixed(2)}</span>
        </li>`).join('')}</ul>
        ${champs.length > 7 ? `<a class="panel-link" href="#/p/${f.slug}/campeones">Ver los ${champs.length} campeones</a>` : ''}
      </section>
      <section class="panel">
        <h2 class="panel-title">Actividad</h2>
        ${activityChart(ms, recs)}
      </section>
      ${mates.length ? `<section class="panel flush">
        <h2 class="panel-title pad-x">Con los amigos</h2>
        <ul class="mini-list">${mates.map((x) => `<li>
          <a class="player" href="#/p/${x.g.slug}"><img class="avatar xs" src="${profileIcon(x.g.icon)}" style="--c:${x.g.color}" alt=""><b>${esc(x.g.alias)}</b></a>
          <span class="${x.n ? wrClass(x.w / x.n) : ''}">${x.n ? pct(x.w / x.n) : '—'}</span>
          <span class="muted">${x.n} juntos${x.vs ? ` · ${x.vs} en contra` : ''}</span>
        </li>`).join('')}</ul>
      </section>` : ''}
    </aside>
    <section class="main-col">
      ${recs.length > 1 ? perfChart(recs) : ''}
      <div class="matches">${recs.slice(0, state.limit).map((r) => matchRow(r.m, r.p)).join('')}</div>
      ${moreButton(recs.length)}
    </section>
  </div>`;
}

/** Las últimas 30 partidas, de la más antigua a la más reciente. */
function perfChart(recs: Rec[]): string {
  const metric = PERF[state.perfMetric] ?? PERF.dmg;
  const games = recs.slice(0, 30).reverse();
  return `<section class="panel">
    <div class="panel-bar">
      <h2 class="panel-title">Rendimiento · últimas ${games.length}</h2>
      ${segmented('pmetric', state.perfMetric, Object.entries(PERF).map(([k, m]) => [k, m.label]))}
    </div>
    ${chart(
      perGameLine(
        games.map((r) => shortDate(r.m.start)),
        games.map((r) => metric.value(r.p)),
        games.map((r) => r.p.win),
        games.map((r) => [
          `${champName(r.p)} · ${r.p.win ? 'Victoria' : 'Derrota'}`,
          `${r.p.k}/${r.p.d}/${r.p.a} · ${short(r.p.dmg)} daño`,
          ago(r.m.start),
        ]),
        metric.fmt,
        metric.label,
      ),
      220,
      `${metric.label} por partida`,
    )}
  </section>`;
}

function activityChart(ms: Game[], recs: Rec[]): string {
  const days = byDay(ms, Math.min(14, activitySpan(ms)), Date.now(), recs);
  return chart(
    winLossBars(
      days.map((d) => shortDate(String(d.key))),
      days.map((d) => d.w),
      days.map((d) => d.l),
      days.map((d) => longDate(String(d.key))),
    ),
    160,
    'Victorias y derrotas por día',
  );
}

function champsTab(f: Friend, ms: Game[]): string {
  const all = byChamp(recordsOf(ms, f));
  const q = normalize(state.champQ);
  const champs = all.filter((c) => !q || normalize(champName(c.p)).includes(q));
  return `<section class="panel flush">
    <div class="panel-bar pad-x pad-top">
      <h2 class="panel-title">Campeones <span class="count">${q ? `${champs.length} de ${all.length}` : all.length}</span></h2>
      ${searchBox('champQ', state.champQ, 'Buscar campeón…')}
    </div>
    <div class="table-scroll">
      <table class="tbl">
        <thead><tr><th>Campeón</th><th class="num">Partidas</th><th>Winrate</th><th>KDA</th><th class="num">Daño prom.</th><th class="num">Pentas</th></tr></thead>
        <tbody>${champs.map((c) => `<tr>
          <td>${champCell(c.p)}</td>
          <td class="num">${c.s.games}</td>
          <td><b class="${wrClass(c.s.wr)}">${pct(c.s.wr)}</b> <small class="muted">${c.s.wins}V ${c.s.losses}D</small></td>
          <td><b>${c.s.kda.toFixed(2)}</b> <small class="muted">${c.s.avgK.toFixed(1)} / ${c.s.avgD.toFixed(1)} / ${c.s.avgA.toFixed(1)}</small></td>
          <td class="num">${short(c.s.avgDmg)}</td>
          <td class="num">${c.s.pentas || '<span class="muted">—</span>'}</td>
        </tr>`).join('')}</tbody>
      </table>
    </div>
  </section>`;
}

function augmentsTab(f: Friend, ms: Game[]): string {
  const augs = byAugment(recordsOf(ms, f));
  if (!augs.length) return '<p class="empty">Sin aumentos en este periodo.</p>';
  return `<section class="panel flush"><div class="table-scroll">${augTable(augs, false)}</div></section>`;
}
