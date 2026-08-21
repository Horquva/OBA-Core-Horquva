import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { api } from "../api/client";
import { useAuth } from "./AuthContext";

const AltairContext = createContext(null);

export function AltairProvider({ children }) {
  const { user } = useAuth();
  const [workflows, setWorkflows] = useState([]);
  const [executions, setExecutions] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [auditEvents, setAuditEvents] = useState([]);
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      const [workflowResult, executionResult, notificationResult, auditResult, metricsResult] = await Promise.all([
        api.workflows(),
        api.executions(),
        api.notifications(),
        api.audit(),
        api.metrics(),
      ]);
      setWorkflows(workflowResult.workflows);
      setExecutions(executionResult.executions);
      setNotifications(notificationResult.notifications);
      setAuditEvents(auditResult.events);
      setMetrics(metricsResult);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const source = new EventSource("/api/stream", { withCredentials: true });
    const refresh = () => load();
    source.addEventListener("execution.updated", refresh);
    source.addEventListener("workflow.event", refresh);
    source.addEventListener("ready", () => {});
    source.onerror = () => {};
    return () => source.close();
  }, [load]);

  const getWorkflow = useCallback((id) => workflows.find((w) => w.id === id), [workflows]);
  const getExecution = useCallback((id) => executions.find((e) => e.id === id), [executions]);
  const executionsForWorkflow = useCallback((id) => executions.filter((e) => e.workflowId === id), [executions]);

  const action = async (fn) => {
    const result = await fn();
    await load();
    return result;
  };

  const apiState = useMemo(() => ({
    workflows,
    getWorkflow,
    executions,
    getExecution,
    executionsForWorkflow,
    notifications,
    auditEvents,
    metrics,
    unreadCount: notifications.filter((n) => !n.read).length,
    loading,
    error,
    refresh: load,
    initiateWorkflow: (workflowId, inputs, idempotencyKey) => action(() => api.execute(workflowId, inputs, idempotencyKey)),
    approve: (id) => action(() => api.approve(id)),
    reject: (id, reason) => action(() => api.reject(id, reason)),
    retry: (id) => action(() => api.retry(id)),
    cancel: (id) => action(() => api.cancel(id)),
    markNotificationRead: (id) => action(() => api.markNotificationRead(id)),
    markAllRead: () => action(() => api.markAllNotificationsRead()),
    can: (permission) => Boolean(user?.permissions?.includes(permission)),
  }), [workflows, getWorkflow, executions, getExecution, executionsForWorkflow, notifications, auditEvents, metrics, loading, error, load, user]);

  return <AltairContext.Provider value={apiState}>{children}</AltairContext.Provider>;
}

export const useAltair = () => useContext(AltairContext);
