# Demonstration Architecture

## System responsibilities

| Layer | Demonstrated responsibility |
|---|---|
| LMS / CMS | Booking/AWB context, shipment master, ULD/flight plan, customs/release status, transport commands and cargo milestones |
| RoboOps WMS | Command validation, task generation, storage-media state, exact location, build-up/breakdown, exception handling and reporting |
| WCS / PLC | Simulated ASRS, conveyor, TTV, UWS and ramp equipment execution |
| EMMS / Maintenance | Machine health, faults, work orders, maintenance planning, availability and SLA evidence |
| Control Tower | Cross-system dashboards, traceability, reporting and presenter evidence |

## Demo state model

All operational data is loaded from JSON at application start and cloned into browser memory. Scenario execution mutates:

- shipment status and location;
- WMS task state;
- media state and utilization;
- machine health and availability;
- KPIs and exception counts;
- integration messages and event stream;
- requirement evidence coverage.

A reset returns the demo to the supplied baseline JSON.
