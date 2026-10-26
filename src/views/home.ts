import { state } from '../state';
import { agg, byChamp, minGames, recordsOf, streak } from '../stats/aggregate';
import { playerExtras, type PlayerExtras } from '../stats/awards';
import { squadStats } from '../stats/synergy';
import { activitySpan, byDay, byHour } from '../stats/timeline';
import type { Friend, Game, Rec } from '../types';
import { champIcon, champName, profileIcon } from '../ui/assets';
import { chart, rankingBars, winLossBars } from '../ui/charts';
import { segmented, stat } from '../ui/components';
import { esc, longDate, pct, short, shortDate, wrClass } from '../ui/format';

interface Metric {
  label: string;
  value: (s: PlayerExtras) => number;
  fmt: (v: number) => string;
}

const COMPARE: Record<string, Metric> = {
  wr: { label: 'Winrate', value: (s) => s.wr, fmt: pct },
  kda: { label: 'KDA', value: (s) => s.kda, fmt: (v) => v.toFixed(2) },
  dpm: { label: 'Daño/min', value: (s) => s.dpm, fmt: (v) => String(Math.round(v)) },
  kills: { label: 'Kills', value: (s) => s.avgK, fmt: (v) => v.toFixed(1) },
  deaths: { label: 'Muertes', value: (s) => s.avgD, fmt: (v) => v.toFixed(1) },
  assists: { label: 'Asistencias', value: (s) => s.avgA, fmt: (v) => v.toFixed(1) },
  kp: { label: 'Participación', value: (s) => s.kp, fmt: pct },
  gpm: { label: 'Oro/min', value: (s) => s.gpm, fmt: (v) => String(Math.round(v)) },
};


export function viewHome(ms: Game[]): string {
  const all = recordsOf(ms);
  const s = agg(all);
  const rows = state.friends
    .map((f) => ({ f, recs: all.filter((r) => r.p.friend === f) }))
    .sort((a, b) => b.recs.length - a.recs.length);
  const bestDuo = squadStats(ms, 2, state.friends)
    .filter((e) => e.n >= minGames(ms))
    .sort((a, b) => b.wr - a.wr || b.n - a.n)[0];

  return `
    <section class="panel summary">
      ${stat('Partidas del grupo', ms.length)}
      ${stat('Winrate', `<span class="${wrClass(s.wr)}">${pct(s.wr)}</span>`, `${s.wins}V ${s.losses}D`)}
      ${stat('KDA promedio', s.kda.toFixed(2), `${s.avgK.toFixed(1)} / ${s.avgD.toFixed(1)} / ${s.avgA.toFixed(1)}`)}
      ${stat('Pentakills', s.pentas, `${s.quadras} quadras`)}
      ${bestDuo ? stat('Mejor dúo', pct(bestDuo.wr), `${bestDuo.friends.map((f) => esc(f.alias)).join(' + ')} · ${bestDuo.n} partidas`) : ''}
    </section>
    ${ms.length ? `<div class="grid2">
      <section class="panel">
        <h2 class="panel-title">Actividad del grupo</h2>
        ${activityChart(ms)}
      </section>
      <section class="panel">
        <h2 class="panel-title">¿A qué hora jugamos?</h2>
        ${hourChart(ms)}
      </section>
    </div>` : ''}
    <section class="panel flush">
      <h2 class="panel-title pad-x">Jugadores</h2>
      <div class="table-scroll">
        <table class="tbl board">
          <thead><tr>
            <th class="num">#</th><th>Jugador</th><th>Main</th><th class="num">Partidas</th><th>Winrate</th>
            <th>KDA</th><th class="num">Daño</th><th>Últimas 10</th>
          </tr></thead>
          <tbody>${rows.map(({ f, recs }, i) => boardRow(i + 1, f, recs)).join('')}</tbody>
        </table>
      </div>
    </section>
    ${ms.length ? compareChart(ms) : ''}`;
}

