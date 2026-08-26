import asyncio
from typing import Dict, List, Any

class EventBus:
    """In-process pub/sub for broadcasting simulation events to WebSocket clients."""
    
    def __init__(self):
        self._subscribers: Dict[str, List[asyncio.Queue]] = {}
    
    async def subscribe(self, experiment_id: str) -> asyncio.Queue:
        queue = asyncio.Queue(maxsize=2000)
        self._subscribers.setdefault(experiment_id, []).append(queue)
        return queue
    
    async def unsubscribe(self, experiment_id: str, queue: asyncio.Queue) -> None:
        if experiment_id in self._subscribers:
            self._subscribers[experiment_id] = [
                q for q in self._subscribers[experiment_id] if q is not queue
            ]
            if not self._subscribers[experiment_id]:
                del self._subscribers[experiment_id]
    
    async def publish(self, experiment_id: str, event_type: str, payload: Dict[str, Any]) -> None:
        msg = {"type": event_type, "experiment_id": experiment_id, "payload": payload}
        for q in self._subscribers.get(experiment_id, []):
            try:
                q.put_nowait(msg)
            except asyncio.QueueFull:
                pass  # Drop on overflow; production would log
