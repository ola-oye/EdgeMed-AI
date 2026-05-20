"""
main.py
────────
FastAPI application entry point.

Responsibilities:
  - Create the app instance
  - Register all route routers
  - Start the MQTT subscriber as a background thread
  - Start the WebSocket heartbeat as a background task
  - Serve the React frontend as static files
  - Expose the /ws WebSocket endpoint

Nothing else. No business logic, no SQL, no inference here.
"""

import threading
import logging
import asyncio
from contextlib import asynccontextmanager

from fastapi                 import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles     import StaticFiles
from fastapi.responses       import FileResponse
import os

from config                  import CORS_ORIGINS, SERVER_HOST, SERVER_PORT
from core.database           import init_db
from core.inference          import inference_engine
from core.websocket_manager  import ws_manager
from routes                  import auth_router, patient_router, alert_router, device_router

logging.basicConfig(
    level  = logging.INFO,
    format = '%(asctime)s %(message)s',
    datefmt= '%H:%M:%S'
)
logger = logging.getLogger(__name__)


# ── LIFESPAN ──────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Runs on startup and shutdown."""

    # Startup
    init_db()
    logger.info('[app] Database initialised')

    inference_engine.load()
    logger.info('[app] AI model loaded')

    # MQTT subscriber in a background daemon thread
    thread = threading.Thread(
        target = _start_mqtt,
        daemon = True,
        name   = 'mqtt-subscriber'
    )
    thread.start()
    logger.info('[app] MQTT subscriber started')

    # WebSocket heartbeat as async background task
    heartbeat_task = asyncio.create_task(ws_manager.heartbeat_loop())
    logger.info('[app] WebSocket heartbeat started')

    logger.info(f'[app] VitalWatch running on http://{SERVER_HOST}:{SERVER_PORT}')

    yield  # Application runs here

    # Shutdown
    heartbeat_task.cancel()
    logger.info('[app] Shutdown complete')


def _start_mqtt():
    """Wrapper for the MQTT subscriber — runs in its own thread."""
    try:
        from mqtt_subscriber import run_subscriber
        run_subscriber()
    except Exception as e:
        logger.error(f'[mqtt] Subscriber error: {e}', exc_info=True)


# ── APP ───────────────────────────────────────────────────

app = FastAPI(
    title       = 'VitalWatch API',
    description = 'Post-surgery patient monitoring system',
    version     = '2.0.0',
    lifespan    = lifespan
)

# CORS — allow the React dev server and same-origin production
app.add_middleware(
    CORSMiddleware,
    allow_origins     = CORS_ORIGINS,
    allow_credentials = True,
    allow_methods     = ['*'],
    allow_headers     = ['*']
)


# ── ROUTES ────────────────────────────────────────────────

app.include_router(auth_router)
app.include_router(patient_router)
app.include_router(alert_router)
app.include_router(device_router)


# ── WEBSOCKET ENDPOINT ────────────────────────────────────

@app.websocket('/ws/ward')
async def ward_websocket(ws: WebSocket):
    """
    Persistent WebSocket connection for the ward dashboard.
    The browser connects once. The server pushes updates as they arrive.

    Message types sent to client:
      { type: 'patient_update', patient_id, risk_level, ... }
      { type: 'ping' }                 — keepalive heartbeat

    Message types received from client:
      { type: 'pong' }                 — heartbeat acknowledgement
    """
    await ws_manager.connect(ws)
    try:
        while True:
            # Keep the connection alive, handle client pongs
            data = await ws.receive_text()
    except WebSocketDisconnect:
        pass
    finally:
        await ws_manager.disconnect(ws)


# ── HEALTH CHECK ─────────────────────────────────────────

@app.get('/api/health')
def health():
    return {
        'status':      'ok',
        'ws_clients':  ws_manager.connection_count
    }


# ── STATIC FILE SERVING (production) ─────────────────────
# Serves the built React frontend.
# In development, Vite dev server handles the frontend.

_frontend_dir = os.path.join(os.path.dirname(__file__), 'frontend')

if os.path.isdir(_frontend_dir):
    app.mount('/assets', StaticFiles(directory=f'{_frontend_dir}/assets'), name='assets')

    @app.get('/{full_path:path}')
    def serve_frontend(full_path: str):
        """Catch-all — serves index.html for all non-API routes (React Router)."""
        return FileResponse(f'{_frontend_dir}/index.html')


# ── ENTRY POINT ───────────────────────────────────────────

if __name__ == '__main__':
    import uvicorn
    uvicorn.run(
        'main:app',
        host    = SERVER_HOST,
        port    = SERVER_PORT,
        reload  = False
    )
