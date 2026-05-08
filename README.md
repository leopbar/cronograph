# 📊 Cronograph

> **Production-ready quantitative analysis platform for Bitcoin options trading.** Extract high-resolution market data from Binance and instantly analyze optimal strike prices for weekly OTM call options.

<p align="center">
  <a href="https://cronograph.duckdns.org/">
    <img src="https://img.shields.io/badge/🚀_Live_App-Production-success?style=for-the-badge" alt="Live Production App" />
  </a>
  <a href="https://www.linkedin.com/in/leonardo-barretti/">
    <img src="https://img.shields.io/badge/LinkedIn-Leonardo_Barretti-0A66C2?style=for-the-badge&logo=linkedin&logoColor=white" alt="LinkedIn" />
  </a>
  <a href="mailto:lbarretti@gmail.com">
    <img src="https://img.shields.io/badge/📧_Request_Access-Email-orange?style=for-the-badge" alt="Email" />
  </a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/version-1.0.0--Production-blue?style=for-the-badge" alt="Version" />
  <img src="https://img.shields.io/badge/license-MIT-green?style=for-the-badge" alt="License" />
  <img src="https://img.shields.io/badge/Python-3.13+-3776AB?style=flat&logo=python&logoColor=white" />
  <img src="https://img.shields.io/badge/Next.js-15-000000?style=flat&logo=next.js&logoColor=white" />
  <img src="https://img.shields.io/badge/FastAPI-0.100+-009688?style=flat&logo=fastapi&logoColor=white" />
  <img src="https://img.shields.io/badge/PostgreSQL-17-336791?style=flat&logo=postgresql&logoColor=white" />
  <img src="https://img.shields.io/badge/TimescaleDB-Latest-00A4EF?style=flat&logo=timescale&logoColor=white" />
  <img src="https://img.shields.io/badge/Polars-Latest-CD792C?style=flat" />
</p>

---

## 🚀 Live Application

**Cronograph is live in production:** https://cronograph.duckdns.org/

The application is running on a production VPS with full authentication, database persistence, and real-time analysis capabilities.

### 🔐 Request Access

To test the application, **send an email to [lbarretti@gmail.com](mailto:lbarretti@gmail.com)** with the subject line:

> **Subject:** Cronograph Demo Access Request

I'll provide you with test credentials to explore:
- Full data extraction from Binance
- Statistical analysis of Bitcoin price windows
- Real-time progress via Server-Sent Events
- Probability distributions and win rate calculations
- Admin dashboard (upon request)

### 🎬 Live Demo

<p align="center">
  <img src="docs/images/demo.gif" alt="Cronograph Demo" width="800" />
</p>

---

## 🎯 Why Cronograph?

You trade **weekly Bitcoin OTM call options**. Every Friday, you need to decide: *What strike price should I sell next week's calls at?*

**The problem:** Strike selection is guesswork. You need to know:
- What's the probability Bitcoin reaches $X by Friday?
- Historically, how often does it move beyond a certain range in exactly 7 days?
- Where are the "safe" zones for OTM calls?

**The solution:** Cronograph analyzes **years of historical OHLCV data** and answers:
- *"On Monday at 14:00 UTC, how likely is it that Bitcoin will close between $X and $Y by Friday at 08:00 UTC?"*
- *"If I sell a $65,500 call, what's my historical win rate?"*

This transforms options trading from **intuition** to **statistical edge**.

---

## ✨ Core Features

### Statistical Analysis
- **Weekly Window Analysis** — Extract entry/exit pair probabilities (e.g., "Monday 14:00 to Friday 08:00"). Know exactly how many times Bitcoin stayed below a given strike in that window across your entire dataset.
- **Probability Distributions** — Visual histograms showing win frequency, return distribution, and win rate by price level. Make informed decisions, not emotional ones.
- **High-Resolution Data** — Binance 1m/5m/15m/1h candles with automatic async extraction and real-time progress via Server-Sent Events (SSE).

### Platform Features
- 🔐 **Enterprise-Grade Authentication** — Argon2id password hashing, JWT in HttpOnly cookies, CSRF protection, progressive account lockout, audit logs.
- 📊 **Sub-50ms Chart Performance** — 20,000+ candlesticks render instantly. Built on Polars for vectorized operations and TimescaleDB for time-series optimization.
- 🔄 **Real-Time Progress** — Watch data extraction and analysis run live via Server-Sent Events (SSE).
- 📱 **Responsive Design** — Dark-mode fintech aesthetic with smooth animations and premium UX.
- 📝 **Extraction History** — Track all previous Binance extractions with timestamps, candle counts, and job status.

### Developer Experience
- ✅ **Type Safety End-to-End** — Python with Pydantic + SQLAlchemy 2.x, TypeScript on frontend. Zero runtime type errors.
- 🐳 **Containerized** — Docker Compose with PostgreSQL, TimescaleDB, FastAPI backend, and Next.js frontend.
- 🚀 **CI/CD Ready** — Ruff (linting), mypy (type checking), eslint (frontend lint). Green builds before every merge.

