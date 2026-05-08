import polars as pl
from datetime import time, datetime
from typing import List
from cronograph.services.analysis.histogram import WeeklyResult
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from cronograph.models.candle import Candle


class WeeklyWindowAnalysis:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def run(
        self,
        symbol: str,
        interval: str,
        entry_weekday: int,
        entry_time: time,
        entry_price_type: str,
        exit_weekday: int,
        exit_time: time,
        exit_price_type: str,
        range_from: datetime,
        range_to: datetime
    ) -> List[WeeklyResult]:
        """
        Calculates the diff for each week in the available data.
        """
        # 1. Fetch data from DB within date range
        stmt = select(Candle).where(
            Candle.symbol == symbol,
            Candle.interval == interval,
            Candle.open_time >= range_from,
            Candle.open_time <= range_to
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
        ).select([
            "open_time", 
            pl.col(entry_price_type).alias("entry_price")
        ])
        
        exits = df.filter(
            (pl.col("weekday") == exit_weekday) & 
            (pl.col("time") == exit_time)
        ).select([
            pl.col("open_time").alias("exit_open_time"),
            pl.col(exit_price_type).alias("exit_price")
        ])

        # 4. Join entries and exits
        results = entries.join_asof(
            exits,
            left_on="open_time",
            right_on="exit_open_time",
            strategy="forward"
        ).drop_nulls()

        # 5. Calculate diff and pct change
        results = results.with_columns([
            (pl.col("exit_price") - pl.col("entry_price")).alias("diff"),
            ((pl.col("exit_price") - pl.col("entry_price")) / pl.col("entry_price") * 100).alias("pct_change")
        ])

        return [
            WeeklyResult(
                entry_time=row["open_time"].isoformat(),
                exit_time=row["exit_open_time"].isoformat(),
                entry_price=round(float(row["entry_price"]), 2),
                exit_price=round(float(row["exit_price"]), 2),
                diff=round(float(row["diff"]), 2),
                return_pct=round(float(row["pct_change"]), 2)
            )
            for row in results.to_dicts()
        ]
