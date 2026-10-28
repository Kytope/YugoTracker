// Buscador global de la cabecera: jugadores, campeones y aumentos. Combobox accesible con teclado.

import { state } from '../state';
import { recordsOf } from '../stats/aggregate';
import { byAugment } from '../stats/augments';
import { matchScore } from '../utils/text';
import { augInfo, champIcon, champName, profileIcon } from './assets';
import { esc } from './format';

interface Hit {
  kind: 'Jugador' | 'Campeón' | 'Aumento';
  label: string;
  sub: string;
  img: string;
  /** Textos contra los que se compara la búsqueda. */
  keys: string[];
  go: () => void;
}

const KIND_ORDER = { Jugador: 0, Campeón: 1, Aumento: 2 };
const MAX = 8;

/** `navigate` cambia el hash, o vuelve a dibujar si ya estamos ahí (para aplicar filtros). */
export function setupSearch(navigate: (hash: string) => void): void {
  const input = document.getElementById('gsearch') as HTMLInputElement;
  const list = document.getElementById('gsearch-list') as HTMLUListElement;
  const index = buildIndex(navigate);
  let shown: Hit[] = [];
  let active = 0;

  const close = () => {
    list.hidden = true;
    input.setAttribute('aria-expanded', 'false');
    input.removeAttribute('aria-activedescendant');
  };

  const render = () => {
    const q = input.value.trim();
    shown = q
      ? index
          .map((h) => ({ h, s: Math.max(...h.keys.map((k) => matchScore(k, q))) }))
          .filter((x) => x.s > 0)
          .sort((a, b) => b.s - a.s || KIND_ORDER[a.h.kind] - KIND_ORDER[b.h.kind] || a.h.label.localeCompare(b.h.label))
          .slice(0, MAX)
          .map((x) => x.h)
      : [];
    active = 0;
    if (!q) return close();
    list.innerHTML = shown.length
      ? shown.map((h, i) => `<li id="gs-${i}" role="option" data-i="${i}" aria-selected="${i === active}">
          <img src="${h.img}" alt=""><span><b>${esc(h.label)}</b><small>${h.kind} · ${esc(h.sub)}</small></span></li>`).join('')
      : '<li class="gs-empty" role="option" aria-disabled="true">Sin resultados</li>';
    list.hidden = false;
    input.setAttribute('aria-expanded', 'true');
    highlight();
  };

  const highlight = () => {
    list.querySelectorAll<HTMLLIElement>('li[data-i]').forEach((li) => li.setAttribute('aria-selected', String(Number(li.dataset.i) === active)));
    if (shown.length) input.setAttribute('aria-activedescendant', `gs-${active}`);
    list.querySelector(`#gs-${active}`)?.scrollIntoView({ block: 'nearest' });
  };

  const pick = (i: number) => {
    const hit = shown[i];
    if (!hit) return;
    input.value = '';
    close();
    input.blur();
    hit.go();
  };

  input.addEventListener('input', render);
  input.addEventListener('focus', () => input.value && render());
  input.addEventListener('blur', () => setTimeout(close, 120));
  input.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      if (!shown.length) return;
      active = (active + (e.key === 'ArrowDown' ? 1 : -1) + shown.length) % shown.length;
      highlight();
    } else if (e.key === 'Enter') {
      e.preventDefault();
      pick(active);
    } else if (e.key === 'Escape') {
      input.value = '';
      close();
      input.blur();
    }
  });
  // mousedown (no click) para que corra antes del blur del input.
  list.addEventListener('mousedown', (e) => {
    const li = (e.target as Element).closest<HTMLLIElement>('li[data-i]');
    if (!li) return;
    e.preventDefault();
    pick(Number(li.dataset.i));
  });
  list.addEventListener('mousemove', (e) => {
    const li = (e.target as Element).closest<HTMLLIElement>('li[data-i]');
    if (li && Number(li.dataset.i) !== active) {
      active = Number(li.dataset.i);
      highlight();
    }
  });

  // "/" o Ctrl+K enfocan el buscador, salvo que ya se esté escribiendo en otro campo.
  document.addEventListener('keydown', (e) => {
    const typing = (e.target as Element).closest('input, textarea, select, [contenteditable]');
    if ((e.key === '/' && !typing) || (e.key.toLowerCase() === 'k' && (e.ctrlKey || e.metaKey))) {
      e.preventDefault();
      input.focus();
      input.select();
    }
  });
}

function buildIndex(navigate: (hash: string) => void): Hit[] {
  const recs = recordsOf(state.matches);

  const players: Hit[] = state.friends.map((f) => ({
    kind: 'Jugador',
    label: f.alias,
    sub: `${f.gameName}#${f.tagLine}`,
    img: profileIcon(f.icon),
    keys: [f.alias, f.gameName, `${f.gameName}#${f.tagLine}`],
    go: () => navigate(`#/p/${f.slug}`),
  }));

  const champCount = new Map<number, { p: (typeof recs)[number]['p']; n: number }>();
  for (const r of recs) {
    const e = champCount.get(r.p.champId) ?? { p: r.p, n: 0 };
    e.n++;
    champCount.set(r.p.champId, e);
  }
  const champs: Hit[] = [...champCount.values()].map(({ p, n }) => ({
    kind: 'Campeón',
    label: champName(p),
    sub: `${n} ${n === 1 ? 'partida' : 'partidas'}`,
    img: champIcon(p),
    keys: [champName(p)],
    go: () => navigate(`#/c/${p.champId}`),
  }));

  const augs: Hit[] = byAugment(recs)
    .filter((e) => augInfo(e.id).icon)
    .map((e) => {
      const info = augInfo(e.id);
      return {
        kind: 'Aumento',
        label: info.name,
        sub: `elegido ${e.n} ${e.n === 1 ? 'vez' : 'veces'}`,
        img: info.icon!,
        keys: [info.name],
        go: () => {
          state.augQ = info.name;
          state.augRarity = '';
          navigate('#/aumentos');
        },
      };
    });

  return [...players, ...champs, ...augs];
}
