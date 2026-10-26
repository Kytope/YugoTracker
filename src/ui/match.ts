// Fila de partida (expandible) y marcador de los 10 jugadores.

import type { TeamId } from '../shared/types';
import type { FriendPlayer, Game } from '../types';
import { augImgs, champIcon, champName, itemImgs, spellImg } from './assets';
import { multiBadge } from './components';
import { ago, dur, esc, ratio, short } from './format';

/** Con `focus` se ve desde ese jugador; sin él, como partida del grupo. */
export function matchRow(m: Game, focus: FriendPlayer | null): string {
  const p = focus ?? m.mine[0];
  const civil = !focus && new Set(m.mine.map((q) => q.team)).size > 1;
  const res = civil ? 'civil' : p.win ? 'win' : 'loss';
  const label = { win: 'Victoria', loss: 'Derrota', civil: 'Guerra civil' }[res];
  return `<div class="match ${res}">
    <button class="match-head" data-toggle="${m.id}">
      <div class="mres"><b>${label}</b><span>${ago(m.start)}</span><span>${dur(m.duration)}</span></div>
      ${focus ? focusBody(m, focus) : groupBody(m)}
      <span class="chev" aria-hidden="true">▾</span>
    </button>
    <div class="scoreboard" id="sb-${m.id}" hidden></div>
  </div>`;
}

function focusBody(m: Game, p: FriendPlayer): string {
  const mates = m.mine.filter((q) => q !== p);
  return `<div class="mchamp">
      <span class="champ-lvl"><img class="ci lg" src="${champIcon(p)}" alt="" title="${esc(champName(p))}"><i>${p.level}</i></span>
      <div class="spells">${p.spells.map(spellImg).join('')}</div>
    </div>
    <div class="mkda"><b>${p.k} / <em>${p.d}</em> / ${p.a}</b><span>${ratio(p)} KDA</span></div>
    <div class="mstat"><b>${short(p.dmg)}</b><span>daño</span></div>
    <div class="items">${itemImgs(p)}</div>
    <div class="augs">${augImgs(p)}</div>
    <div class="mates">${mates.map((q) => `<img class="ci xs" src="${champIcon(q)}" title="${esc(q.friend.alias)} · ${esc(champName(q))}" style="--c:${q.friend.color}" alt="">`).join('')}</div>
    ${multiBadge(p)}`;
}

function groupBody(m: Game): string {
  return `<div class="squad">${m.mine.map((p) => `<div class="mate ${p.win ? 'w' : 'l'}" style="--c:${p.friend.color}">
      <img class="ci" src="${champIcon(p)}" alt="">
      <div><b>${esc(p.friend.alias)}</b><span>${p.k}/${p.d}/${p.a}</span></div>
      ${multiBadge(p)}
    </div>`).join('')}</div>`;
}

export function scoreboard(m: Game): string {
  const maxDmg = Math.max(...m.participants.map((p) => p.dmg), 1);
  const team = (id: TeamId) => {
    const ps = m.participants.filter((p) => p.team === id);
    if (!ps.length) return '';
    const sum = (key: 'k' | 'd' | 'a' | 'gold') => ps.reduce((n, p) => n + p[key], 0);
    return `<div class="team ${ps[0].win ? 'win' : 'loss'}">
      <div class="sb-row team-h">
        <b class="sb-res">${ps[0].win ? 'Victoria' : 'Derrota'}</b>
        <span class="sb-kda">${sum('k')} / ${sum('d')} / ${sum('a')}</span>
        <span class="sb-dmg">Daño</span>
        <span class="sb-gold">${short(sum('gold'))} oro</span>
      </div>
      ${ps.map((p) => `<div class="sb-row ${p.friend ? 'friend' : ''}" style="${p.friend ? `--c:${p.friend.color}` : ''}">
        <img class="ci sm" src="${champIcon(p)}" alt="">
        <div class="sb-name"><b>${esc(p.friend ? p.friend.alias : p.name)}</b><small>${esc(champName(p))} · nv ${p.level}</small></div>
        <div class="sb-kda"><b>${p.k}/${p.d}/${p.a}</b><small>${ratio(p)} KDA</small></div>
        <div class="sb-dmg" title="Daño a campeones: ${p.dmg.toLocaleString('es')}"><b>${short(p.dmg)}</b><span class="bar"><i style="width:${(p.dmg / maxDmg) * 100}%"></i></span></div>
        <div class="sb-gold">${short(p.gold)}</div>
        <div class="augs sm">${augImgs(p)}</div>
        <div class="items sm">${itemImgs(p)}</div>
      </div>`).join('')}
    </div>`;
  };
  return team(100) + team(200);
}
