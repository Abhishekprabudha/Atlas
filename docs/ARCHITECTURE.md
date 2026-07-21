# Operations Platform Architecture

| Layer | Operational responsibility |
| --- | --- |
| LMS / CMS | Cargo master, milestones and terminal commands |
| RoboOps WMS | Task orchestration, location control, exceptions and status confirmation |
| WCS / PLC | Physical execution across ASRS, conveyors, TTV and UWS |
| Control Tower | Cross-system dashboards, traceability, reporting and operational evidence |

## Operational state model

The browser application maintains a coherent client-side terminal state derived from `data/seed-data.json`. Workflow execution updates cargo, task, event, equipment and integration-message records together, enabling each view to present the same operational position.

## Requirements traceability

`data/requirements.json` preserves the source workbook and adds a normalized requirement collection. Each requirement is mapped to one or more workflows and application modules.

## Data reset

A reset restores the supplied approved baseline JSON. In a deployed environment, this action should be restricted to authorized operational roles and backed by an auditable service endpoint.
