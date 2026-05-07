# ⏱️ Cronograph

**Cronograph** is a high-performance quantitative analysis platform for crypto assets. It allows researchers and traders to extract high-resolution market data and run complex statistical window analysis in seconds.

![Version](https://img.shields.io/badge/version-1.0.0--MVP-blue?style=for-the-badge)
![License](https://img.shields.io/badge/license-MIT-green?style=for-the-badge)
![Built with](https://img.shields.io/badge/built%20with-Next.js%20%2B%20FastAPI%20%2B%20Polars-black?style=for-the-badge)

## 🚀 Features

- **Blazing Fast Analysis**: Powered by **Polars**, aggregations that take minutes in Pandas happen in milliseconds.
- **Robust Pipeline**: Async extraction from Binance with real-time progress via Server-Sent Events (SSE).
- **Time-Series Optimized**: Built on **TimescaleDB** for efficient storage and retrieval of millions of OHLCV candles.
- **Statistical Windows**: Analyze entry/exit pairs (e.g., "Monday 14:00" to "Friday 08:00") and view the probability distribution.
- **Premium UX**: Modern dark-mode interface with smooth animations and Geist typography.

## 🛠️ Tech Stack

### Backend
- **Python 3.13** + **uv**
- **FastAPI** (Async REST + SSE)
- **SQLAlchemy 2.x** + **Alembic**
- **PostgreSQL 17** + **TimescaleDB**
- **Polars** (High-performance DataFrames)

### Frontend
- **Next.js 15** (App Router)
- **Tailwind CSS v4** + **shadcn/ui**
- **Recharts** (Statistical Visualization)
- **Framer Motion** (Interactions)
- **Zustand** (Global Settings)

## 📦 Getting Started

### Prerequisites
- Docker & Docker Compose
- Python 3.13+ (optional, for local development)
- Node.js 22+ (optional, for local development)

### Quick Start (Docker)
```bash
docker-compose up --build
```
The app will be available at:
- **Frontend**: http://localhost:3000
- **API**: http://localhost:8000
- **Database**: localhost:5440

### Manual Setup (Local)
1. **Database**: Start the database via Docker: `docker-compose up -d db`.
2. **Backend**:
   ```bash
   cd backend
   uv sync
   uv run python -m alembic upgrade head
   uv run uvicorn cronograph.main:app --port 8000
   ```
3. **Frontend**:
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

## ⚖️ License
Distributed under the MIT License. See `LICENSE` for more information.
