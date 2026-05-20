# VitalWatch Frontend

React web application for the VitalWatch post-surgery patient monitoring system. Served from the Raspberry Pi 5 and accessed from any browser on the hospital network.

---

## What It Does

Displays real-time vital signs, AI risk assessments, and clinical alerts for nurses and doctors. Updates the moment a new reading arrives from the bedside device — no manual refresh needed.

---

## Screens

| Screen | Route | Who Sees It |
|---|---|---|
| Login | `/login` | Everyone |
| Ward Overview | `/ward` | Nurses, Doctors |
| Patient Detail | `/patient/:patientId` | Nurses, Doctors |
| Admin Panel | `/admin` | Administrators |
| Cancer Detection | `/cancer` | Radiologists, Oncologists (placeholder) |

### Ward Overview

Two-column layout. Left column shows all active patients sorted by severity — Critical always at the top. Right column shows the live alert feed. The ward status bar below the navbar turns red, amber, or green to reflect the most severe open alert across the entire ward.

### Patient Detail

Four zones stacked vertically:

1. **Breadcrumb + patient header** — name, metadata, surgery info, risk badge
2. **Vital tiles** — current values for all four vitals with trend arrows
3. **Charts + AI sidebar** — 2x2 continuous scrolling charts (bedside monitor style) beside the AI assessment panel, always visible without scrolling
4. **Context drawer** — collapsible, two tabs: patient info and alert history

---

## Tech Stack

| Tool | Purpose |
|---|---|
| React 18 | UI framework |
| Vite | Build tool and dev server |
| React Router | Client-side navigation |
| Chart.js + react-chartjs-2 | Vital sign trend charts |
| Web Audio API | Browser sound alerts (no audio files needed) |
| WebSocket API | Real-time push updates from the backend |

No CSS framework, no component library. All styles are plain CSS with custom properties.

---

## Folder Structure

```
src/
├── main.jsx                    Entry point
├── App.jsx                     Routes and layout wrappers
├── api/
│   └── client.js               All API calls in one place
├── hooks/
│   ├── useAuth.jsx             Login state and user role
│   ├── useTheme.jsx            Light/dark mode with localStorage
│   ├── useWardSocket.jsx       WebSocket + patient/alert state (shared context)
│   └── usePatientDetail.js     Single patient status and chart data
├── pages/
│   ├── LoginPage.jsx
│   ├── WardOverviewPage.jsx
│   ├── PatientDetailPage.jsx
│   └── AdminPage.jsx
├── components/
│   ├── layout/                 AppShell, Navbar, WardStatusBar, ConnectionBanner
│   ├── ward/                   PatientCard, PatientGrid, AlertCard, AlertFeed
│   └── detail/                 VitalTile, VitalChart, AISidebar, ContextDrawer
├── utils/
│   └── sound.js               Web Audio API sound generation
└── styles/
    └── main.css               Design tokens, reset, global styles
```

---

## Prerequisites

| Requirement | Notes |
|---|---|
| Node.js 18+ | nodejs.org — download LTS version |
| Backend running on port 8000 | Required for login and data |

---

## Development Setup

```bash
# Install dependencies (run once after cloning)
npm install

# Start dev server
npm run dev
```

Open `http://localhost:5173`. The Vite dev server proxies all `/api` calls to `http://localhost:8000` automatically.

If you get `vite: not found` — use `npx vite` or ensure you ran `npm install` first.

---

## Demo Accounts

| Email | Password | Role | Landing page |
|---|---|---|---|
| nurse@hospital.org | password123 | Nurse | Ward Overview |
| doctor@hospital.org | password123 | Doctor | Ward Overview |
| radiologist@hospital.org | password123 | Radiologist | Cancer Detection |
| admin@hospital.org | password123 | Admin | Admin Panel |

---

## Dark Mode

Click `◑` in the navbar top-right to switch to dark mode. Click `☀` to return to light. Preference persists in `localStorage`.

Every component uses `const C = useColors()` — a hook that returns the correct color palette for the current theme. No hardcoded hex values in components.

---

## Fonts

| Font | Role | Used for |
|---|---|---|
| Manrope | Headlines | Patient names, vital numbers, screen titles |
| Inter | Body | Descriptions, alerts, general UI, buttons |
| IBM Plex Sans | Labels | Section headings, units, timestamps, tags |

---

## Real-Time Updates

The app connects to `ws://host:8000/ws/ward`. The `WardSocketProvider` manages one connection for all monitoring routes. On every push from the server, fresh patient and alert data is fetched from the API.

On disconnect, automatic reconnection with exponential back-off (2s → 30s max). The connection banner appears during disconnection.

---

## Sound Alerts

Generated in the browser via Web Audio API — no audio files needed.

| Event | Sound |
|---|---|
| New Warning alert | Soft double beep |
| New Critical alert | Three rapid high beeps |
| All alerts resolved | Single low tone |

---

## Production Build

```bash
npm run build
```

Outputs to `dist/`. Copy contents into the backend's `frontend/` directory:

```bash
cp -r dist/* ../backend/frontend/
```

FastAPI serves these files directly. Node.js is only needed on the developer machine — not on the Pi.

---

## Registering a Patient (Admin Panel)

Log in as admin, go to the Admin Panel, and use the Patient Registration tab. The two-step process is:

1. Register the patient in the central registry (name, age, gender)
2. Enroll them in monitoring (bed number, surgery type)

Then assign a device to them on the Device Assignment tab.

---

## Troubleshooting

**Ward overview shows no patients**
No patients have been registered and enrolled. Use the Admin Panel or the simulator setup command.

**Login fails with network error**
The backend is not running. Start it and refresh.

**Charts show no data for 30 min or 60 min windows**
The backend only has readings older than 3 hours. Start the simulator and wait for readings to accumulate.

**Connection banner shows "Connection lost"**
WebSocket endpoint unreachable. Check the backend is running and inspect the browser console.
