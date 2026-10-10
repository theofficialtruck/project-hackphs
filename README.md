# Atmospheric Science Game

An educational science game for high school students (grades 9 to 10). The player controls Earth's
atmosphere and tries to make the planet warmer by strengthening the greenhouse effect: unlocking
and upgrading real human activities such as coal power, livestock farming and fertilizer use. Every
temperature change comes from a simplified but scientifically sourced climate model, so the player
learns how emissions, greenhouse gases, infrared radiation and temperature are actually connected.

The engine (simulation, game state, mechanics) is plain TypeScript and runs entirely in the browser. There is no server.

## Requirements

- Node.js `^22.13.0` or `>=24.0.0`
- npm

## Getting started

```bash
npm install
npm run dev
```

Then open <http://localhost:5173/dev.html> for the development UI. `index.html` is reserved for the
final UI.

## Scripts

| Command                | What it does                                                    |
| ---------------------- | --------------------------------------------------------------- |
| `npm run dev`          | Start the Vite dev server with live reload                      |
| `npm run build`        | Type check, then build the site into `dist/`                    |
| `npm run preview`      | Serve the built `dist/` folder locally                          |
| `npm test`             | Run all tests once (Vitest)                                     |
| `npm run test:watch`   | Re run tests whenever a file changes                            |
| `npm run typecheck`    | Type check the project, plus a stricter check of the engine     |
| `npm run lint`         | Lint with ESLint                                                |
| `npm run format`       | Format all files with Prettier                                  |
| `npm run format:check` | Check formatting without changing files                         |
| `npm run check`        | Typecheck + lint + format check + tests (run before committing) |

## Project structure

```text
src/core/      Game engine: simulation, state, mechanics (no browser APIs)
src/dev-ui/    Temporary development UI (served by dev.html)
dev.html       Development UI page
index.html     Final UI page (placeholder until the UI developer replaces it)
```
