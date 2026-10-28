import { state } from '../state';
import { computeAwards, type AwardDef, type AwardResult, type PlayerExtras } from '../stats/awards';
import type { FriendPlayer, Game } from '../types';
import { champName, profileIcon, splash } from '../ui/assets';
import { empty, who } from '../ui/components';
import { esc, pct, plural, short } from '../ui/format';

interface Award extends AwardDef {
  fmt: (s: PlayerExtras) => string;
  /** Campeón para el fondo de la tarjeta. */
  champ?: (s: PlayerExtras) => FriendPlayer | undefined;
}

// Agregar un premio = agregar una línea aquí.
const AWARDS: Award[] = [
  { id: 'coleccionista', title: 'Coleccionista', desc: 'Más campeones distintos jugados', value: (s) => s.distinct, fmt: (s) => `${s.distinct} campeones` },
  { id: 'onetrick', title: 'One-trick', desc: 'Más partidas con un mismo campeón', value: (s) => s.top?.s.games ?? 0, fmt: (s) => (s.top ? `${s.top.s.games} con ${esc(champName(s.top.p))}` : ''), champ: (s) => s.top?.p },
  { id: 'adicto', title: 'Adicto al caos', desc: 'Más partidas jugadas', value: (s) => s.games, fmt: (s) => `${s.games} partidas` },
  { id: 'mvp', title: 'MVP del grupo', desc: 'Más veces MVP (mejor puntaje del equipo ganador)', value: (s) => s.mvps, fmt: (s) => `${s.mvps} veces MVP` },
  { id: 'completo', title: 'El más completo', desc: 'Mejor puntaje promedio', avg: true, value: (s) => s.avgScore, fmt: (s) => `${s.avgScore.toFixed(1)} de puntaje` },
  { id: 'heroe', title: 'Héroe trágico', desc: 'Más veces ACE (el mejor del equipo que perdió)', value: (s) => s.aces, fmt: (s) => `${s.aces} veces ACE` },
  { id: 'talisman', title: 'Talismán', desc: 'Mejor winrate', avg: true, value: (s) => s.wr, fmt: (s) => `${pct(s.wr)} · ${s.wins}V ${s.losses}D` },
  { id: 'carnicero', title: 'Carnicero', desc: 'Más kills por partida', avg: true, value: (s) => s.avgK, fmt: (s) => `${s.avgK.toFixed(1)} kills` },
  { id: 'samaritano', title: 'Buen samaritano', desc: 'Más asistencias por partida', avg: true, value: (s) => s.avgA, fmt: (s) => `${s.avgA.toFixed(1)} asistencias` },
  { id: 'presente', title: 'Siempre presente', desc: 'Mayor participación en kills del equipo', avg: true, value: (s) => s.kp, fmt: (s) => `${pct(s.kp)} de participación` },
  { id: 'canon', title: 'Cañón de cristal', desc: 'Más daño a campeones por minuto', avg: true, value: (s) => s.dpm, fmt: (s) => `${Math.round(s.dpm)} daño/min` },
  { id: 'saco', title: 'Saco de boxeo', desc: 'Más daño recibido por partida', avg: true, value: (s) => s.avgTaken, fmt: (s) => `${short(s.avgTaken)} recibido` },
  { id: 'enfermero', title: 'Enfermero', desc: 'Más curación por partida', avg: true, value: (s) => s.avgHeal, fmt: (s) => `${short(s.avgHeal)} curado` },
  { id: 'carcelero', title: 'Carcelero', desc: 'Más segundos de control por partida', avg: true, value: (s) => s.cc, fmt: (s) => `${s.cc.toFixed(1)} s de CC` },
  { id: 'millonario', title: 'Millonario', desc: 'Más oro por minuto', avg: true, value: (s) => s.gpm, fmt: (s) => `${Math.round(s.gpm)} oro/min` },
  { id: 'inmortal', title: 'Inmortal', desc: 'Menos muertes por partida', avg: true, low: true, value: (s) => s.avgD, fmt: (s) => `${s.avgD.toFixed(1)} muertes` },
  { id: 'kamikaze', title: 'Kamikaze', desc: 'Más muertes por partida', avg: true, value: (s) => s.avgD, fmt: (s) => `${s.avgD.toFixed(1)} muertes` },
  { id: 'intocable', title: 'Intocable', desc: 'Más partidas sin morir', value: (s) => s.perfect, fmt: (s) => `${s.perfect} sin morir` },
  { id: 'multis', title: 'Rey de las multis', desc: 'Más pentakills (desempata por quadras)', value: (s) => s.pentas * 1000 + s.quadras, fmt: (s) => `${plural(s.pentas, 'penta')} · ${plural(s.quadras, 'quadra')}` },
  { id: 'imparable', title: 'Imparable', desc: 'Racha de victorias más larga', value: (s) => s.best, fmt: (s) => `${s.best} seguidas` },
  { id: 'maldito', title: 'Maldito', desc: 'Racha de derrotas más larga', value: (s) => s.worstRun, fmt: (s) => `${s.worstRun} seguidas` },
  { id: 'noctambulo', title: 'Noctámbulo', desc: 'Más partidas entre las 00:00 y las 06:00', value: (s) => s.night, fmt: (s) => `${s.night} de madrugada` },
];

export const awards = (ms: Game[]): AwardResult<Award>[] => computeAwards(AWARDS, ms, state.friends);

export function viewAwards(ms: Game[]): string {
  const list = awards(ms);
  if (!list.length) return empty();
  return `
    <section class="hero">
      <h1>Logros</h1>
      <p class="muted">Los premios por promedio exigen al menos ${list[0].min} partidas.</p>
    </section>
    <section class="awards">${list.map(awardCard).join('')}</section>`;
}

function awardCard({ def, ranking }: AwardResult<Award>): string {
  const [first, ...rest] = ranking;
  const champ = def.champ?.(first.s);
  return `<div class="award" style="--c:${first.f.color}">
    ${champ ? `<div class="rcard-bg" style="background-image:url('${splash(champ)}')"></div>` : ''}
    <span class="label">${def.title}</span>
    <span class="muted award-desc">${def.desc}</span>
    <a class="award-win" href="#/p/${first.f.slug}">
      <img class="avatar" src="${profileIcon(first.f.icon)}" alt="">
      <div><b>${esc(first.f.alias)}</b><span>${def.fmt(first.s)}</span></div>
    </a>
    ${rest.length ? `<ol class="podium" start="2">${rest.slice(0, 2).map((x) => `<li>${who(x.f)} <span class="muted">${def.fmt(x.s)}</span></li>`).join('')}</ol>` : ''}
  </div>`;
}
