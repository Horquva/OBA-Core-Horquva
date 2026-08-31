'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import type { RuntimeMessage } from '@/lib/types';

export type ConnectionStatus = 'idle' | 'connecting' | 'connected' | 'reconnecting' | 'disconnected' | 'error';

interface UseSimulationStreamOptions {
  experimentId?: string;
  autoConnect?: boolean;
  maxRetries?: number;
  bufferCap?: number;
}

export function useSimulationStream({
  experimentId,
  autoConnect = true,
  maxRetries = 5,
  bufferCap = 100,
}: UseSimulationStreamOptions = {}) {
  const [events, setEvents] = useState<RuntimeMessage[]>([]);
  const [status, setStatus] = useState<ConnectionStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [isPaused, setIsPaused] = useState<boolean>(false);

  const socketRef = useRef<WebSocket | null>(null);
  const retryCountRef = useRef<number>(0);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pausedRef = useRef<boolean>(false);

  useEffect(() => {
    pausedRef.current = isPaused;
  }, [isPaused]);

  const cleanupSocket = useCallback(() => {
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }
    if (socketRef.current) {
      socketRef.current.onopen = null;
      socketRef.current.onclose = null;
      socketRef.current.onerror = null;
      socketRef.current.onmessage = null;
      socketRef.current.close();
      socketRef.current = null;
    }
  }, []);

  const connect = useCallback(() => {
    if (!experimentId) return;

    cleanupSocket();
    setStatus(retryCountRef.current > 0 ? 'reconnecting' : 'connecting');
    setError(null);

    const protocol = typeof window !== 'undefined' && window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
    const wsUrl = `${protocol}//${host}:8000/api/v1/runtime/stream/${experimentId}`;

    try {
      const socket = new WebSocket(wsUrl);
      socketRef.current = socket;

      socket.onopen = () => {
        setStatus('connected');
        retryCountRef.current = 0;
        setError(null);
      };

      socket.onmessage = (event: MessageEvent) => {
        if (pausedRef.current) return;

        try {
          const rawData = JSON.parse(event.data);
          const message: RuntimeMessage = {
            type: rawData.type || 'EVENT',
            payload: rawData.payload || rawData,
            timestamp: rawData.timestamp || new Date().toISOString(),
          };

          setEvents((prev) => {
            const nextEvents = [...prev, message];
            return nextEvents.length > bufferCap ? nextEvents.slice(-bufferCap) : nextEvents;
          });
        } catch {
          const fallbackMessage: RuntimeMessage = {
            type: 'RAW',
            payload: event.data,
            timestamp: new Date().toISOString(),
          };
          setEvents((prev) => {
            const nextEvents = [...prev, fallbackMessage];
            return nextEvents.length > bufferCap ? nextEvents.slice(-bufferCap) : nextEvents;
          });
        }
      };

      socket.onerror = () => {
        setError('WebSocket encountered a network error.');
        setStatus('error');
      };

      socket.onclose = (event) => {
        if (event.wasClean) {
          setStatus('disconnected');
        } else {
          if (retryCountRef.current < maxRetries) {
            const timeout = Math.min(1000 * 2 ** retryCountRef.current, 10000);
            setStatus('reconnecting');
            retryCountRef.current += 1;
            retryTimeoutRef.current = setTimeout(connect, timeout);
          } else {
            setStatus('disconnected');
            setError('Max reconnection attempts reached.');
          }
        }
      };
    } catch (err: any) {
      setStatus('error');
      setError(err.message || 'Failed to initialize WebSocket connection.');
    }
  }, [experimentId, maxRetries, bufferCap, cleanupSocket]);

  const disconnect = useCallback(() => {
    retryCountRef.current = maxRetries;
    cleanupSocket();
    setStatus('disconnected');
  }, [cleanupSocket, maxRetries]);

  const togglePause = useCallback(() => {
    setIsPaused((prev) => !prev);
  }, []);

  const clearEvents = useCallback(() => {
    setEvents([]);
  }, []);

  useEffect(() => {
    if (autoConnect && experimentId) {
      connect();
    }
    return () => {
      cleanupSocket();
    };
  }, [autoConnect, experimentId, connect, cleanupSocket]);

  return {
    events,
    status,
    error,
    isPaused,
    connect,
    disconnect,
    togglePause,
    clearEvents,
  };
}