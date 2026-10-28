import { state } from '../state';
import { longestRun, recordsOf } from '../stats/aggregate';
import type { Game, Rec } from '../types';
import { champIcon, champName, splash } from '../ui/assets';
import { empty, who } from '../ui/components';
import { ago, esc, short } from '../ui/format';
import { matchRow } from '../ui/match';

interface RecordDef {
  title: string;
  value: (r: Rec) => number;
  fmt: (v: number, r: Rec) => string;
  note?: string;
}

const DEFS: RecordDef[] = [
  { title: 'Mejor puntaje', value: (r) => r.p.score, fmt: (v) => `${v.toFixed(1)} / 10` },
  { title: 'Más kills', value: (r) => r.p.k, fmt: (v) => `${v} kills` },
  { title: 'Más daño a campeones', value: (r) => r.p.dmg, fmt: short },
  { title: 'Más asistencias', value: (r) => r.p.a, fmt: (v) => `${v} asistencias` },
  { title: 'Mejor KDA', value: (r) => (r.p.k + r.p.a) / Math.max(1, r.p.d), fmt: (_, r) => `${r.p.k}/${r.p.d}/${r.p.a}` },
  { title: 'Más daño recibido', value: (r) => r.p.taken, fmt: short },
  { title: 'Más curación', value: (r) => r.p.heal, fmt: short },
  { title: 'Más oro', value: (r) => r.p.gold, fmt: short },
  { title: 'Más muertes', value: (r) => r.p.d, fmt: (v) => `${v} muertes`, note: 'El feeder oficial' },
];

export function viewRecords(ms: Game[]): string {
  const recs = recordsOf(ms);
  if (!recs.length) return empty();
  const cards = DEFS.map((def) => {
    const best = recs.reduce((a, b) => (def.value(b) > def.value(a) ? b : a));
    return recordCard(def.title, def.fmt(def.value(best), best), best, def.note);
  });
  const pentas = recs.filter((r) => r.p.pentas > 0);
  const longest = ms.reduce((a, b) => (b.duration > a.duration ? b : a));
  const streaks = state.friends
    .map((f) => ({ f, n: longestRun(recs.filter((r) => r.p.friend === f)) }))
    .filter((x) => x.n)
    .sort((a, b) => b.n - a.n);

  return `
    <section class="records">${cards.join('')}</section>
    <div class="grid2">
      <section class="panel">
        <h2 class="panel-title">Muro de pentakills <span class="count">${pentas.reduce((n, r) => n + r.p.pentas, 0)}</span></h2>
        ${pentas.length ? `<div class="penta-list">${pentas.map((r) => `<div class="penta">
          <img class="ci" src="${champIcon(r.p)}" alt="">
          <div>${who(r.p.friend)} con ${esc(champName(r.p))}${r.p.pentas > 1 ? ` <span class="badge">x${r.p.pentas}</span>` : ''}
          <div class="muted">${r.p.k}/${r.p.d}/${r.p.a} · ${ago(r.m.start)}</div></div></div>`).join('')}</div>` : '<p class="muted">Nadie ha hecho una penta todavía.</p>'}
      </section>
      <section class="panel">
        <h2 class="panel-title">Mejores rachas de victorias</h2>
        <table class="tbl">${streaks.map((x) => `<tr><td>${who(x.f)}</td><td><b>${x.n}</b> seguidas</td></tr>`).join('')}</table>
        <h2 class="panel-title mt">Partida más larga</h2>
        <div class="matches">${matchRow(longest, null)}</div>
      </section>
    </div>`;
}

function recordCard(title: string, value: string, r: Rec, note?: string): string {
  return `<div class="rcard" style="--c:${r.p.friend.color}">
    <div class="rcard-bg" style="background-image:url('${splash(r.p)}')"></div>
    <span class="label">${title}</span>
    <b class="rval">${value}</b>
    <div><a class="who" href="#/p/${r.p.friend.slug}">${esc(r.p.friend.alias)}</a> · ${esc(champName(r.p))}</div>
    <div class="muted">${note ? `${note} · ` : ''}${ago(r.m.start)}</div>
  </div>`;
}
