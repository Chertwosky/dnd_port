# DnD Mobile Desktop

Monorepo for a mobile-first tabletop:
- `apps/mobile` player app
- `apps/master-web` GM desktop web app
- `apps/server` API + session host
- `packages/shared-types` shared domain contracts
- `packages/rules-engine` deterministic rules and calculators

## Persistence (сессии и стол)

State (лобби, карта, бой, журнал, персонажи) сохраняется между перезапусками.

| Где | Как |
|---|---|
| Локально | JSON в `apps/server/.data/persist/` (автоматически) |
| Vercel | **Upstash Redis** — без него cold start сотрёт стол |

### Upstash для Vercel (5 минут)

1. Vercel Marketplace → **Upstash for Redis** (или CLI: `vercel integration add upstash/upstash-kv`).
2. Ресурс подключается к проекту и добавляет `KV_REST_API_URL` / `KV_REST_API_TOKEN` (наш сервер их читает).
3. Redeploy.

Проверка: `GET /health` → `"persist":"upstash"` (или `"file"` локально, `"memory"` без Redis на Vercel).

### Поведение входа

- Закрыли вкладку и открыли снова → `restoreSession` поднимает **ту же** комнату (пока жив токен в `localStorage` и запись в persist).
- Кнопка «Войти и открыть лобби» → **новая** комната (старое лобби с тем же названием закрывается).
