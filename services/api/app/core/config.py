"""
NeuroLab Enterprise - Configuration Module
"""
import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent.parent
DATA_DIR = BASE_DIR / "data"
DATA_DIR.mkdir(parents=True, exist_ok=True)

class Settings:
    PROJECT_NAME: str = "NeuroLab Enterprise API"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"
    
    # Database
    DATA_DIR: Path = DATA_DIR
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL", 
        f"sqlite:///{DATA_DIR / 'neurolab.db'}"
    )
    
    # Security & RBAC
    SECRET_KEY: str = os.getenv("SECRET_KEY", "neurolab-enterprise-secret-key-2026")
    DEFAULT_ROLE: str = "Ingeniero de IA"
    
    # Limits & Resources
    MAX_CONCURRENT_JOBS: int = 4
    MAX_EPOCHS_LIMIT: int = 500
    MAX_UPLOAD_SIZE_MB: int = 50
    WORKER_TIMEOUT_SECONDS: int = 3600
    
    # Storage
    STORAGE_DIR: Path = DATA_DIR / "storage"

settings = Settings()
settings.STORAGE_DIR.mkdir(parents=True, exist_ok=True)
