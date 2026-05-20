"""
core/websocket_manager.py
──────────────────────────
Manages all active WebSocket connections from browsers.
Broadcasts patient updates pushed by VitalsService.

One instance shared across the application (singleton at bottom).
Thread-safe for concurrent connections.
"""

import asyncio
import json
import logging
from fastapi import WebSocket, WebSocketDisconnect
from config  import WS_HEARTBEAT_SECONDS, WS_MAX_CONNECTIONS

logger = logging.getLogger(__name__)


class WebSocketManager:

    def __init__(self):
        self._connections: list[WebSocket] = []
        self._lock = asyncio.Lock()

    # ── CONNECTION LIFECYCLE ──────────────────────────────

    async def connect(self, ws: WebSocket):
        if len(self._connections) >= WS_MAX_CONNECTIONS:
            await ws.close(code=1008, reason='Max connections reached')
            return
        await ws.accept()
        async with self._lock:
            self._connections.append(ws)
        logger.info(f'[ws] Client connected — {len(self._connections)} active')

    async def disconnect(self, ws: WebSocket):
        async with self._lock:
            if ws in self._connections:
                self._connections.remove(ws)
        logger.info(f'[ws] Client disconnected — {len(self._connections)} active')

    # ── BROADCAST ─────────────────────────────────────────

    async def broadcast(self, message: dict):
        """
        Sends a message to all connected clients.
        Silently removes any client that has disconnected.
        """
        if not self._connections:
            return

        payload  = json.dumps(message)
        dead     = []

        for ws in list(self._connections):
            try:
                await ws.send_text(payload)
            except Exception:
                dead.append(ws)

        if dead:
            async with self._lock:
                for ws in dead:
                    if ws in self._connections:
                        self._connections.remove(ws)

    def broadcast_sync(self, message: dict):
        """
        Synchronous wrapper — called from the MQTT subscriber thread.
        Uses asyncio.run_coroutine_threadsafe to schedule on the event loop.
        """
        try:
            loop = asyncio.get_event_loop()
            if loop.is_running():
                asyncio.run_coroutine_threadsafe(
                    self.broadcast(message), loop
                )
        except RuntimeError:
            pass  # No event loop — server not yet started

    # ── HEARTBEAT ─────────────────────────────────────────

    async def heartbeat_loop(self):
        """
        Sends a ping to all clients every WS_HEARTBEAT_SECONDS.
        Keeps connections alive through proxies and firewalls.
        Run as a background task in main.py startup.
        """
        while True:
            await asyncio.sleep(WS_HEARTBEAT_SECONDS)
            if self._connections:
                await self.broadcast({'type': 'ping'})

    # ── STATUS ────────────────────────────────────────────

    @property
    def connection_count(self) -> int:
        return len(self._connections)


# Singleton — imported and used by routes and the MQTT subscriber
ws_manager = WebSocketManager()
