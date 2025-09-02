# Debug Overlay & Balance Tools

The app includes an optional, developer‑only debug overlay that can be enabled locally to inspect state and control the game. It is designed to be transparent and anchored to the top‑center of the screen so it stays out of the way.

## Enable Debug Mode
- URL flag: append `?debug=true` to the game URL (e.g., `http://localhost:5173/?debug=true`).
- When enabled, a compact overlay appears with pause/resume controls and live round metadata.

## What It Shows
- API: connection status and base URL
- Round: `round_id`, `seed`, candle count, status (ACTIVE/COMPLETED)
- User: `user_id`, `wallet`
- Copy buttons for IDs/seed

## Controls
- Pause: freezes candle generation and input handling
- Resume: continues the current round
- Change Balance: adjust the in‑game balance during the current round
  - Local change: updates the runtime balance (UI/game only)
  - Persist change (optional): update the user’s balance in the database

## Persisting Balance to DB (Recommended Endpoint)
Add an admin endpoint to update balance, then call it from the overlay when “Persist to DB” is enabled.
- `POST /api/admin/user/balance`
- Body:
  ```json
  { "userId": "<id>", "balance": 2500.00 }
  ```
- Response: `{ success: true, user: { id, wallet_address, balance, ... } }`

Example (cURL):
```
curl -X POST \
  -H "Content-Type: application/json" \
  -d '{"userId":"<USER_ID>","balance":2500}' \
  http://localhost:3001/api/admin/user/balance
```

## Guardrails
- Overlay is only shown when `debug=true` to avoid accidental exposure.
- Keep the endpoint admin‑only and disable/remove in production builds or protect via auth.
- Log all admin balance changes with timestamp + actor if used beyond local dev.
