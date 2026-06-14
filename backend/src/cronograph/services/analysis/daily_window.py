import polars as pl
from datetime import time, datetime
from typing import List
from cronograph.services.analysis.histogram import WeeklyResult
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from cronograph.models.candle import Candle

EXIT_TIME = time(8, 0)


class DailyWindowAnalysis:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def run(
        self,
        symbol: str,
        interval: str,
        entry_time: time,
        entry_price_type: str,
        range_from: datetime,
        range_to: datetime,
    ) -> List[WeeklyResult]:
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

        df = pl.DataFrame([
            {
                "open_time": c.open_time,
                "open": float(c.open),
                "close": float(c.close),
                "date": c.open_time.date(),
                "time": c.open_time.time(),
            }
            for c in candles
        ])

        entries = df.filter(pl.col("time") == entry_time).select([
            "open_time",
            "date",
            pl.col(entry_price_type).alias("entry_price"),
        ]).with_columns([
            (pl.col("date") + pl.duration(days=1)).alias("next_day")
        ])

        exits = df.filter(pl.col("time") == EXIT_TIME).select([
            pl.col("open_time").alias("exit_open_time"),
            pl.col("open").alias("exit_price"),
            pl.col("date").alias("exit_date"),
        ])

        results = entries.join(
            exits,
            left_on="next_day",
            right_on="exit_date",
            how="inner",
        ).drop_nulls()

        results = results.with_columns([
            (pl.col("exit_price") - pl.col("entry_price")).alias("diff"),
            ((pl.col("exit_price") - pl.col("entry_price")) / pl.col("entry_price") * 100).alias("pct_change"),
        ])

        return [
            WeeklyResult(
                entry_time=row["open_time"].isoformat(),
                exit_time=row["exit_open_time"].isoformat(),
                entry_price=round(float(row["entry_price"]), 2),
                exit_price=round(float(row["exit_price"]), 2),
                diff=round(float(row["diff"]), 2),
                return_pct=round(float(row["pct_change"]), 2),
            )
            for row in results.to_dicts()
        ]
