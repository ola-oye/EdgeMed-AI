# VitalWatch Backend

Post-surgery patient monitoring system — edge server running on Raspberry Pi 5 with Hailo-8 AI accelerator.

---

## What It Does

Receives real-time vital sign readings from bedside monitoring devices via MQTT, runs AI inference to assess patient risk, fires clinical alerts, and serves the results to the web dashboard over HTTP and WebSocket.

---

## Architecture

```
IoT Device (oximeter)
        │  MQTT publish  vitals/{device_id}
        ▼
Mosquitto Broker (port 1883)
        │
        ▼
mqtt_subscriber.py
  ├── Validates payload (Pydantic)
  ├── calls VitalsService.process_reading()
  └── broadcasts result via WebSocket

VitalsService
  ├── Resolves patient from device via DeviceRepository
  ├── Saves reading via ReadingRepository
  ├── Runs inference via InferenceEngine
  ├── Saves assessment via AssessmentRepository
  └── Fires alerts via AlertService

FastAPI (main.py)
  ├── HTTP routes  →  Services  →  Repositories  →  Database
  └── WebSocket /ws/ward  →  pushes to all connected browsers
```

The dependency rule — imports only flow downward:

```
main.py / mqtt_subscriber
        ↓
    routes/
        ↓
    services/
        ↓
    repositories/
        ↓
    core/database.py

models/   ← imported by all, imports nothing
config.py ← imported by all, imports nothing
```

---

## Folder Structure

```
backend/
├── config.py                   All constants (MQTT host, DB paths, thresholds)
├── main.py                     FastAPI app, startup, route registration
├── mqtt_subscriber.py          MQTT receiver — validates and dispatches only
│
├── models/
│   ├── reading.py              ReadingPayload (device input), ReadingRecord
│   ├── patient.py              PatientRegistration, EnrollmentRequest, etc.
│   ├── assessment.py           RiskAssessmentResult, RiskAssessmentRecord
│   ├── alert.py                AlertRecord, AcknowledgeRequest, etc.
│   ├── device.py               DeviceAssignment, AssignDeviceRequest, etc.
│   └── auth.py                 LoginRequest, UserRecord, SessionRecord
│
├── repositories/
│   ├── patient_repo.py         SQL for patients and monitoring enrollments
│   ├── reading_repo.py         SQL for vital sign readings
│   ├── assessment_repo.py      SQL for AI risk assessments
│   ├── alert_repo.py           SQL for alerts and acknowledgements
│   ├── device_repo.py          SQL for devices and patient assignments
│   └── user_repo.py            SQL for staff users and sessions
│
├── services/
│   ├── vitals_service.py       Core pipeline — device → patient → inference → alert
│   ├── alert_service.py        Alert rules, suppression, acknowledgement actions
│   ├── patient_service.py      Registration, enrollment, ward overview queries
│   ├── device_service.py       Device-to-patient assignment management
│   └── auth_service.py         Login, logout, session validation, user creation
│
├── core/
│   ├── database.py             Connection factories, schema creation, init_db()
│   ├── inference.py            AI model loading and prediction (InferenceEngine)
│   ├── security.py             Password hashing (bcrypt), session token generation
│   └── websocket_manager.py    WebSocket connection pool and broadcast
│
└── frontend/                   Built React app served as static files (production)
```

---

## Prerequisites

| Requirement | Version | Notes |
|---|---|---|
| Python | 3.11+ | |
| pip packages | see below | |
| Mosquitto | any | MQTT broker |
| AI model files | — | rf_model.pkl, scaler.pkl, feature_cols.pkl |

### Python packages

```bash
pip install fastapi uvicorn paho-mqtt pydantic bcrypt \
            scikit-learn xgboost imbalanced-learn \
            joblib pandas numpy
```

---

## Setup

### 1. Install dependencies

```bash
cd backend
pip install -r requirements.txt
```

### 2. Start Mosquitto

```bash
sudo systemctl start mosquitto

# Enable on boot (recommended for Pi deployment)
sudo systemctl enable mosquitto
```

### 3. Place AI model files

The following files must be in the backend directory before starting:

```
rf_model.pkl
scaler.pkl
feature_cols.pkl
```

Train them by running the training script:

```bash
python train_risk_model_4vitals.py
```

### 4. Start the server

```bash
uvicorn main:app --host 0.0.0.0 --port 8000
```

On startup the server:
- Initialises both databases (`users.db`, `monitoring.db`)
- Loads the AI model
- Starts the MQTT subscriber in a background thread
- Starts the WebSocket heartbeat

That is the only command needed. Everything runs from one process.

---

## Configuration

All settings are in `config.py`. The most important ones:

| Setting | Default | Description |
|---|---|---|
| `MQTT_BROKER_HOST` | `localhost` | Mosquitto host |
| `MQTT_BROKER_PORT` | `1883` | Mosquitto port |
| `DB_MONITORING` | `monitoring.db` | Monitoring database file |
| `DB_USERS` | `users.db` | Users and patients database file |
| `SUPPRESSION_MINUTES` | `{warning:30, critical:15}` | Alert suppression windows |
| `CORS_ORIGINS` | `http://localhost:5173` | Allowed frontend origins |

All settings can also be overridden via environment variables with the same name.

---

## Databases

Two SQLite files. Do not share them between systems.

### `users.db`

| Table | Contents |
|---|---|
| `patients` | Central patient registry — identity only (name, age, gender) |
| `users` | Staff accounts with hashed passwords |
| `sessions` | Active login sessions |

### `monitoring.db`

