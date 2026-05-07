from fastapi import APIRouter, Query
from typing import List
from cronograph.adapters.binance import BinanceAdapter

router = APIRouter(prefix="/symbols", tags=["symbols"])
adapter = BinanceAdapter()

# Simple in-memory cache
_SYMBOLS_CACHE: List[str] = []

@router.get("/")
async def list_symbols(q: str = Query(None, min_length=1)) -> List[str]:
    global _SYMBOLS_CACHE
    
    if not _SYMBOLS_CACHE:
        _SYMBOLS_CACHE = await adapter.get_exchange_info()
    
    if not q:
        return _SYMBOLS_CACHE[:50]
        
    query = q.upper()
    matches = [s for s in _SYMBOLS_CACHE if query in s]
    return matches[:20]
