from datetime import datetime
from sqlalchemy import String, DateTime, PrimaryKeyConstraint
from sqlalchemy.orm import Mapped, mapped_column
from cronograph.models.candle import Base

class Coverage(Base):
    __tablename__ = "coverage"

    symbol: Mapped[str] = mapped_column(String, nullable=False)
    interval: Mapped[str] = mapped_column(String, nullable=False)
    range_from: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    range_to: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

    __table_args__ = (
        PrimaryKeyConstraint("symbol", "interval", "range_from", "range_to"),
    )
