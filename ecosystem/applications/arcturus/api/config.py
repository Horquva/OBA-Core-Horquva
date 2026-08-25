from pydantic_settings import BaseSettings
from pathlib import Path

class Settings(BaseSettings):
    app_name: str = "Arcturus Simulation Platform"
    debug: bool = False
    workers: int = 1  # Single-process architecture: in-process EventBus and async runtime loop
    db_path: Path = Path(__file__).parent.parent / "data" / "arcturus.db"
    cors_origins: list[str] = ["http://localhost:3002", "http://localhost:3000"]
    gemini_api_key: str = ""  # loaded from ARCTURUS_GEMINI_API_KEY env var
    model_config = {"env_prefix": "ARCTURUS_"}
