from datetime import datetime
from math import ceil
from pydantic import BaseModel

class ExtractionEstimate(BaseModel):
    candles_total: int
    requests_total: int
    eta_seconds: int
    mb_estimate: float

class EstimatorService:
    @staticmethod
    def get_estimate(start_time: datetime, end_time: datetime, interval: str) -> ExtractionEstimate:
        # Convert interval to seconds
        seconds_map = {
            "1m": 60,
            "3m": 180,
            "5m": 300,
            "15m": 900,
            "30m": 1800,
            "1h": 3600,
            "2h": 7200,
            "4h": 14400,
            "6h": 21600,
            "8h": 28800,
            "12h": 43200,
            "1d": 86400,
            "3d": 259200,
            "1w": 604800,
        }
        
        interval_seconds = seconds_map.get(interval, 3600)
        duration_seconds = (end_time - start_time).total_seconds()
        
        candles_total = max(0, int(duration_seconds / interval_seconds))
        # Binance returns max 1000 candles per request
        requests_total = ceil(candles_total / 1000)
        
        # Estimate: ~8 requests per second (safe rate limit)
        eta_seconds = ceil(requests_total / 8)
        
        # Estimate: ~100 bytes per candle (raw) + overhead
        mb_estimate = round((candles_total * 100) / (1024 * 1024), 2)
        
        return ExtractionEstimate(
            candles_total=candles_total,
            requests_total=requests_total,
            eta_seconds=eta_seconds,
            mb_estimate=mb_estimate
        )
