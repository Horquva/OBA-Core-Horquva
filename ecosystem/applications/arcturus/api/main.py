from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from ecosystem.applications.arcturus.api.config import Settings
from ecosystem.applications.arcturus.api.database import init_database
from ecosystem.applications.arcturus.contracts.shared.base_models import (
    APIErrorResponse,
    ArcturusValidationError,
)

settings = Settings()

@asynccontextmanager
async def lifespan(app: FastAPI):
    settings.db_path.parent.mkdir(parents=True, exist_ok=True)
    init_database(settings.db_path)
    yield

app = FastAPI(title=settings.app_name, lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.exception_handler(ArcturusValidationError)
async def arcturus_error_handler(request: Request, exc: ArcturusValidationError):
    response = APIErrorResponse(
        error_code="ARCTURUS_VALIDATION_ERROR",
        message=exc.message,
        platform_source=exc.platform_source,
    )
    return JSONResponse(status_code=422, content=response.model_dump(mode="json"))

@app.get("/health")
async def health_check():
    return {"status": "ok", "platform": settings.app_name}
