import { useState, useEffect, useRef } from 'react';
import { WebSocketClient } from '../lib/websocket-client';
import type { RuntimeMessage } from '../lib/types';

export function useSimulationStream(experimentId?: string | null) {
  const [events, setEvents] = useState<RuntimeMessage[]>([]);
  const [currentTick, setCurrentTick] = useState<number>(0);
  const [status, setStatus] = useState<string>('DISCONNECTED');
  const wsClient = useRef<WebSocketClient | null>(null);

  useEffect(() => {
    if (!experimentId) return;

    const baseWsUrl = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8000';
    const url = `${baseWsUrl}/ws/simulation/${experimentId}`;
    
    setStatus('CONNECTING');
    wsClient.current = new WebSocketClient(url);

    wsClient.current.connect((data: any) => {
      if (data.type === 'TICK') {
        setCurrentTick(data.payload?.tick ?? 0);
      } else if (data.type === 'EVENT') {
        // Cap event buffer to the latest 100 entries to prevent memory bloat
        setEvents((prev) => [...prev.slice(-99), data.payload]);
      } else if (data.type === 'STATUS_UPDATE') {
        setStatus(data.status || 'CONNECTED');
      }
    });

    return () => {
      if (wsClient.current) {
        wsClient.current.disconnect();
      }
    };
  }, [experimentId]);

  return { events, currentTick, status };
}