# Cronograph Handover State & Project Context

## 📋 Project Overview
**Cronograph** is a high-performance quantitative analysis dashboard for crypto assets (starting with Bitcoin). It transforms raw market data into statistical insights using a premium fintech/crypto aesthetic.

## 🛠️ Technology Stack
- **Frontend**: Next.js 16 (Turbopack), Tailwind CSS, Framer Motion, Recharts, `lightweight-charts` v5.
- **Backend**: FastAPI (Python), PostgreSQL with TimescaleDB.
- **Infrastructure**: Docker Compose (Multi-container setup).
- **Current Network Ports**:
  - **Frontend**: `http://localhost:3002` (Port 3001 is currently occupied by a system ghost process).
  - **Backend API**: `http://localhost:8001`.

---

## 🚩 Critical Problems & Solutions Adopted
If the next agent encounters issues, refer to these solved cases:

1. **Hydration Mismatch (React)**:
   - *Issue*: Server/Client time and number formatting didn't match.
   - *Solution*: Forced `toLocaleString('en-US')` on all numeric outputs and used `date-fns` for consistent date rendering.

2. **Docker Volume Shadowing**:
   - *Issue*: The backend `.venv` was being overwritten by the host volume mount, breaking the Python runtime.
   - *Solution*: Added an anonymous volume in `docker-compose.yml` (`- /app/.venv`) to isolate the virtual environment while allowing hot-reloading of source code.

3. **Port Conflict (The "Ghost" 3001)**:
   - *Issue*: Changes were not reflecting because a non-Docker process was occupying port 3001.
   - *Solution*: Project moved to **Port 3002**. Always verify changes on `:3002`.

4. **Next.js Rebuild Failures**:
   - *Issue*: Changes occasionally don't show due to aggressive Turbopack caching or TypeScript errors during build.
   - *Solution*: Run `docker compose stop frontend && docker compose rm -f frontend && docker compose up -d frontend` to force a clean restart with fresh anonymous volumes.
   - **⚠️ Important**: Never use just `--build` to update a container that has anonymous volumes for `node_modules` or `.next` — Docker reuses the old volume and the new packages won't appear. Always remove the container first.

5. **Stale `node_modules` Anonymous Volume**:
   - *Issue*: After adding `lightweight-charts` to `package.json` and rebuilding the image, the module was still not found in the dev server. Docker reused the old anonymous volume (created before the package was added).
   - *Solution*: `docker compose rm -f frontend && docker compose up -d frontend`. This discards the old anonymous volume and populates a fresh one from the newly built image.
   - **Rule**: Any time a new npm package is added, use remove + up (not just `--build`).

6. **Backend Missing Imports (`NameError: List not defined`)**:
   - *Issue*: `backend/src/cronograph/api/routes/analysis.py` used `List`, `select`, and `Candle` without importing them, causing the backend container to crash on startup.
   - *Solution*: Added the three missing imports: `from typing import List`, `from sqlalchemy import select`, `from cronograph.models.candle import Candle`.

7. **`lightweight-charts` v5 API Breaking Changes**:
   - *Issue*: The codebase used the v4 API (`chart.addCandlestickSeries()`, `series.setMarkers()`), but the installed version is **v5.2.0**, which removed these methods.
   - *Solution*: Updated `price-chart.tsx` to use the v5 API:
     - `chart.addCandlestickSeries({...})` → `chart.addSeries(CandlestickSeries, {...})`
     - `series.setMarkers([...])` → `createSeriesMarkers(series, [...])`
     - Import `CandlestickSeries` and `createSeriesMarkers` from `lightweight-charts`.
   - Also updated `analysis/page.tsx` to type markers as `SeriesMarker<Time>[]` instead of `any[]`.

8. **Turbopack File Watching Broken in Docker on Windows**:
   - *Issue*: After fixing backend and initial analysis page render, changes to frontend files weren't being detected by Turbopack running in Docker. Page refresh required full rebuild or showed cached content. Root cause: Turbopack uses native Linux inotify for file watching, which doesn't work with Windows bind mounts in Docker Compose.
   - *Solution*: Created `frontend/Dockerfile.dev` with Webpack backend (`next dev --webpack`), added `"dev:docker": "next dev --webpack -H 0.0.0.0"` script to `package.json`, and configured polling in `next.config.ts` with `watchOptions: { poll: 1000, aggregateTimeout: 300 }` when `WATCHPACK_POLLING=true`. Updated `docker-compose.yml` frontend service to use the new Dockerfile and set `WATCHPACK_POLLING=true`, `CHOKIDAR_USEPOLLING=true`, and removed the `/app/.next` anonymous volume that was preventing polling from working.
   - **Note**: Webpack with polling is slower than Turbopack with inotify, but it's reliable on Windows. For production or local development without Docker, Turbopack works perfectly.

