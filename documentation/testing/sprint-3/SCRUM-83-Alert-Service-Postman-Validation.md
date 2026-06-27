# SCRUM-83 — Alert Service Postman Validation

## Story

Validate Alert Service APIs using Postman to verify alert creation, retrieval, resolution, gateway routing, and persistence before final dashboard integration.

---

# Objective

The objective of this validation was to confirm that the Alert Service behaves correctly under both normal and invalid request scenarios while operating within the complete EdgeCloud Monitor microservice architecture.

Testing was performed through the API Gateway to simulate the production request path.

---

# Environment

Platform

- Spring Boot Microservices
- Spring Cloud Gateway
- Netflix Eureka
- MySQL
- Docker Compose
- Postman

Services Running

- Discovery Service
- API Gateway
- Alert Service
- Monitoring Service
- Device Service
- Authentication Service

---

# API Endpoints Tested

| Method | Endpoint | Result |
|---------|----------|--------|
| POST | /api/v1/alerts | Passed |
| GET | /api/v1/alerts | Passed |
| PUT | /api/v1/alerts/{id}/resolve | Passed |
| POST | /api/v1/alerts/evaluate | Passed |

All requests were executed through the API Gateway.

---

# Validation Summary

## Alert Creation

A valid alert payload successfully created a new alert record.

Verified

- HTTP 201 response
- Alert persisted in MySQL
- Alert immediately visible through the retrieval endpoint

Status

PASS

---

## Active Alert Retrieval

Active alerts were successfully returned.

Verified

- HTTP 200 response
- Unresolved alerts returned
- Response structure validated

Status

PASS

---

## Alert Resolution

An existing alert was resolved successfully.

Verified

- HTTP success response
- Alert marked as resolved
- Resolution timestamp stored

Status

PASS

---

## Resolved Alert Filtering

After resolution, the alert no longer appeared within the active alerts endpoint.

Status

PASS

---

## Gateway Routing

Requests routed correctly through Spring Cloud Gateway.

Verified

Gateway

↓

Alert Service

↓

Database

↓

Response

Status

PASS

---

## Database Persistence

Verified that alert records were stored correctly inside the alert_db database.

Validated

- Alert creation
- Resolution status
- Persistence after updates

Status

PASS

---

## Docker Validation

Alert Service operated successfully within Docker Compose.

Verified

- Container startup
- Service registration
- Gateway communication

Status

PASS

---

## Eureka Registration

Alert Service successfully registered with Eureka Discovery Server.

Status

PASS

---

## Error Handling

Validation scenarios confirmed that invalid requests returned appropriate HTTP error responses without exposing internal implementation details.

Status

PASS

---

# Evidence Collected

The following evidence was collected during validation.

- Postman request screenshots
- API Gateway responses
- Docker Compose execution
- Eureka service registration
- Alert database records
- React dashboard integration screenshots

---

# Result

The Alert Service successfully satisfied all planned acceptance criteria.

The service is considered stable and ready for React dashboard integration and Sprint 3 demonstration activities.

