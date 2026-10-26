# Caos Tracker

Página para seguir las partidas de **ARAM: Caos** (cola `2400`) del grupo: winrate, KDA, main, campeones, sinergias, aumentos, logros y récords.

Hecha con TypeScript y Vite. Requiere Node 22.12 o superior.

## Cómo funciona

- `scripts/sync.ts` lee las partidas desde el **cliente de League abierto en tu PC** y las guarda en `public/data/matches.json`. Solo agrega las nuevas y nunca borra las anteriores.
- La página (`src/`) lee ese JSON y calcula todo en el navegador. Los íconos y nombres vienen de Data Dragon y CommunityDragon.

### Por qué el cliente y no la API de Riot

Riot no expone ARAM: Caos en su API pública: las partidas no aparecen en el historial, y pedirlas directamente devuelve 403. El cliente de League sí las tiene, y desde una sola PC puede leer el historial de todos los del grupo. No hace falta API key.

**Limitación:** el cliente solo entrega las **~20 partidas más recientes** de cada jugador. Por eso hay que sincronizar seguido (ver "Sincronización automática").

## Uso

```sh
npm install
npm run sync      # guarda las partidas nuevas (con el cliente abierto)
npm run dev       # página en http://localhost:5173, se recarga al editar
```

| Comando | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo |
| `npm run build` | Revisa tipos y genera la página final en `dist/` |
| `npm run preview` | Sirve `dist/` para revisar el build |
| `npm test` | Pruebas de las estadísticas |
| `npm run typecheck` | Solo revisa tipos |
| `npm run sync` | Sincroniza partidas |
| `npm run sync:full` | Sincroniza sin cortar en la primera partida ya conocida |

Los jugadores se editan en `config/players.json` (`Nombre#TAG`; el `alias` es el nombre que se muestra).

## Estructura

```
src/
  shared/types.ts   formato de matches.json (lo comparten la página y sync.ts)
  types.ts          tipos de la página (amigos, partidas enriquecidas)
  config.ts         constantes: URLs, colores, periodos
  state.ts          estado de la página y filtro por periodo
  main.ts           arranque, router y eventos
  data/             carga de partidas, Data Dragon y aumentos
  stats/            cálculos puros (sin DOM): totales, sinergias, aumentos, logros
  ui/               formato, imágenes, piezas reutilizables, filas de partida
  views/            una vista por sección del menú
  styles.css
scripts/
  sync.ts           sincronización desde el cliente
  auto-sync.ps1     lo que ejecuta la tarea programada
  install-auto-sync.ps1
tests/              pruebas de stats/ con Vitest
```

Para agregar un logro: una línea en `AWARDS` de `src/views/awards.ts`.

## Sincronización automática

Una tarea programada de Windows corre `scripts/auto-sync.ps1` cada 15 minutos:

- Si el cliente de League está cerrado, no hace nada.
- Si está abierto, guarda las partidas nuevas y deja una línea en `logs/sync.log`.
- Si el proyecto es un repo de git con remoto, sube los datos nuevos con commit y push, y GitHub Pages se actualiza sola.

```powershell
powershell -ExecutionPolicy Bypass -File scripts/install-auto-sync.ps1              # instalar
powershell -ExecutionPolicy Bypass -File scripts/install-auto-sync.ps1 -Minutes 10  # cambiar el intervalo
powershell -ExecutionPolicy Bypass -File scripts/install-auto-sync.ps1 -Uninstall   # quitar
```

## Publicarla gratis (GitHub Pages)

1. Sube el proyecto a un repositorio de GitHub (rama `main`).
2. En **Settings → Pages**, en *Source* elige **GitHub Actions**.
3. Cada `git push` corre `.github/workflows/deploy.yml`: pruebas, build y publicación de `dist/`.

## Notas

- Las partidas "remake" se excluyen de las estadísticas.
- Si dos amigos cayeron en equipos contrarios, la partida aparece como **Guerra civil**.
