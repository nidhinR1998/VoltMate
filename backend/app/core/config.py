from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional
from urllib.parse import quote_plus


class Settings(BaseSettings):
    APP_NAME: str = "VoltMate"
    APP_ENV: str = "development"
    API_V1_PREFIX: str = "/api/v1"
    SECRET_KEY: str = "voltmate_dev_secret_jwt_encryption_key_32char_minimum"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 15
    REFRESH_TOKEN_EXPIRE_DAYS: int = 30

    # PostgreSQL + PostGIS (Enterprise IBM MDM + Kimball EDW — loaded from .env)
    POSTGRES_USER: str = "postgres"
    POSTGRES_PASSWORD: str = ""
    POSTGRES_DB: str = "voltmate_edw"
    POSTGRES_HOST: str = "localhost"
    POSTGRES_PORT: int = 5432
    DATABASE_URL: Optional[str] = None

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

    # Maps (loaded from .env)
    OLA_MAPS_API_KEY: str = ""
    GOOGLE_MAPS_API_KEY: str = ""
    OPEN_FREE_MAP_URL: str = "https://tiles.openfreemap.org/styles/dark"

    # Google OAuth (loaded from .env)
    GOOGLE_CLIENT_ID: str = ""
    GOOGLE_ANDROID_CLIENT_ID: str = ""
    GOOGLE_EXTRA_CLIENT_IDS: str = ""
    GOOGLE_CLIENT_SECRET: str = ""

    # Razorpay & Payment Policies (loaded from .env)
    RAZORPAY_KEY_ID: str = ""
    RAZORPAY_KEY_SECRET: str = ""
    RAZORPAY_WEBHOOK_SECRET: str = ""
    MIN_TOPUP_INR: int = 10
    MAX_TOPUP_INR: int = 50000
    PLATFORM_FEE_PERCENT: float = 5.0
    GST_PERCENT: float = 18.0

    # SMTP for OTP Emails (loaded from .env)
    SMTP_HOST: str = "smtp.gmail.com"
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    SMTP_FROM_NAME: str = "VoltMate Spark Security"
    SMTP_FROM_EMAIL: str = ""

    # Default UPI ID for platform or fallbacks
    VOLTMATE_MERCHANT_VPA: str = "voltmate.community@okaxis"
    CORS_ORIGINS: str = "https://voltmate.co.in,https://api.voltmate.co.in,http://localhost:8081,http://localhost:19006"

    def get_cors_origins(self) -> list[str]:
        if self.APP_ENV.lower() in ("development", "dev", "test"):
            return ["*"]
        return [o.strip() for o in self.CORS_ORIGINS.split(",") if o.strip()]


    model_config = SettingsConfigDict(
        env_file=(".env", "backend/.env"),
        env_file_encoding="utf-8",
        extra="ignore"
    )

    def validate_production_config(self) -> None:
        if self.APP_ENV.lower() == "production":
            missing = []
            if not self.SECRET_KEY or "dev_secret" in self.SECRET_KEY:
                missing.append("SECRET_KEY")
            if not self.DATABASE_URL and not self.POSTGRES_PASSWORD:
                missing.append("DATABASE_URL or POSTGRES_PASSWORD")
            if missing:
                raise RuntimeError(
                    f"Missing required production environment variables: {', '.join(missing)}"
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

