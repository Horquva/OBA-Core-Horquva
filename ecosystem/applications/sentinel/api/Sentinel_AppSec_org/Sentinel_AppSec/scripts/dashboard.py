import json
import sys
from collections import Counter

def generate_dashboard(log_file: str):
    total_requests = 0
    decisions = Counter()
    threats = Counter()
    status_codes = Counter()

    print("="*55)
    print(" 🛡️  SENTINEL APPLICATION SECURITY DASHBOARD 🛡️")
    print("="*55)

    try:
        with open(log_file, 'r') as f:
            for line in f:
                try:
                    # Attempt to parse as Sentinel Audit JSON
                    event = json.loads(line.strip())
                    
                    # Only process valid Sentinel AppSec events
                    if "sentinel_event_version" in event:
                        total_requests += 1
                        decisions[event.get("decision")] += 1
                        status_codes[event.get("http_status_code")] += 1
                        
                        # Tally specific OWASP threats
                        for t in event.get("threat_details", []):
                            threats[t.get("category")] += 1
                except json.JSONDecodeError:
                    # Safely skip non-JSON lines (like pytest console output)
                    continue 
    except FileNotFoundError:
        print(f"[ERROR] Could not find log file: {log_file}")
        sys.exit(1)

    print(f"Total Monitored Requests: {total_requests}")
    
    print("\n--- 🛑 SECURITY DECISIONS ---")
    for decision, count in decisions.items():
        print(f"  {decision}: {count}")

    print("\n--- 📡 HTTP STATUS CODES ---")
    for status, count in status_codes.items():
        print(f"  HTTP {status}: {count}")

    print("\n--- 🕷️ THREATS DETECTED (OWASP) ---")
    if not threats:
        print("  No threats detected.")
    else:
        for threat, count in threats.items():
            print(f"  {threat}: {count}")
    print("="*55)
    print("Application Security Telemetry: ACTIVE")

if __name__ == "__main__":
    # Default to 'audit.log' if no file is provided
    log_path = sys.argv[1] if len(sys.argv) > 1 else "audit.log"
    generate_dashboard(log_path)