| Table | Contents |
|---|---|
| `monitoring_enrollments` | Ward-specific patient info (bed, surgery, nurse) |
| `devices` | Known monitoring hardware devices |
| `device_assignments` | Which device is assigned to which patient |
| `readings` | All vital sign readings received from devices |
| `risk_assessments` | All AI inference outputs |
| `alerts` | All alerts that have fired |
| `alert_acknowledgements` | Audit trail of nurse actions on alerts |

---

## API Reference

All endpoints require a valid session cookie obtained via `POST /api/auth/login`.

### Authentication

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/auth/login` | Login — returns session cookie |
| GET | `/api/auth/me` | Returns current user from session |
| POST | `/api/auth/logout` | Clears session cookie |
| POST | `/api/auth/users` | Create staff account (admin only) |

### Patients

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/patients` | Register patient in central registry |
| POST | `/api/monitoring/enroll` | Enroll registered patient in monitoring |
| GET | `/api/patients` | Ward overview — all active patients with latest status |
| GET | `/api/patients/{id}/status` | Full status for one patient |
| GET | `/api/patients/{id}/readings?minutes=180` | Reading history for trend charts |

### Alerts

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/alerts/count` | Unacknowledged count and ward status |
| GET | `/api/alerts` | Alert feed (supports ?status, ?severity, ?patient_id filters) |
| GET | `/api/alerts/patient/{id}` | Alert history for one patient |
| POST | `/api/alerts/{id}/acknowledge` | Nurse acknowledges an alert |
| POST | `/api/alerts/{id}/escalate` | Nurse escalates to physician |
| POST | `/api/alerts/{id}/resolve` | Manually resolve an alert |

### Devices

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/devices` | All devices with current assignment status |
| POST | `/api/devices/assign` | Assign device to patient |
| POST | `/api/devices/unassign` | Remove device assignment |

### WebSocket

| Path | Description |
|---|---|
| `ws://host:8000/ws/ward` | Real-time patient updates pushed on every new reading |

Message types received from server:

```json
{ "type": "patient_update", "patient_id": "...", "risk_level": "warning", ... }
{ "type": "ping" }
```

Message types sent to server:

```json
{ "type": "pong" }
```

---

## Device Integration

Devices do **not** send a `patient_id`. They send their own hardware ID. The backend resolves which patient a reading belongs to via the device assignment table.

### MQTT message format

Topic: `vitals/{device_id}`

```json
{
  "device_id":        "OXI-3A:F2:C1",
  "heart_rate":       88.0,
  "spo2":             97.2,
  "respiration_rate": 16.0,
  "body_temperature": 98.6,
  "read_at":          "2024-11-15T14:32:00"
}
```

`read_at` is optional — defaults to server time if omitted.

Validation bounds (readings outside these are rejected):

| Vital | Min | Max |
|---|---|---|
| Heart Rate | 20 bpm | 300 bpm |
| SpO₂ | 50 % | 100 % |
| Respiration Rate | 1 brpm | 60 brpm |
| Body Temperature | 90 °F | 110 °F |

### Patient workflow

1. Admin registers patient via `POST /api/patients`
2. Admin enrolls patient in monitoring via `POST /api/monitoring/enroll`
3. Admin assigns device to patient via `POST /api/devices/assign`
4. Device starts publishing readings — they are automatically linked to the correct patient
5. On discharge, unassign the device via `POST /api/devices/unassign`

---

## Alert System

Four rules run on every incoming reading:

1. **Stable** — auto-resolves all open alerts for the patient
2. **Warning or Critical** — fires an alert unless the suppression window is active
3. **Worsening** — if the patient moves from Warning to Critical, fires immediately regardless of suppression
4. **Suppression** — after an alert fires, the same severity is suppressed for 30 minutes (Warning) or 15 minutes (Critical) to prevent flooding

Alert lifecycle:

```
unacknowledged → acknowledged → escalated → resolved
```

All state transitions and who made them are recorded in `alert_acknowledgements`.

---

## AI Model

Four vitals as input. Three-class output: Stable, Warning, Critical.

23 features engineered per reading:
- 4 raw vital values
- 4 rolling means (last 3 readings)
- 4 delta values (change from previous reading)
- 4 rolling standard deviations (last 5 readings)
- 4 deviation from normal midpoint values
- 3 interaction features (SpO₂×RR, HR×Temp, SpO₂/RR)

Random Forest was selected over XGBoost based on Critical Recall (77% vs 67.8%). Missing a critical patient is more dangerous than a false alarm.

SMOTE applied during training to address class imbalance (Critical = 1.7% of dataset).

---

## Running the Simulator

For testing without a physical device:

```bash
python simulator.py --interval 10
```

The simulator registers five demo patients and publishes realistic vitals via MQTT. One patient follows a deteriorating scenario that triggers a Critical alert during a demo.

Before running, create device assignments for the simulator patients:

```bash
python simulator.py --setup-only
```

---

## Production Deployment on Raspberry Pi 5

```bash
# Give Pi a static IP (edit /etc/dhcpcd.conf)
# Enable Mosquitto on boot
sudo systemctl enable mosquitto

# Start the server
uvicorn main:app --host 0.0.0.0 --port 8000 --workers 1

# Copy built frontend into backend/frontend/
# (see frontend README for build instructions)
```

For a clean URL without a port number, place Nginx in front:

```nginx
server {
    listen 80;
    location /api/  { proxy_pass http://localhost:8000; }
    location /ws/   { proxy_pass http://localhost:8000; proxy_http_version 1.1; proxy_set_header Upgrade $http_upgrade; proxy_set_header Connection "upgrade"; }
    location /      { proxy_pass http://localhost:8000; }
}
```
