# Ozone Inc.

Ozone Inc. is an educational science game for high school students (grades 9 to 10). The player controls Earth's
atmosphere and tries to make the planet warmer by strengthening the greenhouse effect: unlocking
and upgrading real human activities such as coal power, livestock farming and fertilizer use. Every
temperature change comes from a simplified but scientifically sourced climate model, so the player
learns how emissions, greenhouse gases, infrared radiation and temperature are actually connected.

The engine (simulation, game state, mechanics) is plain TypeScript and runs entirely in the browser. There is no need for a server.

## Requirements

- Node.js `^22.13.0` or `>=24.0.0`
- npm

## Getting started

```bash
npm install
npm run dev
```

Then open <http://localhost:5173/> for the game, or <http://localhost:5173/dev.html> for the
numbers page, which shows every value the engine calculates.

## Features

- Based on formulas from real life climate scientists to simulate data
- Fun interactive gameplay
- An OST tuned with Elevenlabs

## What We Used

- TypeScript
- View3
- Audio made with Elevenlabs
- Three.js - 3D graphics rendering
- Globe.gl - 3D mapping
- World-Atlas - geographic data on country boundaries
- Topojson-client - formatting
- d3-geo - transforms the spherical globe into a 2D circle

## Scripts

| Command                 | What it does                                                      |
| ----------------------- | ----------------------------------------------------------------- |
| `npm run dev`           | Start the Vite dev server with live reload                        |
| `npm run build`         | Type check, then build the site into `dist/`                      |
| `npm run preview`       | Serve the built `dist/` folder locally                            |
| `npm test`              | Run all tests once (Vitest)                                       |
| `npm run test:watch`    | Re run tests whenever a file changes                              |
| `npm run typecheck`     | Type check the project, plus a stricter check of the engine       |
| `npm run lint`          | Lint with ESLint                                                  |
| `npm run format`        | Format all files with Prettier                                    |
| `npm run format:check`  | Check formatting without changing files                           |
| `npm run check`         | Typecheck + lint + format check + tests (run before committing)   |
| `npm run build:regions` | Download IPCC Atlas data and rebuild the per country climate file |

## Project structure

```text
src/core/      Game engine: simulation, state, mechanics (no browser APIs)
src/dev-ui/    Game screen (main.ts) and numbers page (numbers-page.ts)
index.html     The game
dev.html       Numbers page, for checking the engine
tests/         Project wide tests (for example: keyboard characters only)
scripts/       Data build scripts
```

`src/core/regional-climate.generated.ts` is produced by `npm run build:regions`. The raw download
(about 65 MB) is cached in `data/ipcc-atlas/`, which is not committed.

## Credits

- Country shapes: Natural Earth via the `world-atlas` package.
- Regional climate data: IPCC WGI AR6 Atlas repository (Iturbide et al., 2022), CMIP6 regional
  averages, licensed CC BY 4.0, <https://github.com/IPCC-WG1/Atlas>. Reference regions: Iturbide et
  al. (2020).
- Scientific sources are listed next to each value in `src/core/science/constants.ts`.
