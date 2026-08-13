// Part R — Negative Test Fixture: SAST Detection
//
// This file intentionally contains a pattern that matches Sentinel's own
// custom Semgrep rule "sentinel-no-disabled-tls-verification" (severity
// ERROR, defined in security-gates/sast/semgrep-rules/sentinel-custom-rules.yml)
// so the negative-test workflow can prove SAST actually detects and blocks
// on real findings. This code is never executed, imported, or built into
// any real service — it exists only for this controlled test.

function insecureExampleDoNotUse(options) {
  options.rejectUnauthorized = false; // deliberately insecure — SAST must flag this
  return options;
}
