# Docker Manager

> **Status: Planned** — This skill is queued for construction with skill-maker.

A skill for Docker container management: building images, managing compose
stacks, debugging containers, optimizing Dockerfiles, and running health checks.
Provides structured workflows for the full container lifecycle.

## When built, this skill will...

- Build and tag Docker images with multi-stage and cache-optimized Dockerfiles
- Manage Docker Compose stacks (up, down, logs, scaling)
- Debug running containers (exec, logs, inspect, resource usage)
- Optimize Dockerfiles for smaller image sizes and faster builds
- Run health checks and diagnose networking issues between containers
- Clean up dangling images, stopped containers, and unused volumes

## Tools & Dependencies

- `docker` — container runtime and image building
- `docker compose` — multi-container orchestration
- `dive` — image layer analysis and optimization

## Getting Started

To build this skill, run skill-maker:

```
Create a skill for Docker container management: building images, managing compose stacks, debugging containers, optimizing Dockerfiles, and health checks
```
