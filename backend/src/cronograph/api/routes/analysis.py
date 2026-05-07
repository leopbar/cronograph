from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from datetime import time
from sqlalchemy.ext.asyncio import AsyncSession
from cronograph.core.db import get_db
from cronograph.services.analysis.weekly_window import WeeklyWindowAnalysis
from cronograph.services.analysis.histogram import HistogramService, AnalysisResponse

router = APIRouter(prefix="/analysis", tags=["analysis"])

class WeeklyAnalysisRequest(BaseModel):
    symbol: str
    interval: str
    entry_weekday: int
    entry_time: str  # "HH:MM"
    exit_weekday: int
    exit_time: str   # "HH:MM"
    bucket_size: int = 1000

@router.post("/weekly-window")
async def run_weekly_analysis(
    request: WeeklyAnalysisRequest, 
    db: AsyncSession = Depends(get_db)
) -> AnalysisResponse:
    try:
        # Parse times
        entry_t = time.fromisoformat(request.entry_time)
        exit_t = time.fromisoformat(request.exit_time)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid time format. Use HH:MM")

    analysis = WeeklyWindowAnalysis(db)
    results = await analysis.run(
        symbol=request.symbol,
        interval=request.interval,
        entry_weekday=request.entry_weekday,
        entry_time=entry_t,
        exit_weekday=request.exit_weekday,
        exit_time=exit_t
    )

    if not results:
        raise HTTPException(
            status_code=404, 
            detail="No data found for the selected window. Please extract data first."
        )

    response = HistogramService.generate(results, request.bucket_size)
    return response
