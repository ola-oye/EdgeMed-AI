"""
simulator.py
────────────
Simulates bedside monitoring devices by publishing realistic
vital sign readings to the MQTT broker.

This simulator does ONE thing — publish readings.
It does not register patients, enroll them, or assign devices.
That is the admin's job through the Admin Panel in the dashboard.

Before running this simulator:
  1. Log in as admin (admin@hospital.org / password123)
  2. Go to Admin Panel → Patient Registration
     Register and enroll each patient listed below
  3. Go to Admin Panel → Device Assignment
     Assign each device ID to the corresponding patient:

     SIM-OXI-001  →  patient-001  (James Okafor)
     SIM-OXI-002  →  patient-002  (Amaka Nwosu)
     SIM-OXI-003  →  patient-003  (Emeka Adeyemi)
     SIM-OXI-004  →  patient-004  (Fatima Bello)
     SIM-OXI-005  →  patient-005  (Chidi Eze)

Once assigned, start this simulator and readings will appear
on the dashboard immediately.

If a device has no assignment the backend discards the reading
and logs a warning — nothing breaks.

Usage:
  python simulator.py                   # run all 5 patients
  python simulator.py --patients 3      # only first 3 patients
  python simulator.py --interval 5      # reading every 5 seconds
  python simulator.py --demo            # patient-003 deteriorates

Requirements:
  pip install paho-mqtt
"""

import json
import time
import random
import argparse
import signal
import sys
import threading
from datetime import datetime

import paho.mqtt.client as mqtt

try:
    from config import MQTT_BROKER_HOST, MQTT_BROKER_PORT
except ImportError:
    MQTT_BROKER_HOST = 'localhost'
    MQTT_BROKER_PORT = 1883

MQTT_TOPIC_BASE  = 'vitals'   # publishes to vitals/{device_id}
READING_INTERVAL = 10          # seconds between readings per patient


# ─────────────────────────────────────────────
# PATIENT PROFILES
# These match the patients the admin should register.
# Only device_id and vitals matter for publishing —
# the rest is shown in the pre-run instructions above.
# ─────────────────────────────────────────────

PATIENT_PROFILES = [
    {
        'name':      'James Okafor',
        'device_id': 'SIM-OXI-001',
        'scenario':  'stable',
        'vitals': {
            'heart_rate':       78.0,
            'spo2':             98.0,
            'respiration_rate': 15.0,
            'body_temperature': 98.4
        }
    },
    {
        'name':      'Amaka Nwosu',
        'device_id': 'SIM-OXI-002',
        'scenario':  'mild_warning',
        'vitals': {
            'heart_rate':       92.0,
            'spo2':             96.0,
            'respiration_rate': 18.0,
            'body_temperature': 99.1
        }
    },
    {
        'name':      'Emeka Adeyemi',
        'device_id': 'SIM-OXI-003',
        'scenario':  'deteriorating',   # starts stable, worsens after 5 readings
        'vitals': {
            'heart_rate':       85.0,
            'spo2':             97.0,
            'respiration_rate': 16.0,
            'body_temperature': 98.8
        }
    },
    {
        'name':      'Fatima Bello',
        'device_id': 'SIM-OXI-004',
        'scenario':  'recovering',      # starts warning, improves to stable
        'vitals': {
            'heart_rate':       112.0,
            'spo2':             93.0,
            'respiration_rate': 22.0,
            'body_temperature': 100.8
        }
    },
    {
        'name':      'Chidi Eze',
        'device_id': 'SIM-OXI-005',
        'scenario':  'stable',
        'vitals': {
            'heart_rate':       72.0,
            'spo2':             99.0,
            'respiration_rate': 14.0,
            'body_temperature': 98.2
        }
    }
]


# ─────────────────────────────────────────────
# VITAL SIGN GENERATION
# ─────────────────────────────────────────────

NORMAL_RANGES = {
    'heart_rate':       (55,   105),
    'spo2':             (94,   100),
    'respiration_rate': (11,   22),
    'body_temperature': (97.5, 101.0)
}

