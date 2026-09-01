import { useState, useEffect, useRef } from 'react';
import { WebSocketClient } from '../lib/websocket-client';
import type { RuntimeMessage } from '../lib/types';

export function useSimulationStream(experimentId?: string | null) {
  const [events, setEvents] = useState<RuntimeMessage[]>([]);
  const [currentTick, setCurrentTick] = useState<number>(0);
  const [status, setStatus] = useState<string>('DISCONNECTED');
  const [worldState, setWorldState] = useState<any>(null);
  const [liveInsights, setLiveInsights] = useState<any[]>([]);
  const wsClient = useRef<WebSocketClient | null>(null);

  useEffect(() => {
    if (!experimentId) return;

    const baseWsUrl = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8000';
    const url = `${baseWsUrl}/ws/experiments/${experimentId}/stream`;
    
    setStatus('CONNECTING');
    wsClient.current = new WebSocketClient(url);

    wsClient.current.connect((data: any) => {
      if (data.type === 'TICK') {
        setCurrentTick(data.payload?.tick ?? 0);
        if (data.payload?.state_summary) {
          setWorldState(data.payload.state_summary);
        }
      } else if (data.type === 'INTELLIGENCE_INSIGHT') {
        const insight = data.payload?.insight || data.insight;
        if (insight) {
          setLiveInsights((prev) => [insight, ...prev.slice(0, 9)]);
        }
      } else if (data.type === 'EVENT' || data.type === 'STAGE_CHANGE') {
        setEvents((prev) => [...prev.slice(-99), data]);
      } else if (data.type === 'STATUS_UPDATE') {
        setStatus(data.status || 'CONNECTED');
      } else if (data.type === 'CONNECTED') {
        setStatus('CONNECTED');
      }
    });

    return () => {
      if (wsClient.current) {
        wsClient.current.disconnect();
      }
    };
  }, [experimentId]);

  return { events, currentTick, status, worldState, liveInsights };
}