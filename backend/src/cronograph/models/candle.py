from decimal import Decimal
from datetime import datetime
from sqlalchemy import String, Numeric, DateTime, PrimaryKeyConstraint
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column

class Base(DeclarativeBase):
    pass

class Candle(Base):
    __tablename__ = "candles"

    symbol: Mapped[str] = mapped_column(String, nullable=False)
    interval: Mapped[str] = mapped_column(String, nullable=False)
    open_time: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    open: Mapped[Decimal] = mapped_column(Numeric, nullable=False)
    high: Mapped[Decimal] = mapped_column(Numeric, nullable=False)
    low: Mapped[Decimal] = mapped_column(Numeric, nullable=False)
    close: Mapped[Decimal] = mapped_column(Numeric, nullable=False)
    volume: Mapped[Decimal] = mapped_column(Numeric, nullable=False)

    __table_args__ = (
        PrimaryKeyConstraint("symbol", "interval", "open_time"),
    )
