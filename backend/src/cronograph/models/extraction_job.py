import uuid
from sqlalchemy import Column, String, DateTime, Float, Integer
from sqlalchemy.dialects.postgresql import UUID
from cronograph.models.candle import Base

class ExtractionJob(Base):
    __tablename__ = "extraction_jobs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    symbol = Column(String, nullable=False)
    interval = Column(String, nullable=False)
    range_from = Column(DateTime(timezone=True), nullable=False)
    range_to = Column(DateTime(timezone=True), nullable=False)
    status = Column(String, nullable=False)  # pending, running, done, failed, canceled
    progress = Column(Float, default=0.0)
    candles_total = Column(Integer, nullable=True)
    candles_done = Column(Integer, default=0)
    error = Column(String, nullable=True)
    started_at = Column(DateTime(timezone=True), nullable=True)
    finished_at = Column(DateTime(timezone=True), nullable=True)
