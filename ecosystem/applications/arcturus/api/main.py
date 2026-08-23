from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from ecosystem.applications.arcturus.api.config import Settings
from ecosystem.applications.arcturus.api.database import init_database
from ecosystem.applications.arcturus.api.services.event_bus import EventBus
from ecosystem.applications.arcturus.contracts.shared.base_models import (
    APIErrorResponse,
    ArcturusValidationError,
)

settings = Settings()

@asynccontextmanager
async def lifespan(app: FastAPI):
    settings.db_path.parent.mkdir(parents=True, exist_ok=True)
    init_database(settings.db_path)
    
    # Initialize global EventBus
    app.state.event_bus = EventBus()
    
    yield

app = FastAPI(title=settings.app_name, lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Upstream platform routers — mounted as they land
try:
    from ecosystem.applications.arcturus.api.routers.ontology import router as ontology_router
    app.include_router(ontology_router)
except ImportError:
    pass  # Hamza's PR not yet merged

try:
    from ecosystem.applications.arcturus.api.routers.enterprise import router as enterprise_router
    app.include_router(enterprise_router)
except ImportError:
    pass  # Ajwa's PR not yet merged

try:
    from ecosystem.applications.arcturus.api.routers.experiments import router as experiments_router
    app.include_router(experiments_router)
except ImportError:
    pass  # Experiments router not yet built

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
