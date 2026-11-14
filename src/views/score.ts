// "¿Cómo se calcula el puntaje?": se arma con los pesos de stats/mvp.ts, así nunca queda desactualizada.

import { recordsOf } from '../stats/aggregate';
import { adjustedWr, baseWinrate, PRIORS } from '../stats/bayes';
import { DEATH_PENALTY, WEIGHTS, type ScorePart } from '../stats/mvp';
import type { Game } from '../types';
import { champName } from '../ui/assets';
import { medal, PART_LABEL, scoreTag, who } from '../ui/components';
import { ago, esc, pct } from '../ui/format';

const WHAT: Record<ScorePart, string> = {
  dmg: 'Daño a campeones',
  kda: '(Kills + asistencias) / muertes',
  kp: 'Participación en las kills de tu equipo',
  tank: 'Daño recibido + mitigado: lo que aguantaste',
  heal: 'Curación total',
  cc: 'Segundos de control (stuns, ralentizaciones…)',
  win: 'Ganar la partida',
  deaths: 'Muertes (resta)',
};

export function viewScore(ms: Game[]): string {
  const weights: [ScorePart, number][] = [
    ...(Object.entries(WEIGHTS) as [ScorePart, number][]).sort((a, b) => b[1] - a[1]),
    ['deaths', -DEATH_PENALTY],
  ];
  const max = Math.max(...weights.map(([, w]) => Math.abs(w)));
  const recs = recordsOf(ms);
  const top = recs.length ? recs.reduce((a, b) => (b.p.score > a.p.score ? b : a)) : null;
  const base = baseWinrate(recs);

  return `
    <section class="hero">
      <h1>¿Cómo se calcula el puntaje?</h1>
      <p class="muted">Un número de 0 a 10 para cada uno de los 10 jugadores de cada partida, al estilo del "OP Score".</p>
    </section>
    <div class="grid2">
      <section class="panel prose">
        <h2 class="panel-title">La idea</h2>
        <ol>
          <li>Cada estadística se compara con <b>la mejor de esa misma partida</b>: el que más daño hizo tiene 100% en daño, el que hizo la mitad tiene 50%. Así una partida de 60 kills y una de 20 se miden igual.</li>
          <li>Ese porcentaje se multiplica por el peso de la estadística y se suman.</li>
          <li>Ganar suma un poco; las muertes restan.</li>
          <li>El resultado se lleva a una escala de 0 a 10. Lo típico es 4–5; un 7 o más es una partidaza.</li>
        </ol>
        <p class="note">Pasa el mouse sobre cualquier puntaje para ver cuánto aportó cada estadística.</p>
      </section>
      <section class="panel">
        <h2 class="panel-title">Pesos</h2>
        <table class="tbl weights">
          <tbody>${weights.map(([k, w]) => `<tr>
            <td><b>${PART_LABEL[k]}</b><small class="muted">${WHAT[k]}</small></td>
            <td class="wbar"><span class="${w < 0 ? 'neg' : ''}" style="width:${(Math.abs(w) / max) * 100}%"></span></td>
            <td class="num"><b>${w < 0 ? '−' : ''}${Math.round(Math.abs(w) * 100)}%</b></td>
          </tr>`).join('')}</tbody>
        </table>
      </section>
    </div>
    <div class="grid2">
      <section class="panel prose">
        <h2 class="panel-title">Medallas</h2>
        <p>${medal('MVP')} El mejor puntaje del equipo que <b>ganó</b>.</p>
        <p>${medal('ACE')} El mejor puntaje del equipo que <b>perdió</b>: jugó bien aunque no alcanzó.</p>
        <p>${medal('PEOR')} El puntaje más bajo de los 10 jugadores, de cualquier equipo.</p>
        ${top ? `<h2 class="panel-title mt">El mejor puntaje del grupo</h2>
        <p>${who(top.p.friend)} con ${esc(champName(top.p))}: ${scoreTag(top.p.score, top.p.parts)} <span class="muted">· ${top.p.k}/${top.p.d}/${top.p.a} · ${ago(top.m.start)}</span></p>
        <table class="tbl"><tbody>${(Object.entries(top.p.parts) as [ScorePart, number][])
          .map(([k, v]) => `<tr><td>${PART_LABEL[k]}</td><td class="num ${v < 0 ? 'bad' : ''}">${v >= 0 ? '+' : '−'}${Math.abs(v).toFixed(2)}</td></tr>`).join('')}</tbody></table>` : ''}
      </section>
      <section class="panel prose">
        <h2 class="panel-title">De dónde salen los pesos</h2>
        <p>Se calibraron con una <b>regresión logística</b> sobre sus propias partidas: qué estadísticas separan mejor a los que ganan de los que pierden en <i>su</i> ARAM: Caos. Lo que más pesa es el <b>KDA</b> y <b>morir poco</b>, después el daño.</p>
        <p>No se copiaron tal cual: la regresión casi no le da valor al tanqueo ni al control, porque ese aporte no se ve en estas cifras, y con eso los tanques casi nunca serían MVP. Se les dejó un peso para que el puntaje mida "jugó bien su rol" y no solo "hizo daño".</p>
        <h2 class="panel-title mt">Winrate ajustado</h2>
        <p>En los rankings de "mejor/peor" se usa un winrate que le suma partidas con el promedio del grupo (${pct(base)}): con pocas partidas el número queda cerca del promedio; con muchas, cerca del real. Por ejemplo, para aumentos:</p>
        <ul>
          <li>2 de 2 → 100% real, <b>${pct(adjustedWr(2, 2, base, PRIORS.augment))}</b> ajustado</li>
          <li>15 de 20 → 75% real, <b>${pct(adjustedWr(15, 20, base, PRIORS.augment))}</b> ajustado</li>
          <li>60 de 80 → 75% real, <b>${pct(adjustedWr(60, 80, base, PRIORS.augment))}</b> ajustado</li>
        </ul>
        <p>Cuántas partidas se suman depende de cuánto varían de verdad los winrates en cada cosa, y se estimó con sus datos: <b>${PRIORS.augment}</b> para aumentos, <b>${PRIORS.champion}</b> para campeones y <b>${PRIORS.squad}</b> para dúos, tríos, compañeros y el logro Talismán (entre amigos los winrates casi no se alejan del 50%, así que hay que desconfiar más de una racha corta).</p>
      </section>
    </div>`;
}
