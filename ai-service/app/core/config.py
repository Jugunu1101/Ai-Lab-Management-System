from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    APP_NAME: str = "Programming Lab AI Service"
    APP_ENV: str = "development"
    APP_HOST: str = "0.0.0.0"
    APP_PORT: int = 8000

    AI_PROVIDER: str = "auto"
    GEMINI_API_KEY: str = ""
    GOOGLE_API_KEY: str = ""
    OPENAI_API_KEY: str = ""
    AI_BASE_URL: str = ""
    
    AI_MOCK_MODE: bool = False
    AI_ANALYSIS_MODEL: str = "gemini-3.1-flash-lite"
    AI_QUIZ_MODEL: str = "gemini-3.1-flash-lite"
    AI_REPORT_MODEL: str = "gemini-3.1-flash-lite"
    AI_LEARNING_PATH_MODEL: str = "gemini-3.1-flash-lite"

    AI_REQUEST_TIMEOUT: int = 30
    AI_MAX_RETRIES: int = 2
    
    AI_RATE_LIMIT: int = 30
    AI_RATE_WINDOW_SECONDS: int = 60
    MAX_REQUEST_BODY_BYTES: int = 1048576

    model_config = SettingsConfigDict(
        env_file=".env",
        case_sensitive=False
    )


settings = Settings()