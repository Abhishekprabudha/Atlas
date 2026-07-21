# AIonOS × MAB Kargo — Project Atlas Interactive Demo

A static, GitHub Pages-ready application that blends the **Logistics/Cargo Management System (LMS/CMS)** with the **RoboOps Warehouse Management System (WMS)** and a simulated **WCS/PLC execution layer**.

The application is designed for the MAB Kargo bid-defense demonstration and contains every requirement and scenario from the supplied **Project Atlas – MABkargo Technical Requirement Script** workbook.

## What is included

- Live cargo mission-control dashboard with terminal map, KPIs and event stream.
- Five fully demonstrable Project Atlas scenarios:
  1. Cargo Outbound Process
  2. Cargo Inbound Process
  3. Reporting Preparation
  4. Maintenance Readiness
  5. System Integration Planning
- The seven cargo functions: Acceptance, Cargo Build-Up, ULD Storage, Outbound Ramp Retrieval, Inbound Ramp Check-In, Import Breakdown and Import Release.
- All seven required report types with dynamic tables, filters, scheduling and CSV export.
- Maintenance strategy, machine health, work planning, fault injection, recovery and the ≥98% availability calculation.
- LMS → WMS → WCS command simulation, message acknowledgements, exceptions, retry and replay.
- Searchable requirement traceability with the original workbook cells mirrored in the application.
- Presenter runbook and full-screen bid-defense mode.
- Synthetic JSON data that updates during scenario execution.
- Offline cache / PWA support after the first load.

## Deploy directly to GitHub Pages

1. Create a new GitHub repository.
2. Upload **all files and folders from this repository ZIP** to the repository root.
3. Open **Settings → Pages**.
4. Under **Build and deployment**, choose **Deploy from a branch**.
5. Select the `main` branch and `/ (root)`, then save.
6. Open the Pages URL after GitHub finishes deployment.

No build command or backend is required.

## Run locally

### Using Node.js

```bash
npm run dev
```

Open `http://localhost:4173`.

### Using Python

```bash
python3 -m http.server 4173
```

Open `http://localhost:4173`.

> Do not open `index.html` directly using `file://`; the browser will block local JSON loading. Use either GitHub Pages or an HTTP server.

## Recommended live demonstration sequence

1. **Cargo Mission Control** — establish the operating model and live terminal state.
2. **Atlas Demo Launcher** — run Scenario 1 Outbound at 2× speed.
3. Inject an exception during the ramp movement, then demonstrate controlled resolution.
4. Run Scenario 2 Inbound and highlight PRP and TTS cold-room routing.
5. Open **Reporting Center** and generate/export each required report family.
6. Open **Maintenance & SLA**, inject a TTV fault, recover it and explain the availability formula.
7. Open **Integration Monitor**, simulate an API failure and replay the message without duplication.
8. Open **Atlas Traceability** to show all workbook requirements and the evidence accumulated during the demo.
9. Close in **Presenter Runbook** / full-screen presenter mode.

## Data files

- `data/requirements.json` — normalized scenarios and requirements plus the complete workbook mirror.
- `data/atlas-workbook-raw.json` — raw cell values from all four workbook sheets.
- `data/scenarios.json` — executable demonstration steps for all five scenarios.
- `data/seed-data.json` — shipments, AWBs, ULDs, BINA/BOXA, machines, locations, events, reports and APIs.

## Architecture

The demo intentionally follows the operating statement used in the bid defense:

**LMS commands. WMS decides and confirms. WCS executes.**

The application is entirely front-end and uses synthetic data. It does not connect to production MAB Kargo systems.