FLUCTUATION = {
    'heart_rate':       2.0,
    'spo2':             0.5,
    'respiration_rate': 0.5,
    'body_temperature': 0.1
}

DETERIORATION_DRIFT = {
    'heart_rate':       +1.8,
    'spo2':             -0.6,
    'respiration_rate': +0.5,
    'body_temperature': +0.08
}

RECOVERY_DRIFT = {
    'heart_rate':       -1.5,
    'spo2':             +0.8,
    'respiration_rate': -0.6,
    'body_temperature': -0.12
}

RECOVERY_TARGET = {
    'heart_rate':       78.0,
    'spo2':             98.0,
    'respiration_rate': 15.0,
    'body_temperature': 98.6
}


def clamp(v, lo, hi):
    return max(lo, min(hi, v))


def fluctuate(vitals):
    return {
        k: round(clamp(
            v + random.uniform(-FLUCTUATION[k], FLUCTUATION[k]),
            NORMAL_RANGES[k][0] - 20,
            NORMAL_RANGES[k][1] + 30
        ), 1)
        for k, v in vitals.items()
    }


def deteriorate(vitals):
    result = {k: round(v + DETERIORATION_DRIFT[k], 1) for k, v in vitals.items()}
    result['heart_rate']       = clamp(result['heart_rate'],       40,  180)
    result['spo2']             = clamp(result['spo2'],             75,  100)
    result['respiration_rate'] = clamp(result['respiration_rate'], 6,   35)
    result['body_temperature'] = clamp(result['body_temperature'], 96,  106)
    return result


def recover(vitals):
    result = {}
    for k, v in vitals.items():
        target = RECOVERY_TARGET[k]
        drift  = RECOVERY_DRIFT[k]
        if abs(v - target) < abs(drift):
            result[k] = round(target, 1)
        elif (drift > 0 and v >= target) or (drift < 0 and v <= target):
            result[k] = round(target, 1)
        else:
            result[k] = round(v + drift, 1)
    return result


# ─────────────────────────────────────────────
# PATIENT SIMULATOR THREAD
# ─────────────────────────────────────────────

class PatientSimulator(threading.Thread):
    """
    Simulates one patient's monitoring device.
    Publishes under device_id only.
    Has no knowledge of patient records or the database.
    """

    def __init__(self, profile: dict, client: mqtt.Client):
        super().__init__(daemon=True, name=f"sim-{profile['device_id']}")
        self.profile       = profile
        self.client        = client
        self.device_id     = profile['device_id']
        self.scenario      = profile['scenario']
        self.vitals        = dict(profile['vitals'])
        self.reading_count = 0
        self.running       = True
        self.topic         = f'{MQTT_TOPIC_BASE}/{self.device_id}'

    def stop(self):
        self.running = False

    def _next_vitals(self) -> dict:
        if self.scenario == 'stable':
            self.vitals = fluctuate(self.vitals)

        elif self.scenario == 'mild_warning':
            self.vitals = fluctuate(self.vitals)
            if random.random() < 0.3:
                self.vitals['spo2'] = round(random.uniform(93.0, 95.5), 1)

        elif self.scenario == 'deteriorating':
            if self.reading_count < 5:
                self.vitals = fluctuate(self.vitals)
            else:
                self.vitals = fluctuate(deteriorate(self.vitals))

        elif self.scenario == 'recovering':
            self.vitals = fluctuate(recover(self.vitals))

        return self.vitals

    def _status_label(self, v: dict) -> str:
        if v['spo2'] < 92 or v['heart_rate'] > 130 or v['respiration_rate'] > 24:
            return '🔴 CRITICAL'
        if v['spo2'] < 95 or v['heart_rate'] > 105 or v['respiration_rate'] > 20 or v['body_temperature'] > 100.4:
            return '🟡 WARNING '
        return '🟢 STABLE  '

    def run(self):
        while self.running:
            try:
                vitals = self._next_vitals()

                payload = {
                    'device_id':        self.device_id,
                    'heart_rate':       vitals['heart_rate'],
                    'spo2':             vitals['spo2'],
                    'respiration_rate': vitals['respiration_rate'],
                    'body_temperature': vitals['body_temperature'],
                    'read_at':          datetime.utcnow().strftime('%Y-%m-%dT%H:%M:%S'),
                    '_simulated':       True
                }

                self.client.publish(self.topic, json.dumps(payload), qos=1)

                print(
                    f'  [{self.profile["name"]:<20}]  '
                    f'{self._status_label(vitals)}  '
                    f'HR:{vitals["heart_rate"]:>6.1f}  '
                    f'SpO2:{vitals["spo2"]:>5.1f}%  '
                    f'RR:{vitals["respiration_rate"]:>5.1f}  '
                    f'Temp:{vitals["body_temperature"]:>6.1f}°F  '
                    f'[{self.device_id}]'
                )

                self.reading_count += 1

            except Exception as e:
                print(f'[sim] Error publishing {self.device_id}: {e}')

            time.sleep(READING_INTERVAL)


