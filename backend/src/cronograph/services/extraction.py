import asyncio
from typing import AsyncGenerator
from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker
from sqlalchemy import select, update
from cronograph.models.extraction_job import ExtractionJob
from cronograph.models.candle import Candle
from cronograph.adapters.binance import BinanceAdapter
from cronograph.services.estimator import EstimatorService

class ExtractionService:
    def __init__(self, db: AsyncSession, session_factory: async_sessionmaker[AsyncSession]):
        self.db = db
        self.session_factory = session_factory
        self.adapter = BinanceAdapter()
        self.estimator = EstimatorService()

    async def run_extraction(self, job_id: str) -> AsyncGenerator[dict, None]:
        """
        Orchestrates the extraction process using atomic updates.
        """
        async with self.session_factory() as db:
            # 1. Fetch metadata
            result = await db.execute(select(ExtractionJob).where(ExtractionJob.id == job_id))
            job = result.scalar_one_or_none()
            if not job:
                yield {"event": "error", "data": "Job not found"}
                return

            symbol = job.symbol
            interval = job.interval
            range_from = job.range_from
            range_to = job.range_to
            
            # Start job
            await db.execute(
                update(ExtractionJob)
                .where(ExtractionJob.id == job_id)
                .values(status="running", started_at=datetime.now())
            )
            await db.commit()

            try:
                # 2. Calculate estimate
                estimate = self.estimator.get_estimate(range_from, range_to, interval)
                total_expected = estimate.candles_total
                
                await db.execute(
                    update(ExtractionJob)
                    .where(ExtractionJob.id == job_id)
                    .values(candles_total=total_expected)
                )
                await db.commit()

                current_time = int(range_from.timestamp() * 1000)
                end_time = int(range_to.timestamp() * 1000)
                candles_done = 0
                
                while current_time < end_time:
                    klines = await self.adapter.get_klines(
                        symbol=symbol,
                        interval=interval,
                        start_time=current_time,
                        end_time=end_time,
                        limit=1000
                    )
                    
                    if not klines:
                        break
                    
                    # Create candle objects
                    candles = [
                        Candle(
                            symbol=symbol,
                            interval=interval,
                            open_time=datetime.fromtimestamp(k[0] / 1000),
                            open=float(k[1]),
                            high=float(k[2]),
                            low=float(k[3]),
                            close=float(k[4]),
                            volume=float(k[5])
                        ) for k in klines
                    ]
                    
                    db.add_all(candles)
                    candles_done += len(klines)
                    progress = min(0.99, candles_done / total_expected) if total_expected > 0 else 0.99
                    
                    # Atomic update for progress
                    await db.execute(
                        update(ExtractionJob)
                        .where(ExtractionJob.id == job_id)
                        .values(candles_done=candles_done, progress=progress)
                    )
                    await db.commit()
                    
                    yield {
                        "event": "progress",
                        "data": {
                            "candles_done": candles_done,
                            "progress": progress
                        }
                    }
                    
                    current_time = klines[-1][0] + 1
                    await asyncio.sleep(0.05)

                # 3. Finalize
                await db.execute(
                    update(ExtractionJob)
                    .where(ExtractionJob.id == job_id)
                    .values(status="done", progress=1.0, finished_at=datetime.now())
                )
                
                from cronograph.models.coverage import Coverage
                db.add(Coverage(
                    symbol=symbol,
                    interval=interval,
                    range_from=range_from,
                    range_to=range_to
                ))
                await db.commit()
                
                yield {"event": "done", "data": {"job_id": job_id}}

            except Exception as e:
                await db.execute(
                    update(ExtractionJob)
                    .where(ExtractionJob.id == job_id)
                    .values(status="failed", error=str(e))
                )
                await db.commit()
                yield {"event": "error", "data": str(e)}
