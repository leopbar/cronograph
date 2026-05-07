from sqlalchemy import Column, String, Numeric, DateTime, PrimaryKeyConstraint
from sqlalchemy.orm import DeclarativeBase

class Base(DeclarativeBase):
    pass

class Candle(Base):
    __tablename__ = "candles"

    symbol = Column(String, nullable=False)
    interval = Column(String, nullable=False)
    open_time = Column(DateTime(timezone=True), nullable=False)
    open = Column(Numeric, nullable=False)
    high = Column(Numeric, nullable=False)
    low = Column(Numeric, nullable=False)
    close = Column(Numeric, nullable=False)
    volume = Column(Numeric, nullable=False)

    __table_args__ = (
        PrimaryKeyConstraint("symbol", "interval", "open_time"),
    )
