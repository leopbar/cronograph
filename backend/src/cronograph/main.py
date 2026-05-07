from fastapi import FastAPI
from cronograph.api.routes import symbols, extraction, analysis

app = FastAPI(title="Cronograph API")

app.include_router(symbols.router)
app.include_router(extraction.router)
app.include_router(analysis.router)

@app.get("/")
async def root():
    return {"message": "Welcome to Cronograph API"}

@app.get("/health")
async def health():
    return {"status": "healthy"}
