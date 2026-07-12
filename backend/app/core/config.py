from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = "postgresql://rackpilot:rackpilot@localhost:5432/rackpilot"
    jwt_secret: str = "change-me-in-production-use-32-plus-bytes"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 30
    refresh_token_expire_days: int = 7
    uploads_dir: str = "uploads"
    # AI assistant (optional). Feature is disabled when the key is empty.
    openrouter_api_key: str = ""
    openrouter_model: str = "openai/gpt-4o-mini"
    frontend_base_url: str = "http://localhost:3000"


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
