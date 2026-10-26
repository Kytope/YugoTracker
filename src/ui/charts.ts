// Gráficos con Chart.js. Las vistas generan HTML como texto, así que `chart()` deja un <canvas>
// marcado y guarda su configuración; main.ts llama a mountCharts() después de insertar el HTML.

import {
  BarController, BarElement, CategoryScale, Chart, Filler, Legend, LinearScale,
  LineController, LineElement, PointElement, Tooltip, type ChartConfiguration,
} from 'chart.js';

Chart.register(BarController, BarElement, LineController, LineElement, PointElement, CategoryScale, LinearScale, Tooltip, Legend, Filler);

/** Los mismos colores que los tokens de styles.css, en hex para el canvas. */
export const C = {
  win: '#4f8ce6',
  loss: '#d6535c',
  accent: '#8b8cf0',
  text: '#e9ecf1',
  text2: '#c5cad3',
  muted: '#9aa1ad',
  grid: '#272b31',
  surface: '#1a1d21',
};

Chart.defaults.font.family = 'Inter, system-ui, sans-serif';
Chart.defaults.font.size = 12;
Chart.defaults.color = C.muted;
Chart.defaults.borderColor = C.grid;
// Ojo: no reemplazar el objeto de animación entero (pierde la función de easing y Chart.js falla).
if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) Chart.defaults.animation = false;
else if (Chart.defaults.animation) Chart.defaults.animation.duration = 250;
Chart.defaults.maintainAspectRatio = false;
Chart.defaults.plugins.legend.labels.boxWidth = 10;
Chart.defaults.plugins.legend.labels.boxHeight = 10;
Chart.defaults.plugins.legend.labels.color = C.text2;
Object.assign(Chart.defaults.plugins.tooltip, {
  backgroundColor: '#0f1114',
  borderColor: '#33383f',
  borderWidth: 1,
  titleColor: C.text,
  bodyColor: C.text2,
  padding: 10,
  cornerRadius: 6,
  boxPadding: 4,
  titleFont: { weight: 600 },
});

type AnyConfig = ChartConfiguration<'bar' | 'line', number[], string>;

let pending: AnyConfig[] = [];
let live: Chart[] = [];

/** Reserva un gráfico. Devuelve el HTML del contenedor; el gráfico se crea en mountCharts(). */
export function chart(config: AnyConfig, height = 200, label = ''): string {
  pending.push(config);
  return `<div class="chart" style="height:${height}px"><canvas data-chart="${pending.length - 1}" role="img" aria-label="${label}"></canvas></div>`;
}

export function mountCharts(root: ParentNode): void {
  for (const c of live) c.destroy();
  live = [];
  root.querySelectorAll<HTMLCanvasElement>('canvas[data-chart]').forEach((canvas) => {
    const config = pending[Number(canvas.dataset.chart)];
    if (config) live.push(new Chart(canvas, config as ChartConfiguration));
  });
  pending = [];
}

// ---------- Recetas ----------

/** Escala Y sobria: solo líneas horizontales tenues, sin borde. */
const yAxis = (extra: object = {}) => ({
  beginAtZero: true,
  border: { display: false },
  grid: { color: C.grid },
  ticks: { precision: 0, maxTicksLimit: 5 },
  ...extra,
});
const xAxis = (extra: object = {}) => ({
  border: { display: false },
  grid: { display: false },
  ...extra,
});

