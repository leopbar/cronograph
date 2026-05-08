from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    PROJECT_NAME: str = "Cronograph"
    API_V1_STR: str = "/api/v1"

    POSTGRES_SERVER: str = "localhost"
    POSTGRES_PORT: str = "5440"
    POSTGRES_USER: str = "postgres"
    POSTGRES_PASSWORD: str = "password"
    POSTGRES_DB: str = "cronograph"
    DATABASE_URL: str | None = None

    # Auth
    SECRET_KEY: str = "CHANGE_ME_IN_PRODUCTION_use_secrets_token_urlsafe_64"
    ACCESS_TTL_MIN: int = 15
    REFRESH_TTL_DAYS: int = 14
    COOKIE_SECURE: bool = True
    COOKIE_DOMAIN: str | None = None
    CORS_ORIGINS: list[str] = [
        "http://localhost:3000",
        "http://localhost:3001",
        "http://localhost:3002",
    ]

    @property
    def async_database_url(self) -> str:
        if self.DATABASE_URL:
            return self.DATABASE_URL.replace("postgresql://", "postgresql+asyncpg://")
        return (
            f"postgresql+asyncpg://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}"
            f"@{self.POSTGRES_SERVER}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}"
        )

    model_config = SettingsConfigDict(case_sensitive=True, env_file=".env")

settings = Settings()
