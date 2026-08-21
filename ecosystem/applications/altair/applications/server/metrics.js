const counters = {
  httpRequests: 0,
  authFailures: 0,
  executionsStarted: 0,
  executionsCompleted: 0,
  executionsFailed: 0,
  retries: 0,
};

export function inc(name) {
  if (name in counters) counters[name] += 1;
}

export function snapshot() {
  return {
    ...counters,
    process: {
      uptimeSeconds: process.uptime(),
      memoryBytes: process.memoryUsage(),
    },
    at: new Date().toISOString(),
  };
}
