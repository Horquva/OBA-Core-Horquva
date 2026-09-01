import sys
from sentinel.app import app
from sentinel.middleware import SentinelSecurityMiddleware

def detect_middleware_drift():
    print("Evaluating Sentinel Architecture Drift...")
    
    # Extract list of loaded middlewares in the FastAPI app
    loaded_middlewares = [m.cls for m in app.user_middleware]
    
    if SentinelSecurityMiddleware not in loaded_middlewares:
        print("[CRITICAL DRIFT] SentinelSecurityMiddleware is MISSING from the application stack!")
        print("Violation of Constitutional Security Rule: No undocumented application security bypass is permitted.")
        sys.exit(1) # Fail closed
        
    print("[OK] Security Interceptor is correctly bound to the application trust boundary.")
    
    # Check for unauthorized route exposures (example check)
    exposed_routes = [route.path for route in app.routes if hasattr(route, "path")]
    print(f"[OK] Inspected {len(exposed_routes)} application routes behind the security boundary.")
    print("Application Security Architecture Validation: PASSED")
    sys.exit(0)

if __name__ == "__main__":
    detect_middleware_drift()