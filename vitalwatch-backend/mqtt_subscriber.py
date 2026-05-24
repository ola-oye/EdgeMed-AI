"""
mqtt_subscriber.py
───────────────────
MQTT message receiver.
Receives raw device messages, validates them via Pydantic,
passes to VitalsService, broadcasts result via WebSocket.

This file has one job: receive and dispatch.
No business logic, no SQL, no inference.
"""

import json
import logging
import paho.mqtt.client as mqtt

from config            import (
    MQTT_BROKER_HOST, MQTT_BROKER_PORT,
    MQTT_TOPIC, MQTT_CLIENT_ID, MQTT_KEEPALIVE
)
from models            import ReadingPayload
from services          import VitalsService, UnassignedDeviceError
from core.websocket_manager import ws_manager
from pydantic          import ValidationError

logger      = logging.getLogger(__name__)
_vitals_svc = VitalsService()


# ── MQTT CALLBACKS ────────────────────────────────────────

def on_connect(client, userdata, flags, rc):
    if rc == 0:
        client.subscribe(MQTT_TOPIC)
        logger.info(f'[mqtt] Connected — subscribed to {MQTT_TOPIC}')
    else:
        logger.error(f'[mqtt] Connection failed — code {rc}')


def on_disconnect(client, userdata, rc):
    if rc != 0:
        logger.warning(f'[mqtt] Unexpected disconnect — code {rc}. Will reconnect.')


def on_message(client, userdata, message):
    topic   = message.topic
    raw     = message.payload.decode('utf-8', errors='replace')

    try:
        data = json.loads(raw)
    except json.JSONDecodeError as e:
        logger.warning(f'[mqtt] Invalid JSON on {topic}: {e}')
        return

    # Validate payload shape and vital sign bounds via Pydantic
    try:
        payload = ReadingPayload(**data)
    except ValidationError as e:
        errors = '; '.join(
            f"{'.'.join(str(l) for l in err['loc'])}: {err['msg']}"
            for err in e.errors()
        )
        logger.warning(f'[mqtt] Validation failed for {topic}: {errors}')
        return
    
    print(payload)

#    Run the pipeline
    try:
        result = _vitals_svc.process_reading(payload      = payload)
        logger.info(
            f'[pipeline] device={payload.device_id} '
            f'patient={result.patient_id} '
            f'risk={result.risk_level.upper()} '
            f'confidence={result.confidence_score:.1f}%'
        )
        # Push update to all connected browsers
        ws_manager.broadcast_sync(result.to_dict())

    except UnassignedDeviceError as e:
        logger.warning(f'[pipeline] {e}')

    except Exception as e:
        logger.error(f'[pipeline] ERROR for device {payload.device_id}: {e}', exc_info=True)


# ── START ─────────────────────────────────────────────────

def run_subscriber():
    """
    Starts the MQTT client and blocks forever.
    Called by main.py in a background thread at startup.
    Can also be run directly for testing: python mqtt_subscriber.py
    """
    client = mqtt.Client(client_id=MQTT_CLIENT_ID)
    client.on_connect    = on_connect
    client.on_disconnect = on_disconnect
    client.on_message    = on_message
    client.reconnect_delay_set(min_delay=2, max_delay=30)

    try:
        client.connect(MQTT_BROKER_HOST, MQTT_BROKER_PORT, MQTT_KEEPALIVE)
    except ConnectionRefusedError:
        logger.error(
            f'[mqtt] Cannot connect to broker at {MQTT_BROKER_HOST}:{MQTT_BROKER_PORT}. '
            f'Is Mosquitto running?  →  sudo systemctl start mosquitto'
        )
        return

    client.loop_forever()


if __name__ == '__main__':
    import signal, sys
    logging.basicConfig(level=logging.INFO, format='%(message)s')

    def _shutdown(sig, frame):
        logger.info('[mqtt] Shutting down')
        sys.exit(0)

    signal.signal(signal.SIGINT,  _shutdown)
    signal.signal(signal.SIGTERM, _shutdown)
    run_subscriber()
