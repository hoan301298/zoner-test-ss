# Event-Sourced Alarm System

This project implements an event-sourced alarm management system using **NestJS**, **CQRS**, and **event sourcing** principles. Several test suites are intentionally failing, representing real bugs previously encountered in production.

The goal of this project is to reason about how events flow through **aggregates**, **command handlers**, **event handlers**, **sagas**, and **projections**, and to ensure the system behaves correctly across its event-driven workflow.

---

## Getting Started

### Install dependencies and Docker images/containers

```bash
make install
```

### Run all tests
```bash
make test
```

---

## Summary of Fixes

Several issues were identified across the alarms domain, sagas, aggregates, and storage layer. The key fixes include:

- Incorrect mocking in tests
Controller and service tests were using real dependencies instead of mocks, causing flaky and non-isolated test behavior.

- Saga not emitting cascading events correctly
The **cascading-alarms.saga.ts** logic missed triggering follow-up alarms under certain conditions due to incorrect event filtering and timing.

- Unacknowledged alarm saga emitted duplicate timeout events
Missing idempotency checks caused multiple timeout events for the same alarm.

- Aggregate state not fully rehydrated on replay
The **Alarm** aggregate didn’t apply all event types during replay, resulting in inconsistent state reconstruction.

- Event stream versioning errors
**mongo-event-store.ts** incorrectly incremented or compared stream versions, leading to concurrency issues and test failures.

- Event retrieval returning incomplete streams
The event store sometimes returned only partial event histories due to filtering logic, breaking projections and aggregate rebuilds.

- Wrong event version field **Nversion**
Replaced invalid **Nversion** with correct versioning in **docker-compose.yaml**.

### Changed files

- alarms.service.spec.ts (improved tests using proper mocking)
- alarms.controller.spec.ts (updated to use correct mocking patterns)
- cascading-alarms.saga.ts
- unacknowledged-alarms.saga.ts
- alarm.ts
- aggregate-root.ts
- mongo-event-store.ts
- docker-compose.yaml