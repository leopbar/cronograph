import uuid
from datetime import datetime
from typing import Optional
from sqlalchemy import String, DateTime, Float, Integer
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column
from cronograph.models.candle import Base

class ExtractionJob(Base):
    __tablename__ = "extraction_jobs"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    symbol: Mapped[str] = mapped_column(String, nullable=False)
    interval: Mapped[str] = mapped_column(String, nullable=False)
    range_from: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    range_to: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    status: Mapped[str] = mapped_column(String, nullable=False)  # pending, running, done, failed, canceled
    progress: Mapped[float] = mapped_column(Float, default=0.0)
    candles_total: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    candles_done: Mapped[int] = mapped_column(Integer, default=0)
    error: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    started_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    finished_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
