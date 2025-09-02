# Repository Guidelines

## Project Structure & Module Organization
- `src/`: React + p5 front end. Key areas: `components/` (UI), `hooks/` (chart/game loop), `utils/` (helpers, data generation). Entry: `main.jsx`, root app: `App.tsx`.
- `public/`: Static assets served by Vite.
- `server/`: Express + Socket.IO + SQLite backend. Entry: `src/index.ts`; data access in `database/` (SQLite `schema.sql`, `connection.ts`); routes in `routes/`.
- Root configs: `package.json` (Vite app), `eslint.config.js`, `tsconfig*.json`, `vite.config.js`.

## Build, Test, and Development Commands
- Frontend dev: `npm install && npm run dev` (Vite on `http://localhost:5173`).
- Frontend build/preview: `npm run build` → `npm run preview`.
- Lint: `npm run lint` (ESLint rules in `eslint.config.js`).
- Server dev: `cd server && npm install && npm run dev` (Nodemon on `http://localhost:3001`).
- Server build/start: `cd server && npm run build && npm start`.
- Server seed: `cd server && npm run db:seed` (populate users, rounds, trades, events, metrics).
- Manual verification: use the Postman collection in `postman/` to read users/rounds and per-round trades/events/metrics.

## Coding Style & Naming Conventions
- Indentation: 2 spaces; use TypeScript in `.ts/.tsx` where practical.
- React: functional components, hooks first; component files `PascalCase.tsx` (e.g., `PnlOverlay.tsx`), hooks `useXyz.ts`, utilities `camelCase.ts`.
- Imports: absolute within `src/` discouraged; prefer relative grouped by feature directory.
- Linting: keep `eslint.config.js` passing; avoid unused vars (rule configured to ignore ALL_CAPS globals).

## Testing Guidelines
- Frameworks: none configured yet; prioritize deterministic checks via the replay system.
- Manual tests: start a round via Postman (`POST /api/game/start`), interact in the UI if desired, then complete/inspect via Postman.
- Coverage: when adding automated tests later, colocate under `src/**/__tests__` or `server/src/**/__tests__` and target core modules (`utils/`, `managers/`, DB access).

## Commit & Pull Request Guidelines
- Messages: imperative, present tense, concise (examples: “Add replay by seed,” “Fix socket reconnect handling”). Use a short scope when helpful (e.g., `server:` or `ui:`).
- PRs: include summary, linked issue, test steps, and screenshots/GIFs for UI. Note any schema or API changes and migration steps.
- Keep diffs focused; prefer small, reviewable changes.

## Security & Configuration Tips
- Local URLs are hardcoded (`5173` front end, `3001` server). For production, move these to env: `VITE_API_URL`, `VITE_SOCKET_URL`, and configure CORS in `server/src/index.ts`.
- Env: For team dev, `.env` files are committed with non-secret defaults; move sensitive values to host env for production. Consider ignoring DB files in long-lived branches to avoid binary diffs.
- Database: SQLite persists to `server/database/game.db` by default; override with `DATABASE_PATH` in `server/.env`.
