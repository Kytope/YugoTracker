import { state } from '../state';
import { agg, minGames, recordsOf } from '../stats/aggregate';
import { bySquadSize, rivalries, squadStats, type Squad } from '../stats/synergy';
import type { Game } from '../types';
import { profileIcon } from '../ui/assets';
import { empty, who } from '../ui/components';
import { divColor, esc, pct, wrClass } from '../ui/format';

const SIZE_LABELS = ['Solo', 'Dúo', 'Trío', 'Cuarteto', 'Premade de 5'];

export function viewSynergy(ms: Game[]): string {
  if (!ms.length) return empty();
  const min = minGames(ms);
  const duos = squadStats(ms, 2, state.friends);
  const trios = squadStats(ms, 3, state.friends);
  const ranked = (list: Squad[]) => list.filter((e) => e.n >= min);
  const best = (list: Squad[]) => ranked(list).sort((a, b) => b.wr - a.wr || b.n - a.n)[0];
  const worst = (list: Squad[]) => ranked(list).sort((a, b) => a.wr - b.wr || b.n - a.n)[0];
  const frequent = [...duos].sort((a, b) => b.n - a.n)[0];
  const byGames = (list: Squad[]) => [...list].sort((a, b) => b.n - a.n || b.wr - a.wr);
  const sizes = bySquadSize(ms);
  const rivals = rivalries(ms, state.friends);

  return `
    <section class="hero">
      <h1>Sinergias</h1>
      <p class="muted">Partidas en el mismo equipo. Los mejores y peores combos exigen al menos ${min} partidas juntos.</p>
      <div class="duo-cards">
        ${duoCard('Mejor dúo', best(duos))}
        ${duoCard('Peor dúo', worst(duos))}
        ${duoCard('Dúo más frecuente', frequent)}
        ${duoCard('Mejor trío', best(trios))}
      </div>
    </section>
    <section class="panel">
      <h2 class="panel-title">Winrate juntos</h2>
      ${heatmap(duos, ms, min)}
    </section>
    <div class="grid2 mt">
      <section class="panel">
        <h2 class="panel-title">Todos los dúos <span class="count">${duos.length}</span></h2>
        ${squadTable(byGames(duos))}
      </section>
      <section class="panel">
        <h2 class="panel-title">Tríos <span class="count">${trios.length}</span></h2>
        ${trios.length ? squadTable(byGames(trios).slice(0, 15)) : '<p class="muted">Todavía no hay tríos.</p>'}
      </section>
    </div>
    <div class="grid2">
      <section class="panel">
        <h2 class="panel-title">¿Rinde más el premade?</h2>
        <table class="tbl sizes">
          <thead><tr><th>Amigos en el equipo</th><th>Partidas</th><th>Winrate</th><th></th></tr></thead>
          <tbody>${sizes.filter((r) => r.games).map((r) => `<tr>
            <td>${SIZE_LABELS[r.n - 1]}</td>
            <td>${r.games}</td>
            <td><b>${pct(r.wins / r.games)}</b> <small class="muted">${r.wins}V · ${r.games - r.wins}D</small></td>
            <td class="barcell"><div class="track"><span class="hbar" style="width:${(r.wins / r.games) * 100}%"></span><i class="mid"></i></div></td>
          </tr>`).join('')}</tbody>
        </table>
      </section>
      <section class="panel">
        <h2 class="panel-title">Rivalidades</h2>
        ${rivals.length ? `<table class="tbl">
          <tbody>${rivals.map((r) => `<tr>
            <td>${who(r.a)}</td><td class="h2h"><b>${r.aw}</b> – <b>${r.bw}</b></td><td>${who(r.b)}</td>
          </tr>`).join('')}</tbody>
        </table>` : '<p class="muted">Nadie del grupo se ha enfrentado todavía.</p>'}
      </section>
    </div>`;
}

function duoCard(title: string, e: Squad | undefined): string {
  if (!e) return `<div class="duo-card empty"><span class="label">${title}</span><p class="muted">Faltan partidas</p></div>`;
  return `<div class="duo-card">
    <span class="label">${title}</span>
    <div class="duo-faces">${e.friends.map((f) => `<img class="avatar" src="${profileIcon(f.icon)}" style="--c:${f.color}" alt="">`).join('')}</div>
    <div class="duo-names">${e.friends.map((f) => `<a href="#/p/${f.slug}">${esc(f.alias)}</a>`).join(' + ')}</div>
    <b class="rval">${pct(e.wr)}</b>
    <span class="muted">${e.n} partidas · ${e.w}V ${e.n - e.w}D · KDA ${e.kda.toFixed(2)}</span>
  </div>`;
}

function squadTable(list: Squad[]): string {
  return `<table class="tbl">
    <thead><tr><th>Combo</th><th>Partidas</th><th>Winrate</th><th>KDA</th></tr></thead>
    <tbody>${list.map((e) => `<tr>
      <td class="combo">${e.friends.map(who).join('<span class="muted">+</span>')}</td>
      <td>${e.n}</td>
      <td class="${wrClass(e.wr)}">${pct(e.wr)} <small class="muted">${e.w}V ${e.n - e.w}D</small></td>
      <td>${e.kda.toFixed(2)}</td>
    </tr>`).join('')}</tbody>
  </table>`;
}

// Matriz de winrate por pareja. Escala divergente centrada en 50%; la diagonal es el winrate individual.
function heatmap(duos: Squad[], ms: Game[], min: number): string {
  const fs = state.friends.filter((f) => ms.some((m) => m.mine.some((p) => p.friend === f)));
  const pairKey = (a: string, b: string) => [a, b].sort().join('|');
  const pair = new Map(duos.map((e) => [pairKey(e.friends[0].slug, e.friends[1].slug), e]));
  const head = fs.map((f) => `<div class="hm-h" title="${esc(f.alias)}"><img class="avatar xs" src="${profileIcon(f.icon)}" style="--c:${f.color}" alt=""><span>${esc(f.alias)}</span></div>`).join('');
  const rows = fs.map((a) => {
    const cells = fs.map((b) => {
      if (a === b) {
        const s = agg(recordsOf(ms, a));
        return `<div class="hm-c self" title="${esc(a.alias)} en total: ${s.games} partidas, ${pct(s.wr)}"><b>${pct(s.wr)}</b><small>${s.games}</small></div>`;
      }
      const e = pair.get(pairKey(a.slug, b.slug));
      if (!e) return '<div class="hm-c none" title="Nunca jugaron juntos">—</div>';
      return `<div class="hm-c ${e.n < min ? 'few' : ''}" style="background:${divColor(e.wr)}" title="${esc(a.alias)} + ${esc(b.alias)}: ${e.n} partidas, ${e.w}V ${e.n - e.w}D (${pct(e.wr)})"><b>${pct(e.wr)}</b><small>${e.n}</small></div>`;
    }).join('');
    return `<div class="hm-r"><a href="#/p/${a.slug}" style="--c:${a.color}"><img class="avatar xs" src="${profileIcon(a.icon)}" alt="">${esc(a.alias)}</a></div>${cells}`;
  }).join('');
  return `<div class="heatmap" style="--n:${fs.length}"><div></div>${head}${rows}</div>
    <div class="hm-legend">
      <span>0%</span><i class="hm-scale"></i><span>100%</span>
      <span class="muted">Número pequeño: partidas juntos. Celdas tenues: menos de ${min} partidas. La diagonal es el winrate de cada uno.</span>
    </div>`;
}
