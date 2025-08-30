# Cash Trading Game

An interactive trading simulation built with React and p5.js. Play a simple hold‑to‑buy/release‑to‑sell game with random liquidation events. When the backend server is running, each round, trade, and event is logged to SQLite for later inspection.

## Features (Implemented)
- Real‑time candlestick chart (React + p5)
- Interactive trading (hold to buy, release to sell)
- Liquidations; rounds end on duration or liquidation
- Automatic logging to SQLite when server is running
- REST API + Postman collection to inspect data

## Run the UI
```
npm install
npm run dev
# open http://localhost:5173
```

## Run the Server
```
cd server
npm install
npm run dev               # dev with auto‑reload
# or
npm run build && npm start
```

Defaults
- API base: http://localhost:3001
- Env: `server/.env` (PORT, CLIENT_ORIGIN, optional DATABASE_PATH), root `.env` (VITE_API_URL)

## Postman & API
- Import `postman/CashTradingGame.postman_collection.json`
- Optional environment: set `api_base` (defaults to http://localhost:3001)
- Useful reads:
  - `GET /api/users`
  - `GET /api/game/rounds`
  - `GET /api/game/history?limit=10`
  - `GET /api/game/round/:id`
  - `GET /api/game/round/:id/{trades|events|metrics}`
- Admin:
  - `POST /api/admin/clear` with `{ keepTestUser: true|false }`

## Data Management
- Seed sample data: `cd server && npm run db:seed`
- Clear data (keep Test Player): `cd server && npm run db:clear`

Note: Locally, new rounds associate with the seeded Test Player (`0x1234567890abcdef`). Replace with real auth for multi‑user setups.
