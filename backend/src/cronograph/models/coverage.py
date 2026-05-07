from sqlalchemy import Column, String, DateTime, Integer, func
from cronograph.models.candle import Base

class Coverage(Base):
    __tablename__ = "coverage"

    id = Column(Integer, primary_key=True, autoincrement=True)
    symbol = Column(String, nullable=False)
    interval = Column(String, nullable=False)
    range_from = Column(DateTime(timezone=True), nullable=False)
    range_to = Column(DateTime(timezone=True), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
