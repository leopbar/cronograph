FROM python:3.13-slim

# Install uv
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

# Set working directory
WORKDIR /app

# Install dependencies
COPY pyproject.toml uv.lock ./
RUN uv sync --frozen --no-cache

# Copy source code
COPY . .

# Expose port
EXPOSE 8000

# Start application
CMD ["uv", "run", "uvicorn", "src.cronograph.main:app", "--host", "0.0.0.0", "--port", "8000"]
