from fastapi import APIRouter
from pydantic import BaseModel
from typing import List

router = APIRouter(prefix="/api/v1/system", tags=["system"])

class SystemComponent(BaseModel):
    id: str
    name: str
    status: str
    uptime: str
    latency_ms: int

class SystemHealth(BaseModel):
    overall_status: str
    components: List[SystemComponent]
    last_updated: str

@router.get("/health", response_model=SystemHealth)
async def get_system_health():
    """Get overall system health and component status"""
    return {
        "overall_status": "healthy",
        "last_updated": "2026-08-31T08:35:00Z",
        "components": [
            {
                "id": "comp-1",
                "name": "API Gateway",
                "status": "healthy",
                "uptime": "99.99%",
                "latency_ms": 12
            },
            {
                "id": "comp-2",
                "name": "Runtime Engine",
                "status": "healthy",
                "uptime": "99.95%",
                "latency_ms": 45
            },
            {
                "id": "comp-3",
                "name": "Database Cluster",
                "status": "healthy",
                "uptime": "100%",
                "latency_ms": 5
            }
        ]
    }
