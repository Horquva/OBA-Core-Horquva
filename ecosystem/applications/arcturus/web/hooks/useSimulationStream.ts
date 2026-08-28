import { useState, useEffect, useRef } from 'react';
import { WebSocketClient } from '../lib/websocket-client';

export function useSimulationStream(experimentId: string) {
  const [events, setEvents] = useState<any[]>([]);
  const [currentTick, setCurrentTick] = useState(0);
  const [status, setStatus] = useState('CONNECTING');
  const wsClient = useRef<WebSocketClient | null>(null);

  useEffect(() => {
    if (!experimentId) return;
    const url = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8000/api/v1/ws/simulation';
    wsClient.current = new WebSocketClient(`${url}/${experimentId}`);

    wsClient.current.connect((data) => {
      if (data.type === 'TICK') setCurrentTick(data.payload.tick);
      else if (data.type === 'EVENT') setEvents(prev => [...prev, data.payload]);
      else if (data.type === 'STATUS_UPDATE') setStatus(data.status);
    });

    return () => {
      if (wsClient.current) wsClient.current.disconnect();
    };
  }, [experimentId]);

  return { events, currentTick, status };
}