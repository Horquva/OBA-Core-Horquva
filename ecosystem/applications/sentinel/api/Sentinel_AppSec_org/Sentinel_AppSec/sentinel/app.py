from fastapi import FastAPI, Request
from pydantic import BaseModel, Field
from sentinel.middleware import SentinelSecurityMiddleware

app = FastAPI(title="Sentinel Protected API", version="1.0.0")

# Register Master Security Middleware
app.add_middleware(SentinelSecurityMiddleware)


class ProfileUpdateRequest(BaseModel):
    display_name: str
    email: str


@app.get("/health")
def health_check():
    return {"status": "HEALTHY", "engine": "Sentinel AppSec Platform"}


@app.get("/api/v1/profile")
def get_profile(request: Request):
    ctx = request.state.security_context
    return {
        "user_id": ctx.subject,
        "roles": ctx.roles,
        "email": "syed.abdur.rehman@internal-sentinel.io",
        "ssn": "123-45-6789",  # Will be masked automatically by OutputSanitizer
        "api_key": "secret-live-token-12345"  # Will be redacted automatically
    }


@app.post("/api/v1/profile")
def update_profile(request: Request):
    data = request.state.parsed_json
    return {
        "status": "UPDATED",
        "updated_by": request.state.security_context.subject,
        "received_data": data
    }


@app.get("/api/v1/data")
def get_analyst_data():
    return {"data_lake_records": 42000, "classification": "RESTRICTED"}