from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional
from urllib.parse import quote_plus
import os

class Settings(BaseSettings):
    APP_NAME: str = "VoltMate"
    APP_ENV: str = "development"
    API_V1_PREFIX: str = "/api/v1"
    SECRET_KEY: str = "voltmate_super_secret_jwt_encryption_key_production_grade_32char"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 15
    REFRESH_TOKEN_EXPIRE_DAYS: int = 30

    # PostgreSQL + PostGIS (Enterprise IBM MDM + Kimball EDW)
    POSTGRES_USER: str = "postgres"
    POSTGRES_PASSWORD: str = "Smart_Bike@04"
    POSTGRES_DB: str = "voltmate_edw"
    POSTGRES_HOST: str = "0.tcp.in.ngrok.io"
    POSTGRES_PORT: int = 28706
    DATABASE_URL: Optional[str] = "postgresql+asyncpg://postgres:Smart_Bike%4004@0.tcp.in.ngrok.io:28706/voltmate_edw"

    # Redis
    REDIS_HOST: str = "localhost"
    REDIS_PORT: int = 6379
    REDIS_DB: int = 0
    REDIS_URL: Optional[str] = None

    # Mosquitto MQTT & Smart Plugs
    MQTT_BROKER_HOST: str = "localhost"
    MQTT_BROKER_PORT: int = 1883
    MQTT_TOPIC_PREFIX: str = "voltmate/plugs/"

    # OSRM
    OSRM_BASE_URL: str = "https://router.project-osrm.org"

    # Maps
    OLA_MAPS_API_KEY: str = "x41faa8s8O0ARqrXjAlOToelM9sSG0"
    OPEN_FREE_MAP_URL: str = "https://tiles.openfreemap.org/styles/dark"

    # Google OAuth
    GOOGLE_CLIENT_ID: str = "809643418045-9gi8mijpdgn1sgli3p0b0bnmt6i2peub.apps.googleusercontent.com"
    GOOGLE_CLIENT_SECRET: str = ""

    # Razorpay
    RAZORPAY_KEY_ID: str = ""
    RAZORPAY_KEY_SECRET: str = ""

    # SMTP for OTP Emails
    SMTP_HOST: str = "smtp.gmail.com"
    SMTP_PORT: int = 587
    SMTP_USER: str = "auravaultofficialteam@gmail.com"
    SMTP_PASSWORD: str = ""
    SMTP_FROM_NAME: str = "VoltMate Spark Security"
    SMTP_FROM_EMAIL: str = "auravaultofficialteam@gmail.com"

    # Default UPI ID for platform or fallbacks
    VOLTMATE_MERCHANT_VPA: str = "voltmate.community@okaxis"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

    def get_database_url(self) -> str:
        encoded_pwd = quote_plus(self.POSTGRES_PASSWORD)
        if self.DATABASE_URL:
            url = self.DATABASE_URL
            if url.startswith("postgres://"):
                url = url.replace("postgres://", "postgresql+asyncpg://", 1)
            elif url.startswith("postgresql://"):
                url = url.replace("postgresql://", "postgresql+asyncpg://", 1)
            # Handle unencoded '@' inside password if present
            if url.count("@") > 1 and "://" in url:
                scheme, rest = url.split("://", 1)
                userinfo, hostpart = rest.rsplit("@", 1)
                if ":" in userinfo:
                    u, p = userinfo.split(":", 1)
                    url = f"{scheme}://{u}:{quote_plus(p)}@{hostpart}"
            return url
        return f"postgresql+asyncpg://{self.POSTGRES_USER}:{encoded_pwd}@{self.POSTGRES_HOST}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}"

    def get_redis_url(self) -> str:
        if self.REDIS_URL:
            return self.REDIS_URL
        return f"redis://{self.REDIS_HOST}:{self.REDIS_PORT}/{self.REDIS_DB}"

settings = Settings()