---

## 🏗️ Architecture

### Why This Stack?

| Component | Technology | Why |
|-----------|------------|-----|
| **Data Processing** | **Polars** | Vectorized operations 100x faster than Pandas for OHLCV aggregations |
| **Time-Series DB** | **PostgreSQL + TimescaleDB** | Native compression + time-bucketing for millions of candles |
| **API Framework** | **FastAPI** | Async first, automatic validation, built-in OpenAPI docs |
| **Frontend** | **Next.js 15** | App Router, Server Components, optimal file-based routing |
| **Type Safety** | **Pydantic + TypeScript** | Enforce contracts at every boundary |
| **Real-Time Updates** | **Server-Sent Events (SSE)** | Watch extraction and analysis run live |

### Data Pipeline

```
┌─────────────────┐
│  Binance API    │  (extract via async BinanceClient)
│  1m/5m/1h data  │
└────────┬────────┘
         │ SSE: "Reading 45,000 candles..."
         ▼
┌─────────────────────────────────┐
│  FastAPI Backend                │
│  ├─ async extraction             │
│  ├─ Polars aggregation (10ms)    │
│  └─ TimescaleDB insert          │
└────────┬────────────────────────┘
         │ SSE: "Stored 45,000 candles"
         ▼
┌──────────────────────────────┐
│  PostgreSQL + TimescaleDB    │
│  (auto-compressed indices)   │
└────────┬─────────────────────┘
         │
         ▼
┌──────────────────────────────┐
│  Analysis Engine             │
│  ├─ window selection         │
│  ├─ Polars groupby/agg       │
│  └─ statistical histograms   │
└────────┬─────────────────────┘
         │
         ▼
┌──────────────────────────────┐
│  Next.js Frontend            │
│  ├─ Recharts histograms      │
│  ├─ lightweight-charts (20k) │
│  └─ interactive analysis     │
└──────────────────────────────┘
```

### Key Endpoints

**Extraction:**
- `POST /extractions/submit` — Start async Binance data pull
- `GET /extractions/symbols` — List extracted symbols
- `GET /extractions/history` — View all previous jobs

**Analysis:**
- `POST /analysis/weekly-window` — Run statistical analysis with entry/exit rules
- `GET /analysis/candles` — Fetch candlesticks for chart visualization

**Authentication:**
- `POST /auth/login` — Login with username/password
- `POST /auth/logout` — Logout and invalidate tokens
- `POST /auth/change-password` — Update password securely
- `GET /auth/me` — Get current user info

---

## 🚀 Getting Started

### Try the Live Application

**No installation needed.** Access the live application at:

🌐 **https://cronograph.duckdns.org/**

To request test credentials, email [lbarretti@gmail.com](mailto:lbarretti@gmail.com).

### Local Development Setup

#### Prerequisites
- Docker & Docker Compose
- Python 3.13+ (optional, for local backend development)
- Node.js 22+ (optional, for local frontend development)

#### Quick Start (Docker Compose)

```bash
# Clone the repository
git clone https://github.com/leopbar/cronograph.git
cd cronograph

# Start all services
docker compose up --build

# Create admin user (run ONCE after first startup)
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
                    password_hash=hash_password('YourStrongPassword!'), role='admin',
                    must_change_password=False, created_at=now, updated_at=now)
        db.add(user); await db.commit(); print('Admin created')

asyncio.run(create())
\""
```

Access locally:
- **Frontend**: http://localhost:3002
- **Backend API**: http://localhost:8001
- **API Docs**: http://localhost:8001/docs

#### Manual Setup (Without Docker)

**Backend:**
```bash
cd backend
uv sync
uv run alembic upgrade head
uv run uvicorn cronograph.main:app --reload --port 8001
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev  # Runs on http://localhost:3002
```

**Database:**
```bash
# Start PostgreSQL + TimescaleDB only
docker compose up -d db
# Then run backend as shown above
```

---

## 🎓 How the Analysis Works

### Example: Selling Weekly Bitcoin Calls

You want to know: *"If I sell $65,500 CALL options expiring Friday, how often does BTC stay below strike?"*

**Cronograph processes this in three steps:**

1. **Data Extraction** — Downloads all historical 1-hour Bitcoin/USDT candles from Binance (years of data)
2. **Window Definition** — For every Monday 14:00 → Friday 08:00 in history:
   - Record the highest price
   - Did it exceed $65,500? (Win/Loss)
3. **Statistical Summary**:
   - **Win Rate**: 87% (out of 100 weeks, your call expired OTM 87 times)
   - **Max Loss**: -$2,100 (worst case drawdown)
   - **Return Distribution**: Full histogram of outcomes

### The Math

