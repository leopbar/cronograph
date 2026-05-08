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
    entry_price: float
    exit_price: float
    diff: float
    return_pct: float

class AnalysisResponse(BaseModel):
    total_weeks: int
    mean: float
    median: float
    p90: float
    max: float
    sharpe_ratio: float
    calmar_ratio: float
    max_drawdown: float
    total_return: float
    cumulative: List[HistogramData]
    discrete: List[HistogramData]
    results: List[WeeklyResult]

class HistogramService:
    @staticmethod
    def generate(results: List[WeeklyResult], bucket_size: int = 1000) -> AnalysisResponse:
        if not results:
            return AnalysisResponse(
                total_weeks=0, mean=0, median=0, p90=0, max=0,
                sharpe_ratio=0, calmar_ratio=0, max_drawdown=0, total_return=0,
                cumulative=[], discrete=[], results=[]
            )

        diffs = [r.diff for r in results]
        returns = [r.return_pct / 100.0 for r in results]
        
        # For histogram calculations, we use the clipped diffs (non-negative)
        clipped_diffs = [max(0.0, float(d)) for d in diffs]
        df = pl.DataFrame({"diff": clipped_diffs}, schema={"diff": pl.Float64})
        
        # Stats
        total_weeks = len(diffs)
        mean_val = cast(float, df["diff"].mean())
        median_val = cast(float, df["diff"].median())
        p90_val = cast(float, df["diff"].quantile(0.9))
        max_val = cast(float, df["diff"].max())

        # Risk Metrics Calculations
        returns_series = pl.Series("returns", returns)
        mean_return = returns_series.mean()
        std_return = returns_series.std()
        
        # Annualized Sharpe Ratio (assuming weekly windows)
        # Risk-free rate assumed 0
        sharpe = (mean_return / std_return * (52 ** 0.5)) if std_return and std_return > 0 else 0.0
        
        # Cumulative Return and Max Drawdown
        # We calculate the equity curve: (1 + r1) * (1 + r2) * ...
        equity_curve = [1.0]
        for r in returns:
            equity_curve.append(equity_curve[-1] * (1 + r))
        
        total_return = (equity_curve[-1] - 1.0) * 100.0
        
        # Max Drawdown
        peak = 0.0
        max_dd = 0.0
        for val in equity_curve:
            if val > peak:
                peak = val
            dd = (val - peak) / peak if peak > 0 else 0.0
            if dd < max_dd:
                max_dd = dd
        
        # Calmar Ratio: Annualized Return / Max Drawdown
        # Annualized Return = (Total Return + 1)^(52/total_weeks) - 1
        num_years = total_weeks / 52.0
        annualized_return = ((equity_curve[-1]) ** (1.0 / num_years) - 1.0) if num_years > 0 else 0.0
        calmar = (annualized_return / abs(max_dd)) if max_dd < 0 else 0.0

        # Discrete Histogram
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
            sharpe_ratio=round(float(sharpe), 2),
            calmar_ratio=round(float(calmar), 2),
            max_drawdown=round(float(max_dd * 100.0), 2),
            total_return=round(float(total_return), 2),
            cumulative=cumulative_data,
            discrete=discrete_data,
            results=results
        )
