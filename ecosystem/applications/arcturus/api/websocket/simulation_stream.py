from __future__ import annotations

import asyncio
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from ecosystem.applications.arcturus.api.services.event_bus import EventBus

router = APIRouter(tags=["Simulation Stream"])


@router.websocket("/ws/experiments/{experiment_id}/stream")
async def simulation_stream(websocket: WebSocket, experiment_id: str):
    """
    Persistent WebSocket connection for a single experiment.

    Message flow:
      SERVER → CLIENT: STAGE_CHANGE | TICK | EVENT | STATUS_UPDATE | ERROR
      CLIENT → SERVER: PAUSE | RESUME | CHECKPOINT (future control messages)

    Architecture decision: We pull the EventBus from app.state (registered
    during lifespan) rather than importing a module-level singleton.
    This keeps the handler stateless and fully testable.
    """
    # Grab the shared EventBus from app state
    bus: EventBus = websocket.app.state.event_bus

    await websocket.accept()
    queue: asyncio.Queue = await bus.subscribe(experiment_id)

    try:
        # Send a connection-confirmed handshake immediately
        await websocket.send_json({
            "type": "CONNECTED",
            "experiment_id": experiment_id,
            "message": "Simulation stream connected.",
        })

        # Fan-out loop: forward every event the bus puts on this queue
        while True:
            try:
                # Wait up to 30s for a message; send a heartbeat if nothing arrives
                # so the connection doesn't drop behind proxies/load balancers
                msg = await asyncio.wait_for(queue.get(), timeout=30.0)
                await websocket.send_json(msg)
            except asyncio.TimeoutError:
                # Heartbeat — keeps connection alive through Nginx / Cloudflare
                await websocket.send_json({"type": "HEARTBEAT", "experiment_id": experiment_id})

    except WebSocketDisconnect:
        # Client closed the tab or navigated away — clean up subscription
        pass
    finally:
        await bus.unsubscribe(experiment_id, queue)