For each historical week:
```
return = (max_price_in_week - entry_price) / entry_price
```

Aggregate across all weeks to get:
- Win rate (% weeks with negative return)
- Mean return
- Standard deviation
- 95th percentile loss

This is **backtesting**, optimized for production speed using Polars and TimescaleDB.

---

## 🔐 Security

Cronograph is built with financial-grade security:

- **Argon2id hashing** — Password hashing with time=3, memory=64MB (OWASP standard)
- **JWT in HttpOnly cookies** — Cannot be accessed by JavaScript; CSRF-protected
- **Rate limiting** — 5 failed attempts per 15 minutes before account lockout
- **Progressive lockout** — 15min → 1hour → admin unlock after repeated failures
- **Audit logging** — Every login, password change, and admin action is logged
- **SQL injection protection** — SQLAlchemy 2.x with parameterized queries
- **CORS security** — No wildcard `*`; whitelist only trusted origins
- **HTTPS only** — Cookies marked Secure in production
- **Type safety** — Pydantic + TypeScript prevents injection attacks

---

## 📊 Project Structure

```
cronograph/
├── backend/
│   ├── src/cronograph/
│   │   ├── core/                  # Security, DB, settings
│   │   ├── models/                # SQLAlchemy models
│   │   ├── services/              # Business logic (Polars, analysis)
│   │   ├── api/routes/            # REST endpoints
│   │   ├── middleware/            # Rate limit, CORS, security headers
│   │   └── main.py                # FastAPI app
│   ├── migrations/                # Alembic schema versions
│   └── tests/                     # pytest suite
├── frontend/
│   ├── src/app/                   # Next.js App Router pages
│   ├── src/components/            # React components
│   ├── src/lib/                   # Utilities (API, auth, types)
│   └── middleware.ts              # Route protection
├── docker-compose.yml             # All services orchestration
├── LICENSE                        # MIT License
└── README.md
```

---

## 🛣️ Roadmap

- [ ] **2FA (TOTP)** — Two-factor authentication for admin users
- [ ] **VPS Deployment Guide** — Production setup with Caddy, firewall, TLS
- [ ] **Advanced Backtesting** — RSI filters, trend-following conditions, MA crosses
- [ ] **Analysis Persistence** — Save and name analyses for later retrieval
- [ ] **Multi-Symbol Support** — Ethereum, BNB, Solana, or custom assets
- [ ] **Recurring Extractions** — Schedule daily/weekly automatic data pulls
- [ ] **PDF Export** — Generate reports with charts and statistics
- [ ] **API for Automation** — Programmatically trigger analyses from scripts

---

## 💡 Design Philosophy

### Why Polars over Pandas?
Aggregating 500k candles takes ~10ms with Polars vs ~1s with Pandas. For financial analysis, latency matters.

### Why TimescaleDB?
PostgreSQL scales poorly with time-series data. TimescaleDB compresses 2 years of 1m candles to <500MB while maintaining query speed.

### Why SSE instead of WebSockets?
Server-Sent Events are simpler and more reliable for one-directional updates. No client library needed; works in all browsers.

### Why Argon2id?
bcrypt is slow by design, but Argon2id is faster while being more resistant to GPU attacks. Industry standard for 2024+.

---

## 🤔 Key Learnings

1. **Time-series data needs special handling.** Using it like regular tabular data leads to 10x slower queries and 100x larger storage.

2. **Front-end performance is an architecture problem, not a library problem.** Three focused useEffects beat one bloated effect every time.

3. **Type safety saves debugging hours.** Zero "undefined is not a function" bugs when types are enforced at boundaries.

4. **SSE is underrated.** Simpler than WebSockets, more reliable than polling, perfect for real-time progress.

5. **Progressive account lockout is better than rate limiting.** Attackers hit a wall that grows over time, not a fixed limit they can work around.

6. **Statistical analysis for trading requires production-grade infrastructure.** One bug in aggregation logic = wrong backtest = bad trades. Build accordingly.

---

## 📄 License

MIT License. See [LICENSE](LICENSE) for details.

---

## 👤 Connect

**Leonardo Barretti** — Building production fintech systems for real traders, not tutorials.

- 💼 **LinkedIn**: [linkedin.com/in/leonardo-barretti](https://www.linkedin.com/in/leonardo-barretti/)
- 📧 **Email**: [lbarretti@gmail.com](mailto:lbarretti@gmail.com)
- 🐙 **GitHub**: [@leopbar](https://github.com/leopbar)
- 🚀 **Live App**: [cronograph.duckdns.org](https://cronograph.duckdns.org/)

> **Interested in the platform?** Email me at [lbarretti@gmail.com](mailto:lbarretti@gmail.com) with "Cronograph Demo Access" in the subject line.

---

<p align="center">
  <em>If you trade options or build fintech systems, this project might inspire your next move.</em>
</p>
