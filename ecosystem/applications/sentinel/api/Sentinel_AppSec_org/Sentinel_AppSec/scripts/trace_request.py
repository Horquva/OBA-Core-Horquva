import jwt
from datetime import datetime, timedelta, timezone
from fastapi.testclient import TestClient
from sentinel.app import app

def execute_trace():
    print("🚀 Initializing Sentinel Trace Client...")
    client = TestClient(app)
    
    # 1. Generate a valid mock token for the trace
    payload = {
        "sub": "trace-engineer-001",
        "roles": ["user"],
        "iss": "sentinel-auth-service",
        "aud": "sentinel-api",
        "iat": int(datetime.now(timezone.utc).timestamp()),
        "exp": int((datetime.now(timezone.utc) + timedelta(hours=1)).timestamp())
    }
    secret = "sentinel-production-grade-hmac-sha256-secret-key-32b"
    token = jwt.encode(payload, secret, algorithm="HS256")
    
    # 2. Fire the Request
    print("📡 Sending POST request to /api/v1/profile...")
    response = client.post(
        "/api/v1/profile", 
        json={"display_name": "Trace User", "email": "trace@sentinel.io"},
        headers={"Authorization": f"Bearer {token}"}
    )
    
    # 3. Output the Final Result
    print("\n📦 Final Response Received by Client:")
    print(f"Status Code: {response.status_code}")
    print(f"Response Body: {response.json()}")

if __name__ == "__main__":
    execute_trace()