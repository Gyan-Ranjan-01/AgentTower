from __future__ import annotations
import asyncio
import json
import logging
from typing import Set, Dict, Any, AsyncGenerator

logger = logging.getLogger("agenttower.sse")


class SSEManager:
    def __init__(self) -> None:
        self.subscribers: Set[asyncio.Queue] = set()
        self._lock = asyncio.Lock()

    async def subscribe(self) -> asyncio.Queue:
        q: asyncio.Queue = asyncio.Queue(maxsize=500)
        async with self._lock:
            self.subscribers.add(q)
        logger.debug(f"Client connected to SSE. Total clients: {len(self.subscribers)}")
        return q

    async def unsubscribe(self, q: asyncio.Queue) -> None:
        async with self._lock:
            self.subscribers.discard(q)
        logger.debug(f"Client disconnected from SSE. Total clients: {len(self.subscribers)}")

    async def broadcast(self, event_type: str, data: Dict[str, Any]) -> None:
        if not self.subscribers:
            return
        payload = {
            "type": event_type,
            "data": data
        }
        async with self._lock:
            subscribers_snapshot = list(self.subscribers)

        for q in subscribers_snapshot:
            try:
                q.put_nowait(payload)
            except asyncio.QueueFull:
                logger.warning("Subscriber SSE queue full, dropping message")
            except Exception as e:
                logger.error(f"Error publishing to SSE queue: {e}")

    async def event_generator(self, q: asyncio.Queue) -> AsyncGenerator[str, None]:
        try:
            # Send initial connected notification
            yield f"event: connected\ndata: {json.dumps({'status': 'connected'})}\n\n"
            while True:
                try:
                    payload = await asyncio.wait_for(q.get(), timeout=15.0)
                    yield f"event: {payload['type']}\ndata: {json.dumps(payload['data'])}\n\n"
                except asyncio.TimeoutError:
                    # Keep-alive comment
                    yield ": ping\n\n"
        except asyncio.CancelledError:
            pass
        finally:
            await self.unsubscribe(q)


sse_manager = SSEManager()
