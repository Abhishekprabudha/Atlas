# AIonOS × MAB Kargo — Project Atlas Operations Platform

Project Atlas is an enterprise operations platform for the MAB Kargo terminal. It brings cargo workflows, warehouse execution, equipment health, integration monitoring, reporting and requirements traceability into one governed workspace.

## Capabilities

- Five operational workflows for outbound, inbound, reporting, maintenance and integration controls.
- Live cargo terminal map with workflow-aware events, exceptions and equipment status.
- WMS task orchestration, cargo worklists, inventory visibility and command processing.
- Scheduled reporting, maintenance planning, incident recovery and SLA monitoring.
- LMS → WMS → WCS message acknowledgement, retry and replay controls.
- Requirement-to-workflow traceability against the supplied Project Atlas workbook.
- Exportable operational data for audit and analysis.

## Run locally

```bash
npm start
```

Then open <http://localhost:4173>.

## Operational workflow sequence

1. Review terminal health and current exceptions in **Cargo Mission Control**.
2. Open **Atlas Workflow Center** and execute the outbound workflow.
3. Review inbound handling, including PRP and TTS cold-room routing.
4. Use **Reporting Center** to generate, schedule or export operational reports.
5. Review **Maintenance & SLA** for equipment health, recovery status and availability.
6. Monitor acknowledgement, retry and replay controls in **Integration Monitor**.
7. Use **Atlas Traceability** to review requirements and workflow evidence.

## Project structure

- `data/scenarios.json` — workflow steps for the five operational domains.
- `data/requirements.json` — normalized requirements and workbook mirror.
- `data/seed-data.json` — initial terminal records.
- `assets/js/app.js` — client-side application, workflows and interactions.
- `assets/css/app.css` — application styling.

## Deployment

The app is static and can be served with GitHub Pages, a CDN, or any web server. `server.js` is included for local use.
