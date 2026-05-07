from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from datetime import datetime
import json
from sse_starlette.sse import EventSourceResponse
from sqlalchemy.ext.asyncio import AsyncSession
from cronograph.core.db import get_db, SessionLocal
from cronograph.models.extraction_job import ExtractionJob
from cronograph.services.estimator import EstimatorService, ExtractionEstimate
from cronograph.services.extraction import ExtractionService

router = APIRouter(prefix="/extractions", tags=["extractions"])

class ExtractionPreviewRequest(BaseModel):
    symbol: str
    interval: str
    range_from: datetime
    range_to: datetime

@router.post("/preview")
async def get_extraction_preview(request: ExtractionPreviewRequest) -> ExtractionEstimate:
    if request.range_to <= request.range_from:
        raise HTTPException(status_code=400, detail="range_to must be after range_from")
    
    estimate = EstimatorService.get_estimate(
        request.range_from, 
        request.range_to, 
        request.interval
    )
    return estimate

@router.post("/")
async def start_extraction(request: ExtractionPreviewRequest, db: AsyncSession = Depends(get_db)):
    job = ExtractionJob(
        symbol=request.symbol,
        interval=request.interval,
        range_from=request.range_from,
        range_to=request.range_to,
        status="pending"
    )
    db.add(job)
    await db.commit()
    await db.refresh(job)
    return {"job_id": str(job.id)}

@router.get("/{job_id}/stream")
async def stream_extraction(job_id: str, db: AsyncSession = Depends(get_db)):
    service = ExtractionService(db, SessionLocal)
    
    async def event_generator():
        async for update in service.run_extraction(job_id):
            yield {
                "event": update["event"],
                "data": json.dumps(update["data"])
            }
            if update["event"] in ["done", "error"]:
                break

    return EventSourceResponse(event_generator())
