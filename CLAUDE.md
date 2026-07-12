# RackPilot DCIM
Enterprise Data Center Inventory Management SaaS — portfolio project.
Author: Agil Guliyev. Goal: production-quality code suitable for showing to employers.

## Stack
- Backend: FastAPI (Python 3.11+), SQLAlchemy 2.0, Alembic, Pydantic v2
- DB: PostgreSQL 16 (runs in Docker)
- Auth: JWT (access + refresh), passlib/bcrypt
- Frontend: React 18 + TypeScript + Vite + Tailwind CSS
- Dev environment: docker-compose (postgres + backend + frontend)

## Architecture rules
- Multi-tenant: every domain table has organization_id; all queries MUST filter by it.
  Tenant isolation enforced in a shared dependency, never ad hoc in endpoints.
- Hierarchy: Organization → DataCenter → Room → Rack (42U default) → Device.
- Roles: admin (full), engineer (CRUD on infra), viewer (read-only). Enforce via dependencies.
- Every create/update/delete writes an AuditLog row (user, action, entity, old/new values, timestamp).
- Layered structure: app/models, app/schemas, app/api (routers), app/services, app/core.
  No business logic in routers — routers call services.

## Conventions
- Type hints everywhere, Pydantic schemas for all request/response bodies.
- Alembic for all schema changes; never create tables outside migrations.
- Frontend: functional components + hooks. API client in src/api/.
- Realistic seed data (Azerbaijani telecom flavor: "Baku DC", "Ganja DC", Dell/HPE/Cisco gear).
- Commit after each completed feature with conventional commit messages (feat:, fix:, chore:).

## Commands
- Run stack: docker compose up -d
- Backend tests: cd backend && pytest
- Migrations: cd backend && alembic revision --autogenerate -m "..." && alembic upgrade head