function activityChart(ms: Game[]): string {
  const days = byDay(ms, activitySpan(ms));
  return chart(
    winLossBars(
      days.map((d) => shortDate(String(d.key))),
      days.map((d) => d.w),
      days.map((d) => d.l),
      days.map((d) => longDate(String(d.key))),
    ),
    200,
    'Victorias y derrotas del grupo por día',
  );
}

function hourChart(ms: Game[]): string {
  const hours = byHour(ms);
  // Solo el tramo de horas con partidas, para no dibujar 20 columnas vacías.
  const used = hours.filter((h) => h.w + h.l).map((h) => Number(h.key));
  const span = used.length ? hours.slice(Math.min(...used), Math.max(...used) + 1) : hours;
  return chart(
    winLossBars(
      span.map((h) => `${h.key}h`),
      span.map((h) => h.w),
      span.map((h) => h.l),
      span.map((h) => `${h.key}:00 – ${h.key}:59`),
    ),
    200,
    'Victorias y derrotas del grupo según la hora',
  );
}

function compareChart(ms: Game[]): string {
  const metric = COMPARE[state.compareMetric] ?? COMPARE.dpm;
  const rows = state.friends
    .map((f) => ({ f, s: playerExtras(recordsOf(ms, f)) }))
    .filter((x) => x.s.games)
    .map((x) => ({ ...x, v: metric.value(x.s) }))
    .sort((a, b) => b.v - a.v);
  return `<section class="panel">
    <div class="panel-bar">
      <h2 class="panel-title">Comparativa</h2>
      ${segmented('metric', state.compareMetric, Object.entries(COMPARE).map(([k, m]) => [k, m.label]))}
    </div>
    ${chart(
      rankingBars(rows.map((x) => x.f.alias), rows.map((x) => x.v), rows.map((x) => x.f.color), metric.fmt),
      rows.length * 34 + 30,
      `Comparativa de ${metric.label} por jugador`,
    )}
  </section>`;
}

function boardRow(rank: number, f: Friend, recs: Rec[]): string {
  const id = `<a class="player" href="#/p/${f.slug}">
      <img class="avatar sm" src="${profileIcon(f.icon)}" style="--c:${f.color}" alt="">
      <span><b>${esc(f.alias)}</b><small>${esc(f.gameName)}#${esc(f.tagLine)}</small></span>
    </a>`;
  if (!recs.length) {
    return `<tr class="dim"><td class="num muted">${rank}</td><td>${id}</td><td colspan="6" class="muted">Sin partidas en este periodo</td></tr>`;
  }
  const s = agg(recs);
  const main = byChamp(recs)[0];
  const st = streak(recs);
  return `<tr>
    <td class="num muted">${rank}</td>
    <td>${id}</td>
    <td><span class="champ-cell"><img class="ci sm" src="${champIcon(main.p)}" alt="">${esc(champName(main.p))}<small class="muted">${main.s.games}</small></span></td>
    <td class="num">${s.games}</td>
    <td><span class="wr"><b class="${wrClass(s.wr)}">${pct(s.wr)}</b><i class="wr-bar"><i style="width:${s.wr * 100}%"></i></i><small class="muted">${s.wins}V ${s.losses}D</small></span></td>
    <td><b>${s.kda.toFixed(2)}</b> <small class="muted">${s.avgK.toFixed(1)} / ${s.avgD.toFixed(1)} / ${s.avgA.toFixed(1)}</small></td>
    <td class="num">${short(s.avgDmg)}</td>
    <td><span class="form">${recs.slice(0, 10).map((r) => `<i class="${r.p.win ? 'w' : 'l'}"></i>`).join('')}</span>${st && st.n >= 3 ? `<span class="streak ${st.win ? 'w' : 'l'}">${st.n}${st.win ? 'V' : 'D'}</span>` : ''}</td>
  </tr>`;
}
