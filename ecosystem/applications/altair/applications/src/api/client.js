async function request(path, options = {}) {
  const response = await fetch(`/api${path}`, {
    credentials: "include",
    headers: { "content-type": "application/json", ...(options.headers || {}) },
    ...options,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(payload.error || `Request failed with ${response.status}`);
    error.status = response.status;
    error.payload = payload;
    throw error;
  }
  return payload;
}

export const api = {
  me: () => request("/auth/me"),
  login: (email, password) => request("/auth/login", { method: "POST", body: { email, password } }),
  logout: () => request("/auth/logout", { method: "POST" }),
  workflows: () => request("/workflows"),
  workflowVersions: (id) => request(`/workflows/${id}/versions`),
  createWorkflowVersion: (id, definition, version) => request(`/workflows/${id}/versions`, { method: "POST", body: { definition, version, status: "published" } }),
  executions: () => request("/executions"),
  execute: (workflowId, inputs, idempotencyKey) =>
    request(`/workflows/${workflowId}/execute`, {
      method: "POST",
      headers: idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {},
      body: { inputs },
    }),
  approve: (id) => request(`/executions/${id}/approve`, { method: "POST" }),
  reject: (id, reason) => request(`/executions/${id}/reject`, { method: "POST", body: { reason } }),
  retry: (id) => request(`/executions/${id}/retry`, { method: "POST" }),
  cancel: (id) => request(`/executions/${id}/cancel`, { method: "POST" }),
  notifications: () => request("/notifications"),
  markNotificationRead: (id) => request(`/notifications/${id}/read`, { method: "POST" }),
  markAllNotificationsRead: () => request("/notifications/read-all", { method: "POST" }),
  audit: () => request("/audit"),
  metrics: () => request("/metrics"),
};
