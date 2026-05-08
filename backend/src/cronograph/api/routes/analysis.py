from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from datetime import time, datetime
from typing import List
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from cronograph.core.db import get_db
from cronograph.models.candle import Candle
from cronograph.services.analysis.weekly_window import WeeklyWindowAnalysis
from cronograph.services.analysis.histogram import HistogramService, AnalysisResponse

router = APIRouter(prefix="/analysis", tags=["analysis"])

class WeeklyAnalysisRequest(BaseModel):
    symbol: str
    interval: str
    range_from: str  # "YYYY-MM-DD"
    range_to: str    # "YYYY-MM-DD"
    entry_weekday: int
    entry_time: str
    entry_price_type: str = "open"
    exit_weekday: int
    exit_time: str
    exit_price_type: str = "open"

class CandleResponse(BaseModel):
    time: int
    open: float
    high: float
    low: float
    close: float

@router.get("/candles")
async def get_candles(
    symbol: str,
    interval: str,
    range_from: str,
    range_to: str,
    db: AsyncSession = Depends(get_db)
) -> List[CandleResponse]:
    try:
        range_start = datetime.strptime(range_from, "%Y-%m-%d")
        range_end = datetime.strptime(range_to, "%Y-%m-%d")
        # Ensure we cover the full last day
        range_end = range_end.replace(hour=23, minute=59, second=59)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD")

    stmt = select(Candle).where(
        Candle.symbol == symbol,
        Candle.interval == interval,
        Candle.open_time >= range_start,
        Candle.open_time <= range_end
    ).order_by(Candle.open_time)
    
    result = await db.execute(stmt)
    candles = result.scalars().all()
    
    return [
        CandleResponse(
            time=int(c.open_time.timestamp()),
            open=float(c.open),
            high=float(c.high),
            low=float(c.low),
            close=float(c.close)
        )
        for c in candles
    ]

@router.post("/weekly-window")
async def run_weekly_analysis(
    request: WeeklyAnalysisRequest, 
    db: AsyncSession = Depends(get_db)
) -> AnalysisResponse:
    try:
        # Parse times and dates
        entry_t = time.fromisoformat(request.entry_time)
        exit_t = time.fromisoformat(request.exit_time)
        range_start = datetime.strptime(request.range_from, "%Y-%m-%d")
        range_end = datetime.strptime(request.range_to, "%Y-%m-%d")
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date/time format. Use YYYY-MM-DD and HH:MM")

    analysis = WeeklyWindowAnalysis(db)
    results = await analysis.run(
        symbol=request.symbol,
        interval=request.interval,
        range_from=range_start,
        range_to=range_end,
        entry_weekday=request.entry_weekday,
        entry_time=entry_t,
        entry_price_type=request.entry_price_type,
        exit_weekday=request.exit_weekday,
        exit_time=exit_t,
        exit_price_type=request.exit_price_type
    )

    if not results:
        raise HTTPException(
            status_code=404, 
            detail="No data found for the selected window and period. Please check your data extraction."
        )

    response = HistogramService.generate(results, bucket_size=1000)
    return response
