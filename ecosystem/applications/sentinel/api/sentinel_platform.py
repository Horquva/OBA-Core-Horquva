from flask import Flask, request, jsonify
import re
import datetime
import uuid # NEW: To generate unique Correlation IDs

app = Flask(__name__)

# --- CONFIGURATION ---
VALID_SENTINEL_TOKEN = "SENTINEL-SHARED-SECRET-2026"
THREAT_PATTERNS = [r"(?i)OR 1=1", r"(?i)<script>"]

# --- W2 AUDIT & TELEMETRY ENGINE (PART P & W) ---
def log_security_event(correlation_id, event_type, status, details):
    """Creates a machine-readable audit entry."""
    timestamp = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    
    # We use a structured format: Timestamp | ID | Event | Status | Description
    log_entry = f"{timestamp} | ID: {correlation_id} | EVENT: {event_type} | STATUS: {status} | DETAILS: {details}\n"
    
    with open("sentinel_audit.log", "a") as f:
        f.write(log_entry)
    print(f"TELEMETRY CAPTURED: {event_type} for {correlation_id}")

# --- W2 SECURITY MIDDLEWARE ---
@app.before_request
def security_gatekeeper():
    # STEP 1: Generate Correlation ID (PART B)
    # Every request gets a unique "tracking number"
    req_id = str(uuid.uuid4())[:8] 
    
    # STEP 2: Identity Check
    auth_header = request.headers.get('Authorization')
    if not auth_header or auth_header != VALID_SENTINEL_TOKEN:
        log_security_event(req_id, "AUTH_FAILURE", "BLOCKED", f"Invalid token provided")
        return jsonify({"status": "Blocked", "req_id": req_id}), 403

    # STEP 3: Threat Detection
    if request.method == 'POST':
        data = request.get_json()
        for key, value in data.items():
            if any(re.search(p, str(value)) for p in THREAT_PATTERNS):
                log_security_event(req_id, "THREAT_DETECTED", "BLOCKED", f"Pattern found in {key}")
                return jsonify({"status": "Blocked", "reason": "Threat", "req_id": req_id}), 400

    # STEP 4: Success Telemetry
    log_security_event(req_id, "REQUEST_ALLOWED", "SUCCESS", f"Path: {request.path}")
    # We attach the ID to the request so other functions can use it
    request.correlation_id = req_id

@app.route('/api/register', methods=['POST'])
def register_user():
    return jsonify({
        "message": "User registered.",
        "correlation_id": request.correlation_id # We give the ID back to the user
    })

if __name__ == '__main__':
    app.run(port=5000)