/** Barras apiladas de victorias/derrotas. */
export function winLossBars(labels: string[], w: number[], l: number[], titles: string[] = labels): AnyConfig {
  const seg = { borderColor: C.surface, borderWidth: { top: 2 }, borderRadius: 3, borderSkipped: false as const, maxBarThickness: 28 };
  return {
    type: 'bar',
    data: {
      labels,
      datasets: [
        { label: 'Victorias', data: w, backgroundColor: C.win, ...seg },
        { label: 'Derrotas', data: l, backgroundColor: C.loss, ...seg },
      ],
    },
    options: {
      interaction: { mode: 'index', intersect: false },
      scales: { x: xAxis({ stacked: true, ticks: { maxRotation: 0, autoSkipPadding: 8 } }), y: yAxis({ stacked: true }) },
      plugins: {
        legend: { position: 'top', align: 'end' },
        tooltip: {
          callbacks: {
            title: (items) => titles[items[0].dataIndex],
            footer: (items) => {
              const i = items[0].dataIndex;
              const n = w[i] + l[i];
              return n ? `Winrate ${Math.round((w[i] / n) * 100)}%` : 'Sin partidas';
            },
          },
        },
      },
    },
  };
}

/** Barras horizontales, una por jugador, en su color. */
export function rankingBars(labels: string[], values: number[], colors: string[], fmt: (v: number) => string): AnyConfig {
  return {
    type: 'bar',
    data: { labels, datasets: [{ data: values, backgroundColor: colors, borderRadius: 4, borderSkipped: 'start', barThickness: 18 }] },
    options: {
      indexAxis: 'y',
      scales: {
        x: yAxis({ ticks: { maxTicksLimit: 6, callback: (v: number | string) => fmt(Number(v)) } }),
        y: xAxis({ ticks: { color: C.text2, font: { weight: 600 } } }),
      },
      plugins: { legend: { display: false }, tooltip: { callbacks: { label: (item) => fmt(Number(item.raw)) } } },
    },
  };
}

/** Línea partida a partida con puntos de victoria/derrota y el promedio punteado. */
export function perGameLine(
  labels: string[], values: number[], wins: boolean[], tips: string[][], fmt: (v: number) => string, name: string,
): AnyConfig {
  const avg = values.reduce((a, b) => a + b, 0) / Math.max(1, values.length);
  const dot = wins.map((w) => (w ? C.win : C.loss));
  return {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: name, data: values, borderColor: C.accent, borderWidth: 2, tension: 0.3,
          pointBackgroundColor: dot, pointBorderColor: C.surface, pointBorderWidth: 2, pointRadius: 4, pointHoverRadius: 6,
          fill: { target: 'origin', above: 'rgba(139, 140, 240, 0.08)' },
        },
        {
          label: `Promedio ${fmt(avg)}`, data: values.map(() => avg), borderColor: C.muted, borderWidth: 1.5,
          borderDash: [5, 4], pointRadius: 0, pointHitRadius: 0,
        },
      ],
    },
    options: {
      interaction: { mode: 'index', intersect: false },
      scales: {
        x: xAxis({ ticks: { maxRotation: 0, autoSkipPadding: 12 } }),
        y: yAxis({ ticks: { maxTicksLimit: 5, callback: (v: number | string) => fmt(Number(v)) } }),
      },
      plugins: {
        legend: {
          position: 'top',
          align: 'end',
          onClick: () => {},
          labels: {
            usePointStyle: true,
            // Leyenda propia: el color del punto es el resultado, la línea punteada el promedio.
            generateLabels: () => [
              { text: 'Victoria', fillStyle: C.win, strokeStyle: C.win, pointStyle: 'circle', fontColor: C.text2 },
              { text: 'Derrota', fillStyle: C.loss, strokeStyle: C.loss, pointStyle: 'circle', fontColor: C.text2 },
              { text: `Promedio ${fmt(avg)}`, strokeStyle: C.muted, lineWidth: 1.5, lineDash: [5, 4], pointStyle: 'line', fontColor: C.text2 },
            ],
          },
        },
        tooltip: {
          filter: (item) => item.datasetIndex === 0,
          callbacks: {
            title: (items) => tips[items[0].dataIndex][0],
            label: (item) => `${name}: ${fmt(Number(item.raw))}`,
            afterLabel: (item) => tips[item.dataIndex].slice(1),
          },
        },
      },
    },
  };
}
