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

1. Зарегистрируйтесь на [upstash.com](https://upstash.com), создайте Redis DB.
2. Скопируйте **REST URL** и **REST TOKEN**.
3. В Vercel → Project → Settings → Environment Variables:
   - `UPSTASH_REDIS_REST_URL`
   - `UPSTASH_REDIS_REST_TOKEN`
4. Redeploy.

Проверка: `GET /health` → `"persist":"upstash"` (или `"file"` локально, `"memory"` без Redis на Vercel).

### Поведение входа

- Закрыли вкладку и открыли снова → `restoreSession` поднимает **ту же** комнату (пока жив токен в `localStorage` и запись в persist).
- Кнопка «Войти и открыть лобби» → **новая** комната (старое лобби с тем же названием закрывается).
