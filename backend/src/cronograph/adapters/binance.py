import httpx
import logging
from datetime import datetime
from typing import Any, List, Optional
from pydantic import BaseModel

logger = logging.getLogger(__name__)

class BinanceKLine(BaseModel):
    open_time: datetime
    open: float
    high: float
    low: float
    close: float
    volume: float

class BinanceAdapter:
    # data-api.binance.vision is Binance's official global market data mirror.
    # It uses the same REST API as api.binance.com but has no geo-restrictions
    # (api.binance.com returns 451 from US-based servers).
    BASE_URL = "https://data-api.binance.vision"
    
    def __init__(self):
        self.client = httpx.AsyncClient(base_url=self.BASE_URL, timeout=30.0)

    async def get_exchange_info(self) -> List[str]:
        """Fetch all available symbols from Binance."""
        try:
            response = await self.client.get("/api/v3/exchangeInfo")
            response.raise_for_status()
            data = response.json()
            return [s["symbol"] for s in data["symbols"] if s["status"] == "TRADING"]
        except Exception as e:
            logger.error(f"Error fetching exchange info: {e}")
            return []

    async def get_klines(
        self, 
        symbol: str, 
        interval: str, 
        start_time: Optional[int] = None, 
        end_time: Optional[int] = None, 
        limit: int = 1000
    ) -> List[List[Any]]:
        """
        Fetch OHLCV data from Binance.
        Returns a list of raw kline data.
        """
        params: dict[str, Any] = {
            "symbol": symbol,
            "interval": interval,
            "limit": limit
        }
        if start_time:
            params["startTime"] = start_time
        if end_time:
            params["endTime"] = end_time

        try:
            response = await self.client.get("/api/v3/klines", params=params)
            response.raise_for_status()
            return response.json()
        except httpx.HTTPStatusError as e:
            if e.response.status_code == 429:
                logger.warning("Rate limit hit (429). Should implement retry/wait.")
            raise e
        except Exception as e:
            logger.error(f"Error fetching klines for {symbol}: {e}")
            raise e

    async def close(self):
        await self.client.aclose()