# ─────────────────────────────────────────────
# MAIN
# ─────────────────────────────────────────────

def run_simulator(profiles: list):
    print(f'[sim] Connecting to {MQTT_BROKER_HOST}:{MQTT_BROKER_PORT}...')

    client = mqtt.Client(client_id='vitalwatch-simulator')
    client.reconnect_delay_set(min_delay=1, max_delay=10)

    try:
        client.connect(MQTT_BROKER_HOST, MQTT_BROKER_PORT, keepalive=60)
    except ConnectionRefusedError:
        print('[sim] Cannot connect to broker.')
        print('      sudo systemctl start mosquitto')
        sys.exit(1)

    client.loop_start()
    time.sleep(0.5)

    print(f'\n[sim] Publishing readings for {len(profiles)} patient(s) every {READING_INTERVAL}s')
    print(f'[sim] If a device has no assignment the backend will log a warning and skip it.')
    print(f'{"─" * 92}')
    print(f'  {"Patient":<22}  {"Status":<12}  {"HR":>6}  {"SpO2":>7}  {"RR":>6}  {"Temp":>8}  Device')
    print(f'{"─" * 92}')

    simulators = []
    for profile in profiles:
        sim = PatientSimulator(profile, client)
        time.sleep(0.2)
        sim.start()
        simulators.append(sim)

    def shutdown(sig, frame):
        print('\n\n[sim] Stopping...')
        for s in simulators:
            s.stop()
        client.loop_stop()
        client.disconnect()
        print('[sim] Done.')
        sys.exit(0)

    signal.signal(signal.SIGINT,  shutdown)
    signal.signal(signal.SIGTERM, shutdown)

    print('[sim] Running — press Ctrl+C to stop\n')
    while True:
        time.sleep(1)


# ─────────────────────────────────────────────
# ENTRY POINT
# ─────────────────────────────────────────────

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='VitalWatch device simulator')
    parser.add_argument('--patients', type=int, default=len(PATIENT_PROFILES),
                        help=f'Number of patients to simulate (1–{len(PATIENT_PROFILES)})')
    parser.add_argument('--interval', type=int, default=READING_INTERVAL,
                        help='Seconds between readings per patient (default 10)')
    parser.add_argument('--demo',     action='store_true',
                        help='Demo mode — patient-003 (SIM-OXI-003) deteriorates after 5 readings')
    args = parser.parse_args()

    READING_INTERVAL = args.interval
    count            = min(max(1, args.patients), len(PATIENT_PROFILES))
    profiles         = PATIENT_PROFILES[:count]

    print('=' * 60)
    print('  VitalWatch Device Simulator')
    print('=' * 60)
    print(f'  Patients : {count}')
    print(f'  Interval : {READING_INTERVAL}s per patient')
    print(f'  Broker   : {MQTT_BROKER_HOST}:{MQTT_BROKER_PORT}')
    print()
    print('  IMPORTANT: Before running this simulator, log in as admin')
    print('  and complete the following steps in the Admin Panel:')
    print()
    print('  1. Register and enroll each patient')
    print('  2. Assign devices:')
    for p in profiles:
        print(f'       {p["device_id"]}  →  {p["name"]}')
    print()

    run_simulator(profiles)
