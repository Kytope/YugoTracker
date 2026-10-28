import { state } from '../state';
import { agg, recordsOf } from '../stats/aggregate';
import { byAugment } from '../stats/augments';
import type { Game, Rec } from '../types';
import { augImg, augInfo, champIcon, champName, itemImg, itemName, profileIcon, splash } from '../ui/assets';
import { empty, moreButton, stat } from '../ui/components';
import { esc, pct, short, wrClass } from '../ui/format';
import { matchRow } from '../ui/match';

// Consumibles y trinkets: aparecen en casi todas las partidas y tapan a los ítems que importan.
const IGNORED_ITEMS = new Set([2003, 2010, 2055, 2138, 2139, 2140, 3340, 3363, 3364, 3330, 3513]);

export function viewChampion(champId: number, ms: Game[]): string {
  const recs = recordsOf(ms).filter((r) => r.p.champId === champId);
  const sample = recs[0]?.p ?? state.matches.flatMap((m) => m.mine).find((p) => p.champId === champId);
  if (!sample) return empty('Nadie del grupo ha jugado este campeón.');
  const name = champName(sample);
  const s = agg(recs);

  const header = `<section class="profile">
      <div class="profile-banner" style="background-image:url('${splash(sample)}')"></div>
      <div class="profile-id">
        <img class="ci xl" src="${champIcon(sample)}" alt="">
        <div>
          <h1>${esc(name)}</h1>
          <div class="profile-meta"><span class="pill">ARAM: Caos</span><span class="muted">${s.games} partidas del grupo</span></div>
        </div>
      </div>
    </section>`;
  if (!recs.length) return `${header}${empty('Sin partidas con este campeón en este periodo.')}`;

  const players = state.friends
    .map((f) => ({ f, rs: recs.filter((r) => r.p.friend === f) }))
    .filter((x) => x.rs.length)
    .map((x) => ({ ...x, s: agg(x.rs) }))
    .sort((a, b) => b.s.games - a.s.games || b.s.wr - a.s.wr);
  const augs = byAugment(recs).slice(0, 8);
  const items = topItems(recs, 8);
  const best = recs.reduce((a, b) => (score(b) > score(a) ? b : a));

  return `${header}
    <section class="panel summary">
      ${stat('Winrate', `<span class="${wrClass(s.wr)}">${pct(s.wr)}</span>`, `${s.wins}V ${s.losses}D`)}
      ${stat('KDA', s.kda.toFixed(2), `${s.avgK.toFixed(1)} / ${s.avgD.toFixed(1)} / ${s.avgA.toFixed(1)}`)}
      ${stat('Daño promedio', short(s.avgDmg), `${Math.round(s.dpm)} por minuto`)}
      ${stat('Puntaje promedio', s.avgScore.toFixed(1), `${s.mvps} MVP · ${s.aces} ACE`)}
      ${stat('Multikills', s.pentas + s.quadras, `${s.pentas} pentas · ${s.quadras} quadras`)}
    </section>
    <div class="split">
      <aside class="side">
        <section class="panel flush">
          <h2 class="panel-title pad-x">Quién lo juega</h2>
          <ul class="mini-list">${players.map((x) => `<li>
            <a class="player" href="#/p/${x.f.slug}"><img class="avatar xs" src="${profileIcon(x.f.icon)}" style="--c:${x.f.color}" alt=""><b>${esc(x.f.alias)}</b></a>
            <span class="${wrClass(x.s.wr)}">${pct(x.s.wr)}</span>
            <span class="muted">${x.s.games} · ${x.s.kda.toFixed(2)} KDA</span>
          </li>`).join('')}</ul>
        </section>
        ${augs.length ? `<section class="panel flush">
          <h2 class="panel-title pad-x">Aumentos más elegidos</h2>
          <ul class="mini-list">${augs.map((e) => `<li>
            <span class="champ-cell">${augImg(e.id)}${esc(augInfo(e.id).name)}</span>
            <span class="${e.n >= 3 ? wrClass(e.wr) : ''}">${pct(e.wr)}</span>
            <span class="muted">${e.n} ${e.n === 1 ? 'vez' : 'veces'}</span>
          </li>`).join('')}</ul>
        </section>` : ''}
        ${items.length ? `<section class="panel">
          <h2 class="panel-title">Ítems más comprados</h2>
          <ul class="item-list">${items.map(([id, n]) => `<li title="${esc(itemName(id))}">${itemImg(id)}<span>${esc(itemName(id))}</span><b>${pct(n / recs.length)}</b></li>`).join('')}</ul>
        </section>` : ''}
      </aside>
      <section class="main-col">
        <h2 class="panel-title">Mejor partida</h2>
        <div class="matches">${matchRow(best.m, best.p)}</div>
        <h2 class="panel-title mt">Todas las partidas <span class="count">${recs.length}</span></h2>
        <div class="matches">${recs.slice(0, state.limit).map((r) => matchRow(r.m, r.p)).join('')}</div>
        ${moreButton(recs.length)}
      </section>
    </div>`;
}

/** "Mejor partida" = mayor puntaje de desempeño (stats/mvp.ts). */
const score = (r: Rec) => r.p.score;

function topItems(recs: Rec[], n: number): [number, number][] {
  const count = new Map<number, number>();
  for (const r of recs) {
    for (const id of new Set(r.p.items)) {
      if (!id || IGNORED_ITEMS.has(id)) continue;
      count.set(id, (count.get(id) ?? 0) + 1);
    }
  }
  return [...count].sort((a, b) => b[1] - a[1]).slice(0, n);
}
