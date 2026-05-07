import asyncio
import logging
from datetime import datetime
from typing import AsyncGenerator
from sqlalchemy.ext.asyncio import AsyncSession
from cronograph.adapters.binance import BinanceAdapter
from cronograph.models.extraction_job import ExtractionJob
from cronograph.models.candle import Candle
from cronograph.services.estimator import EstimatorService
from sqlalchemy import select

logger = logging.getLogger(__name__)

class ExtractionService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.adapter = BinanceAdapter()

    async def run_extraction(self, job_id: str) -> AsyncGenerator[dict, None]:
        """
        Orchestrates the extraction process and yields progress updates.
        """
        # 1. Fetch job from DB
        result = await self.db.execute(select(ExtractionJob).where(ExtractionJob.id == job_id))
        job = result.scalar_one_or_none()
        if not job:
            yield {"error": "Job not found"}
            return

        job.status = "running"
        job.started_at = datetime.now()
        await self.db.commit()

        try:
            # 2. Calculate estimate (re-calculate to be sure)
            estimate = EstimatorService.get_estimate(job.range_from, job.range_to, job.interval)
            job.candles_total = estimate.candles_total
            await self.db.commit()

            current_time = int(job.range_from.timestamp() * 1000)
            end_time = int(job.range_to.timestamp() * 1000)
            
            candles_done = 0
            
            while current_time < end_time:
                # Fetch chunk (max 1000)
                klines = await self.adapter.get_klines(
                    symbol=job.symbol,
                    interval=job.interval,
                    start_time=current_time,
                    end_time=end_time,
                    limit=1000
                )
                
                if not klines:
                    break
                
                # Process and save
                candles = []
                for k in klines:
                    candle = Candle(
                        symbol=job.symbol,
                        interval=job.interval,
                        open_time=datetime.fromtimestamp(k[0] / 1000),
                        open=float(k[1]),
                        high=float(k[2]),
                        low=float(k[3]),
                        close=float(k[4]),
                        volume=float(k[5])
                    )
                    candles.append(candle)
                
                # Insert into DB (ON CONFLICT DO NOTHING handled by hypertable/model if unique)
                # For MVP, we'll just insert. 
                # Note: TimescaleDB handles duplicates depending on primary keys.
                self.db.add_all(candles)
                
                candles_done += len(klines)
                job.candles_done = candles_done
                job.progress = min(1.0, candles_done / job.candles_total) if job.candles_total > 0 else 1.0
                await self.db.commit()
                
                yield {
                    "progress": job.progress,
                    "candles_done": job.candles_done,
                    "candles_total": job.candles_total,
                    "status": job.status
                }
                
                # Update current_time to the next expected candle
                current_time = klines[-1][0] + 1
                
                # Small delay to respect rate limits if needed (adapter handles basics)
                await asyncio.sleep(0.1)

            job.status = "done"
            job.finished_at = datetime.now()
            
            # Update coverage
            from cronograph.models.coverage import Coverage
            coverage = Coverage(
                symbol=job.symbol,
                interval=job.interval,
                range_from=job.range_from,
                range_to=job.range_to
            )
            self.db.add(coverage)
            await self.db.commit()
            
            yield {
                "progress": 1.0,
                "candles_done": job.candles_done,
                "candles_total": job.candles_total,
                "status": "done"
            }

        except Exception as e:
            logger.error(f"Error in extraction job {job_id}: {e}")
            job.status = "failed"
            job.error = str(e)
            await self.db.commit()
            yield {"error": str(e), "status": "failed"}
        finally:
            await self.adapter.close()