9. **Database Migrations Not Running on Container Startup**:
   - *Issue*: When analysis endpoint was called, got error `relation 'candles' does not exist`. The backend container wasn't running Alembic migrations automatically.
   - *Solution*: Created `backend/entrypoint.sh` script that runs `uv run alembic upgrade head` before starting uvicorn. Updated `backend/Dockerfile` CMD to use this script. Also fixed `backend/migrations/env.py` to read `DATABASE_URL` from environment and convert asyncpg URLs to psycopg2 format (required by Alembic).
   - **File changes**:
     - `backend/entrypoint.sh` (NEW): Two-stage initialization script
     - `backend/Dockerfile`: Updated CMD from `CMD ["uvicorn", ...]` to `CMD ["sh", "./entrypoint.sh"]`
     - `backend/migrations/env.py`: Added environment variable reading and URL format conversion

10. **Analysis Form Calling Wrong Symbol Endpoint**:
    - *Issue*: The analysis form was fetching from `GET /symbols/` (Binance API cache, slow and unreliable) instead of `GET /extractions/symbols` (local database query). This caused: (1) slow dropdown loading on page refresh, (2) occasional timeout errors when Binance API was slow, (3) user could select symbols without local extracted data, leading to "No data found" errors. Also had secondary issue: useEffect with dependencies `[API_URL, symbol]` caused unnecessary re-fetches whenever symbol changed.
    - *Solution*: 
      - Changed endpoint from `${API_URL}/symbols/` to `${API_URL}/extractions/symbols` in `analysis-form.tsx`
      - Simplified useEffect dependency to just `[API_URL]` (removing `symbol` prevents race condition)
      - Introduced typed state machine: `type SymbolsState = { status: "loading" | "ready" | "empty" | "error"; ... }` for proper UX feedback
      - Added cancellation flag pattern to prevent memory leaks from stale requests
      - Updated dropdown UI to show "Loading…", "No data extracted yet", or error messages
      - Changed `setSymbol((prev) => prev || data[0])` pattern to use function form, avoiding re-trigger of useEffect
    - **Architecture note**: Two endpoints exist for a reason. `/symbols/` is for discovery (extraction form), `/extractions/symbols` is for analysis (only user's own data).

11. **Missing Error Feedback on Analysis Page**:
    - *Issue*: When analysis requests failed, generic `alert("Network error")` or console errors left user confused. No visual feedback on the page about what went wrong.
    - *Solution*: Added `errorMsg` state in `analysis/page.tsx`, replaced alerts with specific error messages displayed in a styled banner. Error handling now distinguishes between HTTP errors (with backend detail messages), parsing errors, and network timeouts. Users see: `"Analysis failed: [specific error]"` with dismissible banner.

12. **Price Chart Performance Regression with 20k+ Candles**:
    - *Issue*: When analysis results arrived with 20k+ candlestick data points, the chart would become very slow (hundreds of milliseconds per update). Root cause: single useEffect was destroying and recreating the entire chart on every data or marker change.
    - *Solution*: Refactored `price-chart.tsx` into 3 separate useEffects with single responsibilities:
      - **First useEffect ([] deps)**: Creates chart once, sets up resize listener, cleanup removes chart
      - **Second useEffect ([data])**: Only calls `series.setData()` and `chart.timeScale().fitContent()` — no recreation
      - **Third useEffect ([markers])**: Updates markers via plugin API with `markersRef.current.setMarkers(markers)` or creates plugin if needed
      - Added refs for `chart`, `series`, and markers plugin to maintain state across renders
    - **Result**: Update time reduced from hundreds of milliseconds to <50ms with same 20k candle dataset.

13. **Recharts v3 Compatibility Issue in Histograms**:
    - *Issue*: `DiscreteHistogram` component in `histogram-charts.tsx` threw error `"Cannot read properties of undefined (reading 'count')"`. Root cause: Recharts v3 changed `LabelList` render function signature. Old code expected `payload` parameter, but v3 only provides `index`.
    - *Solution*: Updated `renderCustomLabel` function to use `index` parameter and access data via closure: `const item = data[index]`. Added optional chaining for safety: `{item?.count}`.

14. **Ghost Python Process on Backend Port**:
    - *Issue*: After stopping containers, requests to `/analysis/` endpoint were still being intercepted, returning old results. Investigation found a stale uvicorn process (PID 6840) still running on port 8001 from a previous session.
    - *Solution*: Killed process with `Stop-Process -Id 6840 -Force`. Rule: Always check `netstat -ano | findstr :8001` (Windows) to detect orphaned backend processes.

---

## ⚠️ Obrigatório Antes de Qualquer Push para o GitHub

**Todo push deve ser precedido pela execução dos 4 processos de validação abaixo, sem exceção.** O CI do GitHub roda exatamente esses checks e falha o build se qualquer um deles não passar. Não subir código que não tenha passado localmente.

### Backend (rodar dentro do container)
```bash
docker compose run --rm backend uv run ruff check .   # linter Python moderno
docker compose run --rm backend uv run mypy .          # verificação estática de tipos
```

### Frontend (rodar na pasta frontend/)
```bash
npm run lint        # ESLint — erros de código e padrões React
npm run typecheck   # tsc --noEmit — verificação de tipos TypeScript
```

**Regra prática**: lint e typecheck passando com zero erros (warnings são tolerados pelo CI, mas devem ser investigados). Só commitar e pushar após os 4 processos retornarem clean.

### Problemas comuns encontrados nesse ciclo de CI

| Erro | Causa | Fix aplicado |
|------|-------|-------------|
| `mypy`: operações com `Optional` de Polars | `.mean()` e `.std()` retornam unions complexas | Usar `cast(float, ...)` ao invés de `float()` direto |
| `mypy`: nome já definido (`no-redef`) | Reutilizar variável com anotação de tipo em escopo já declarado | Renomear para `sharpe_mean`, `sharpe_std` etc. |
| `eslint`: `setState` síncrono em `useEffect` | Chamar setState no corpo do effect (não em callback/async) | Mover setState para dentro de IIFE async ou setTimeout |
| `eslint`: `no-explicit-any` | Uso de `as any` em handlers de eventos | Usar tipo específico: `(event as MessageEvent).data` |
| `typecheck`: tipo de `LabelList content` incompatível | Recharts usa `Props` sem index signature e `value: RenderableText` (inclui `boolean`) | Tipar como `(props: object)` + cast interno |
| `typecheck`: `Cannot find module 'webpack'` | Import do tipo `Configuration` do webpack em `next.config.ts` | Remover import e deixar Next.js inferir o tipo de `config` |

---

## 🤝 Política de Colaboração e Commits

**O projeto é de autoria exclusiva do dono do repositório.**

- Commits **nunca** devem mencionar ferramentas de IA, assistentes, ou qualquer coparticipante externo
- Não usar `Co-Authored-By`, créditos automáticos, ou qualquer metadata que indique colaboração externa
- Mensagens de commit seguem o padrão já estabelecido no histórico: `Feat:`, `Fix:`, `Refactor:` etc.
- O histórico do Git deve refletir apenas o trabalho do dono do projeto

---

## 🎨 UI/UX Standards (Premium Fintech)
- **Language**: **All UI text is in English — no exceptions.** Labels, buttons, error messages, placeholders, page titles, table headers, and status values must all be in English, regardless of the development conversation language. Backend error strings returned to the client also in English.
- **Palette**: Background `#07111F`, Cards `#0F1B2D`, Highlights `#3B82F6` (Blue) and `#22C55E` (Emerald).
- **Extraction Flow**: 3-step visualization (Settings -> Progress -> Completed).
- **Analysis Page**: Charts acima, Trade Journal com scroll abaixo. Sem stat cards, sem gráfico de preço na view principal.
- **Simplification**: Date inputs are **Date-Only**. The backend automatically appends `T00:00:00` and `T23:59:59` to maintain data integrity without cluttering the UI with time pickers.

---

## 📍 Current Status
- **Autenticação**: Sistema completo — JWT em cookie HttpOnly, refresh token rotacionado, CSRF double-submit, rate limiting, account lockout, security headers, audit log.
- **Admin**: Tela `/admin/users` (criar/editar/desativar/reset senha/desbloquear) e `/admin/audit` (viewer do audit log com paginação).
- **Login**: Tela `/login` com redirect automático para rotas protegidas. First-login flow via `/change-password`.
- **Sidebar**: Seção "Admin" visível só para role=admin, botão Logout, usuário logado exibido no footer.
- **Extraction**: Fully functional. Data flows from API to DB and shows real-time progress via SSE.
- **Extraction History**: Nova tela `/previous` mostrando todos os jobs com asset, intervalo, range, duração, candles e status colorido.
- **Analysis Page**: Layout reorganizado — dois gráficos lado a lado no topo, Trade Journal com scroll abaixo. Sem stat cards nem gráfico de preço.
- **Week Frequency chart**: Barras com gradiente amarelo→vermelho por frequência, dois percentuais (local verde + global azul), legenda com borda, bucket ≥0 oculto.
- **Return Distribution chart**: Barras verdes, bucket ≥0 removido, percentuais no topo, legenda explicativa.
- **Trade Journal**: Exibe todos os trades sem limite, scroll interno, header sticky, contador de trades.
- **Sidebar**: Recolhível com botão toggle — modo expandido (288px) e colapsado (68px com ícones + tooltip).
- **Analysis Metrics**: Sharpe Ratio, Calmar Ratio, Max Drawdown, Total Return implementados.
- **Database**: Migrations rodam automaticamente no startup via entrypoint script.
- **Docker Development**: Frontend usa Webpack com polling (Windows-compatible).
- **All containers healthy**: DB (`:5440`), Backend (`:8001`), Frontend (`:3002`).
- **CORS**: Configurado via `CORS_ORIGINS` em `config.py` (padrão: `localhost:3000`, `3001`, `3002`).
- **CI/CD**: 4 checks obrigatórios passando — ruff, mypy, eslint, typecheck.

---

## 🗂️ Key File Map

```
backend/
├── entrypoint.sh                    — Runs alembic upgrade before uvicorn startup
├── Dockerfile                       — Updated CMD to use entrypoint.sh
├── migrations/
│   ├── env.py                       — (MODIFIED) Imports ALL models; reads DATABASE_URL
│   └── versions/
│       ├── 6efe81b7023f_initial_migration.py
│       └── f2a70fe582b9_add_auth_tables.py  — (NEW) users, refresh_tokens, access_blocklist, audit_log
└── src/cronograph/
    ├── main.py                      — (MODIFIED) + auth/admin routers, SecurityHeadersMiddleware, slowapi
    ├── cli.py                       — (NEW) CLI: create-admin command (Typer)
    ├── core/
    │   ├── config.py                — (MODIFIED) + SECRET_KEY, ACCESS_TTL_MIN, REFRESH_TTL_DAYS, COOKIE_*
    │   └── security.py              — (NEW) hash_password, verify_password, encode/decode_access_token,
    │                                         gen_refresh_token, hash_refresh_token, gen_temp_password,
    │                                         validate_password_strength
    ├── api/
    │   ├── deps.py                  — (NEW) get_current_user, require_admin (CSRF check inline)
    │   └── routes/
    │       ├── auth.py              — (NEW) POST /auth/login, /auth/logout, /auth/refresh,
    │       │                                GET /auth/me, POST /auth/change-password
    │       ├── admin.py             — (NEW) GET/POST/PATCH /admin/users, reset-password, unlock,
    │       │                                GET /admin/audit-log
    │       ├── analysis.py          — POST /analysis/weekly-window, GET /analysis/candles
    │       ├── extraction.py        — POST /extractions/, GET /extractions/{id}/stream (SSE)
    │       └── symbols.py           — GET /symbols/ (Binance API, used for extraction discovery)
    ├── middleware/
    │   ├── security_headers.py      — (NEW) CSP, HSTS, X-Frame-Options, etc.
    │   └── rate_limit.py            — (NEW) slowapi limiter instance
    ├── models/
    │   ├── candle.py                — Base class + OHLCV candles
    │   ├── user.py                  — (NEW) User ORM (role, lockout, totp fields reserved)
    │   ├── refresh_token.py         — (NEW) RefreshToken ORM with family_id for rotation detection
    │   ├── access_blocklist.py      — (NEW) JWT jti blocklist for logout/password change
    │   ├── audit_log.py             — (NEW) AuditLog ORM
    │   ├── coverage.py              — Tracks extracted date ranges per symbol
    │   └── extraction_job.py        — Job state machine (pending → running → done)
    └── services/
        ├── auth_service.py          — (NEW) login_user, logout_user, refresh_tokens, change_password,
        │                                     _handle_failed_attempt, _audit
        ├── analysis/
        │   ├── weekly_window.py     — Polars join_asof to match entry/exit candles per week
        │   └── histogram.py         — HistogramService: stats, Sharpe, Calmar, drawdown, histograms
        ├── extraction.py            — Binance API fetch + DB write, streams SSE progress
        └── estimator.py             — Estimates extraction duration/candle count

frontend/
├── middleware.ts                    — (NEW) Route protection: redirect to /login if no access_token cookie
├── Dockerfile.dev                   — Next.js dev with Webpack (Windows-compatible)
├── package.json                     — (MODIFIED) Added "dev:docker": "next dev --webpack -H 0.0.0.0"
├── next.config.ts                   — Webpack polling config
└── src/
    ├── app/
    │   ├── login/page.tsx           — (NEW) Login form
    │   ├── change-password/page.tsx — (NEW) First-login password change (forced)
    │   ├── admin/
    │   │   ├── users/page.tsx       — (NEW) Admin: lista/cria/edita/desativa/reset/desbloqueia usuários
    │   │   └── audit/page.tsx       — (NEW) Admin: viewer do audit log com paginação
    │   ├── page.tsx                 — Extraction page (3-step flow: form → progress → completed)
    │   ├── analysis/page.tsx        — Analysis page
    │   └── layout.tsx               — (MODIFIED) Usa AuthLayout (condicional sidebar)
    ├── lib/
    │   ├── api.ts                   — (MODIFIED) apiFetch wrapper: credentials+CSRF+auto-refresh-on-401
    │   │                                         + loginApi, logoutApi, getMeApi, changePasswordApi,
    │   │                                           adminListUsers, adminCreateUser, adminUpdateUser,
    │   │                                           adminResetPassword, adminUnlockUser, adminGetAuditLog
    │   └── auth.ts                  — (NEW) useUser() hook, logout() function
    └── components/layout/
        ├── auth-layout.tsx          — (NEW) Condicional: esconde sidebar em /login e /change-password
        └── sidebar.tsx              — (MODIFIED) + Admin nav items (role=admin only), Logout button,
                                                   usuário logado no footer
```

### Key Endpoints Reference
- **POST `/auth/login`** — Login com username/password, seta cookies HttpOnly (access+refresh+csrf).
- **POST `/auth/refresh`** — Rotaciona refresh token; revoga família inteira em reuso detectado.
- **POST `/auth/logout`** — Invalida refresh, blocklista access, limpa cookies.
- **GET `/auth/me`** — Retorna usuário logado (id, email, username, role, must_change_password).
- **POST `/auth/change-password`** — Troca senha; revoga todos refreshes; requer CSRF.
- **GET `/admin/users`** — Lista usuários (admin only).
- **POST `/admin/users`** — Cria usuário com senha temporária (admin only).
- **PATCH `/admin/users/{id}`** — Atualiza email/username/role/is_active (admin only).
- **POST `/admin/users/{id}/reset-password`** — Gera nova senha temporária (admin only).
- **POST `/admin/users/{id}/unlock`** — Remove lockout (admin only).
- **GET `/admin/audit-log`** — Lista eventos com paginação (admin only).
- **GET `/symbols/?q={query}`** — Search Binance symbols (slow, external API). Use for **extraction form**.
- **GET `/extractions/symbols`** — List user's extracted symbols (instant, local DB). Use for **analysis form**.
- **GET `/extractions/history`** — Lista todos os jobs de extração (id, symbol, status, candles, duração).
- **POST `/analysis/weekly-window`** — Run analysis with entry/exit rules. Returns stats + per-window results.
- **GET `/analysis/candles`** — Fetch candlesticks for chart (filtered by symbol, interval, date range).

---

## ⚠️ Criar Primeiro Admin (Bootstrap)
```bash
# Rodar UMA VEZ após primeiro `docker compose up`
docker compose run --rm backend sh -c "uv run python -c \"
import asyncio, sys
from datetime import datetime, timezone
sys.path.insert(0, '/app/src')
from cronograph.core.security import hash_password
from cronograph.core.db import SessionLocal
from cronograph.models.user import User

async def create():
    now = datetime.now(timezone.utc)
    async with SessionLocal() as db:
        user = User(email='admin@example.com', username='admin',
                    password_hash=hash_password('SuaSenhaForte!'), role='admin',
                    must_change_password=False, created_at=now, updated_at=now)
        db.add(user); await db.commit(); print('Admin criado')

asyncio.run(create())
\""
```

## 🔐 Variáveis de Ambiente para Produção (VPS)
Adicionar ao `.env` (nunca commitar):
```
SECRET_KEY=<python -c "import secrets; print(secrets.token_urlsafe(64))">
COOKIE_SECURE=true
COOKIE_DOMAIN=seu-dominio.com
CORS_ORIGINS=["https://seu-dominio.com"]
```

## 🚀 Next Steps (Priority)
1. **2FA TOTP**: Colunas `totp_secret` e `totp_enabled` já existem no modelo. Implementar `pyotp` para obrigatoriedade no admin.
2. **VPS Deploy**: Caddy (auto TLS), ufw firewall, Docker expostos somente via proxy reverso.
3. **Backtesting Engine**: Expand the analysis module to support more complex strategies beyond weekly windows (e.g., RSI-filtered entries, trend-following conditions).
4. **Analysis Persistence**: Save and name analyses for later retrieval (sidebar has "Saved Analyses" stub, disabled).
5. **Advanced Filtering**: Allow filtering results by specific market conditions.
6. **Schedules**: Automate recurring extractions (sidebar has "Schedules" stub, disabled).

---

## 📝 Session History

**Session 1 (Initial Setup)** — May 08, 2026:
- Fixed 7 critical issues (hydration, volumes, ports, Turbopack caching, node_modules, missing imports, lightweight-charts v5)

**Session 2 (Analysis Page Deep Fix)** — May 08, 2026:
- Fixed 7 issues: Turbopack/Windows, migrations auto-run, endpoint errado, chart performance, Recharts v3, ghost process

**Session 3 (UI Redesign + Extraction History + CI/CD)** — May 08, 2026:
- **Visual**: removidos stat cards e gráfico de preço da análise; reorganizado layout (charts em cima, tabela embaixo)
- **Trade Journal**: limite de 15 removido, scroll interno adicionado
- **Week Frequency**: renomeado, gradiente amarelo→vermelho, dois percentuais (local/global), legenda, sem bucket ≥0
- **Return Distribution**: barras verdes, bucket ≥0 removido, percentuais nas barras, legenda
- **Sidebar**: collapse/expand com toggle, transição suave, ícone-only no modo colapsado
- **Extraction History**: nova tela `/previous` com endpoint `GET /extractions/history` no backend
- **CI/CD**: descoberta do processo `ruff` + `mypy` + `eslint` + `typecheck` obrigatórios antes do push
- **Principais desafios de CI**: tipos Polars (cast vs float()), Recharts LabelList (`object` + cast interno), setState síncrono em useEffect, webpack types em next.config.ts
- **Política de commits**: sem menção a ferramentas externas, sem co-authorship, histórico exclusivamente do dono

**Session 4 (Authentication System)** — May 08, 2026:
- **Auth strategy**: JWT HS256 em cookie HttpOnly (access 15min + refresh 14d rotacionado com detecção de reuso via family_id)
- **Security stack**: Argon2id (time=3, mem=64MB), CSRF double-submit, rate limit 5/15min por IP, account lockout progressivo (5→15min, 10→1h, 15→admin unlock)
- **Backend novos**: `core/security.py`, `services/auth_service.py`, `api/deps.py`, routes `auth.py` + `admin.py`, middleware `security_headers.py` + `rate_limit.py`, modelos `user`, `refresh_token`, `access_blocklist`, `audit_log`, migration `f2a70fe582b9`
- **Frontend novos**: `middleware.ts` (proteção de rotas), `lib/auth.ts`, `/login`, `/change-password`, `/admin/users`, `/admin/audit`, `components/layout/auth-layout.tsx`
- **CLI**: `cli.py` com `create-admin` command via Typer
- **Desafios CI**: `**kwargs` em `set_cookie` rejeitado por mypy → refatorado para parâmetros explícitos; `_audit` importado mas não usado → removido; `jwt` import não usado → removido; `setLoading(true)` síncrono em useEffect → IIFE async
- **Desafio migration**: Alembic detectava tabelas existentes como "removed" por falta de imports dos modelos em `env.py` → adicionados todos os imports

---
**Document updated on: May 08, 2026**
**Status: Sistema operacional, autenticação completa, CI verde. Pronto para deploy em VPS e expansão de features.**
