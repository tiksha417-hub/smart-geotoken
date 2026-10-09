import os
from typing import List, Union
from pydantic import AnyHttpUrl, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    PROJECT_NAME: str = "GeoToken API"
    VERSION: str = "1.0.0"
    ENVIRONMENT: str = "development"
    DEBUG: bool = True

    HOST: str = "0.0.0.0"
    PORT: int = 8000
    API_V1_PREFIX: str = "/api/v1"

    DATABASE_URL: str = "sqlite:///./geotoken.db"

    SECRET_KEY: str = "geotoken-super-secret-production-grade-jwt-key-change-me"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440

    DEFAULT_GEOFENCE_RADIUS_METERS: int = 500
    DEFAULT_TOKEN_VALIDITY_MINUTES: int = 45
    CALLED_TOKEN_NO_SHOW_TIMEOUT_MINUTES: int = 3
    TOKEN_EXPIRATION_CHECK_INTERVAL_SECONDS: int = 60

    CORS_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "*"
    ]

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore"
    )


settings = Settings()
