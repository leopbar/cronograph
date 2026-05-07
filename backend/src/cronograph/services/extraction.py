import asyncio
from typing import AsyncGenerator
from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker
from sqlalchemy import select
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
        Orchestrates the extraction process using a fresh session.
        """
        # Create a new session specifically for this background generator
        async with self.session_factory() as db:
            result = await db.execute(select(ExtractionJob).where(ExtractionJob.id == job_id))
            job = result.scalar_one_or_none()
            if not job:
                yield {"event": "error", "data": "Job not found"}
                return

            job.status = "running"
            job.started_at = datetime.now()
            await db.commit()
            await db.refresh(job)

            symbol = job.symbol
            interval = job.interval
            range_from = job.range_from
            range_to = job.range_to

            try:
                # 2. Calculate estimate
                estimate = self.estimator.get_estimate(range_from, range_to, interval)
                job.candles_total = estimate.candles_total
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
                    
                    candles = []
                    for k in klines:
                        candle = Candle(
                            symbol=symbol,
                            interval=interval,
                            open_time=datetime.fromtimestamp(k[0] / 1000),
                            open=float(k[1]),
                            high=float(k[2]),
                            low=float(k[3]),
                            close=float(k[4]),
                            volume=float(k[5])
                        )
                        candles.append(candle)
                    
                    db.add_all(candles)
                    
                    candles_done += len(klines)
                    
                    # Fresh query to update job status
                    result = await db.execute(select(ExtractionJob).where(ExtractionJob.id == job_id))
                    job_update = result.scalar_one()
                    job_update.candles_done = candles_done
                    job_update.progress = min(0.99, candles_done / job_update.candles_total) if job_update.candles_total > 0 else 0.99
                    await db.commit()
                    
                    yield {
                        "event": "progress",
                        "data": {
                            "candles_done": candles_done,
                            "progress": job_update.progress
                        }
                    }
                    
                    current_time = klines[-1][0] + 1
                    await asyncio.sleep(0.1)

                # Finalize
                result = await db.execute(select(ExtractionJob).where(ExtractionJob.id == job_id))
                job_final = result.scalar_one()
                job_final.status = "done"
                job_final.progress = 1.0
                job_final.finished_at = datetime.now()
                
                from cronograph.models.coverage import Coverage
                coverage = Coverage(
                    symbol=symbol,
                    interval=interval,
                    range_from=range_from,
                    range_to=range_to
                )
                db.add(coverage)
                await db.commit()
                
                yield {"event": "done", "data": {"job_id": job_id}}

            except Exception as e:
                # Refresh job to update error
                result = await db.execute(select(ExtractionJob).where(ExtractionJob.id == job_id))
                job_err = result.scalar_one()
                job_err.status = "failed"
                job_err.error = str(e)
                await db.commit()
                yield {"event": "error", "data": str(e)}
