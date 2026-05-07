import polars as pl
from datetime import datetime, time
from typing import List, Optional
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from cronograph.models.candle import Candle

class WeeklyResult(BaseModel):
    entry_time: datetime
    exit_time: datetime
    open_entry: float
    close_exit: float
    diff: float

class WeeklyWindowAnalysis:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def run(
        self,
        symbol: str,
        interval: str,
        entry_weekday: int,  # 0=Monday, 6=Sunday
        entry_time: time,
        exit_weekday: int,
        exit_time: time
    ) -> List[WeeklyResult]:
        """
        Calculates the diff for each week in the available data.
        """
        # 1. Fetch data from DB
        # For MVP, we fetch all candles for the symbol/interval
        # In a real app, we might want to filter by date range
        stmt = select(Candle).where(
            Candle.symbol == symbol,
            Candle.interval == interval
        ).order_by(Candle.open_time)
        
        result = await self.db.execute(stmt)
        candles = result.scalars().all()
        
        if not candles:
            return []

        # 2. Load into Polars
        df = pl.DataFrame([
            {
                "open_time": c.open_time,
                "open": float(c.open),
                "close": float(c.close),
                "weekday": c.open_time.weekday(),
                "time": c.open_time.time()
            }
            for c in candles
        ])

        # 3. Filter entries and exits
        entries = df.filter(
            (pl.col("weekday") == entry_weekday) & 
            (pl.col("time") == entry_time)
        ).select(["open_time", "open"])
        
        exits = df.filter(
            (pl.col("weekday") == exit_weekday) & 
            (pl.col("time") == exit_time)
        ).select(["open_time", "close"])

        # 4. Join entries and exits
        # We want to pair each entry with the *next* available exit
        # A simple way is to use join_asof
        results = entries.join_asof(
            exits,
            left_on="open_time",
            right_on="open_time",
            strategy="forward"
        ).drop_nulls()

        # 5. Calculate diff
        # diff = max(0, close_exit - open_entry)
        results = results.with_columns([
            ((pl.col("close") - pl.col("open")).clip(lower_bound=0)).alias("diff")
        ])

        return [
            WeeklyResult(
                entry_time=row["open_time"],
                exit_time=row["open_time_right"], # open_time from exits
                open_entry=row["open"],
                close_exit=row["close"],
                diff=row["diff"]
            )
            for row in results.to_dicts()
        ]
