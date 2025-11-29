# Event-Sourced Alarm System

This project implements an event-sourced alarm management system using **NestJS**, **CQRS**, and **event sourcing** principles. Several test suites are intentionally failing, representing real bugs previously encountered in production.

The goal of this project is to reason about how events flow through **aggregates**, **command handlers**, **event handlers**, **sagas**, and **projections**, and to ensure the system behaves correctly across its event-driven workflow.

---

## Objectives

- Trace command -> event -> state -> projection flows  
- Diagnose bugs related to event sourcing, CQRS, or stream processing  
- Maintain existing production behavior (timeouts, event handlers, ordering) 
- Preserve production behavior such as:
  - timeouts  
  - event handlers  
  - stream buffering logic  
  - event ordering 

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