import polars as pl
from typing import List, cast
from pydantic import BaseModel

class HistogramData(BaseModel):
    label: str
    value: float
    count: int

class WeeklyResult(BaseModel):
    entry_time: str
    exit_time: str
    open_entry: float
    close_exit: float
    diff: float
    pct_change: float

class AnalysisResponse(BaseModel):
    total_weeks: int
    mean: float
    median: float
    p90: float
    max: float
    cumulative: List[HistogramData]
    discrete: List[HistogramData]
    results: List[WeeklyResult]

class HistogramService:
    @staticmethod
    def generate(results: List[WeeklyResult], bucket_size: int = 1000) -> AnalysisResponse:
        if not results:
            return AnalysisResponse(
                total_weeks=0, mean=0, median=0, p90=0, max=0, 
                cumulative=[], discrete=[], results=[]
            )

        diffs = [r.diff for r in results]
        # For histogram calculations, we use the clipped diffs (non-negative)
        clipped_diffs = [max(0, d) for d in diffs]
        df = pl.DataFrame({"diff": clipped_diffs})
        
        # Stats
        total_weeks = len(diffs)
        # Using cast(float, ...) to satisfy MyPy since Polars' type hints are broad
        mean_val = cast(float, df["diff"].mean())
        median_val = cast(float, df["diff"].median())
        p90_val = cast(float, df["diff"].quantile(0.9))
        max_val = cast(float, df["diff"].max())

        # Discrete Histogram
        # Group by floor(diff / bucket_size) * bucket_size
        discrete_df = df.with_columns([
            ((pl.col("diff") / bucket_size).floor() * bucket_size).alias("bucket")
        ]).group_by("bucket").agg(pl.count().alias("count")).sort("bucket")
        
        discrete_data = [
            HistogramData(
                label=f"{int(row['bucket'])}-{int(row['bucket'] + bucket_size)}",
                value=round((float(row['count']) / total_weeks) * 100, 2),
                count=int(row['count'])
            )
            for row in discrete_df.to_dicts()
        ]

        # Cumulative Histogram
        # For each bucket B, count diffs >= B
        # max_val is cast to float, bucket_size is int. Result of // is float if we are not careful
        max_bucket = int((max_val // bucket_size) * bucket_size)
        cumulative_data = []
        for b in range(0, max_bucket + bucket_size, bucket_size):
            count = df.filter(pl.col("diff") >= b).height
            cumulative_data.append(HistogramData(
                label=f"≥ {b}",
                value=round((float(count) / total_weeks) * 100, 2),
                count=count
            ))

        return AnalysisResponse(
            total_weeks=total_weeks,
            mean=round(mean_val, 2),
            median=round(median_val, 2),
            p90=round(p90_val, 2),
            max=round(max_val, 2),
            cumulative=cumulative_data,
            discrete=discrete_data,
            results=results
        )
