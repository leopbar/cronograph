from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

from cronograph.api.routes import symbols, extraction, analysis
from cronograph.api.routes import auth, admin
from cronograph.core.config import settings
from cronograph.middleware.rate_limit import limiter
from cronograph.middleware.security_headers import SecurityHeadersMiddleware

app = FastAPI(title="Cronograph API")

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)  # type: ignore[arg-type]

app.add_middleware(SecurityHeadersMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(symbols.router)
app.include_router(extraction.router)
app.include_router(analysis.router)
app.include_router(auth.router)
app.include_router(admin.router)


@app.get("/")
async def root() -> dict[str, str]:
    return {"message": "Welcome to Cronograph API"}


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "healthy"}
