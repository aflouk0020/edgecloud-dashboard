# SCRUM-99 — Service Uptime History and Reliability Visibility

## Overview

SCRUM-99 improves EdgeCloud Monitor observability by introducing historical service uptime tracking, downtime-event recording, availability calculations, and dashboard reliability indicators.

The implementation allows platform operators to inspect both the current health state and the historical operational reliability of each monitored backend service.

## Backend Implementation

The Monitoring Service now records downtime events when a service changes from an available state to `DOWN`.

The implemented transition rules are:

- `UP` to `DOWN` opens a downtime event
- `UNKNOWN` to `DOWN` opens a downtime event
- repeated `DOWN` checks do not create duplicate active events
- `DOWN` to `UP` closes the active downtime event
- completed downtime duration is stored in seconds

Historical availability calculations include:

- total health checks
- successful `UP` checks
- failed `DOWN` checks
- uptime percentage
- average response latency
- downtime-event count
- total downtime duration
- latest downtime occurrence
- latest recovery time
- current downtime state

## Monitoring APIs

The dashboard consumes the following API Gateway routes:

```text
GET /api/v1/monitoring/services
GET /api/v1/monitoring/services/{serviceId}/availability
GET /api/v1/monitoring/services/{serviceId}/downtime-history
The corresponding Monitoring Service endpoints are:
GET /services
GET /services/{serviceId}/availability
GET /services/{serviceId}/downtime-history
An unknown monitored-service identifier returns a structured HTTP 404 Not Found response.
Dashboard Implementation
The Service Health page was extended into a Service Health and Reliability view.
Each monitored service now displays:
current health-status badge
historical uptime percentage
visual uptime progress indicator
availability or active-downtime badge
total health-check count
UP and DOWN check distribution
average response latency
downtime-event count
total downtime duration
latest downtime timestamp
latest recovery timestamp
A platform-level Average Uptime summary card is calculated from services that contain recorded health-check history.
Loading, Empty and Error States
The dashboard handles the following operational states:
Initial loading
A platform loading state is displayed while monitored services are retrieved.
Reliability loading
Each service displays an independent reliability-loading indicator while its historical availability data is being calculated.
No monitored services
A clear empty state is displayed when no services are registered.
No reliability history
Services without recorded health checks remain visible and display a message explaining that reliability metrics will appear after monitoring samples are collected.
Monitoring API failure
A full error state and retry action are displayed when the monitored-services endpoint is unavailable.
Individual reliability API failure
A failed availability request does not hide the service or prevent other services from loading. The affected service displays a local error message and a Retry Reliability action.
Automated Validation
Monitoring Service
Tests run: 12
Failures: 0
Errors: 0
BUILD SUCCESS
The backend tests cover:
downtime transition creation
duplicate downtime prevention
downtime recovery and duration calculation
uptime and latency calculations
empty history behaviour
downtime history mapping
monitored-service not-found handling
React Dashboard
Test files: 5 passed
Tests: 20 passed
ESLint: passed
Vite production build: passed
The Services page tests cover:
populated historical reliability metrics
active downtime visibility
service filtering
empty reliability history
isolated reliability API failure
reliability retry behaviour
filtered empty states
complete monitored-services API failure
Runtime Evidence Checklist
The following screenshots will be collected during final integrated runtime validation:
Service Health and Reliability page
service with populated uptime history
active downtime indicator
no-history fallback
reliability API error fallback
successful recovery after retry
Monitoring Service API availability response
Monitoring Service downtime-history response
Outcome
SCRUM-99 establishes historical operational visibility for monitored services and improves the platform’s ability to demonstrate observability, availability analysis, downtime tracking, and production-style error resilience.
