from ecosystem.applications.arcturus.src.governance.compliance_scanner import ArcturusComplianceScanner
import sys

def main():
    scanner = ArcturusComplianceScanner()
    report = scanner.run_full_scan()
    with open("ecosystem/applications/arcturus/docs/week4/evidence/compliance_report.md", "w", encoding="utf-8") as f:
        f.write(report.summary())
    if not report.is_compliant:
        sys.exit(1)

if __name__ == "__main__":
    main()
