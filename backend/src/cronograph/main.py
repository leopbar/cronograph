from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from cronograph.api.routes import symbols, extraction, analysis

app = FastAPI(title="Cronograph API")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # For MVP, allow all. In production, restrict to frontend URL.
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(symbols.router)
app.include_router(extraction.router)
app.include_router(analysis.router)

@app.get("/")
async def root():
    return {"message": "Welcome to Cronograph API"}

@app.get("/health")
async def health():
    return {"status": "healthy"}
