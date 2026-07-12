# InfraVault — Stage 1 Instructions for Claude Code

Execute everything in this file. Work autonomously.

## Task 0 — Create CLAUDE.md

First, create a file named `CLAUDE.md` in the project root with exactly this content:

```markdown
# InfraVault DCIM
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
```

## Task 1 — Project skeleton

- `backend/` — layered FastAPI app (app/models, app/schemas, app/api, app/services, app/core)
- `docker-compose.yml` — postgres:16 + backend with hot reload (volume mount + uvicorn --reload)
- `backend/Dockerfile`, `.env.example`, `.gitignore` (Python + Node + IDE + .env)
- Run `git init` if the directory is not already a git repository.

## Task 2 — Models and migrations

SQLAlchemy models + Alembic migrations for:

- **Organization**: name, slug, created_at
- **User**: email (unique), hashed_password, full_name, role (admin/engineer/viewer),
  organization_id, is_active, created_at
- **DataCenter**: name, location, description, organization_id
- **Room**: name, floor, description, datacenter_id, organization_id
- **Rack**: name, u_height (default 42), room_id, organization_id, description
- **Device**: name, asset_tag, serial_number, vendor, model,
  device_type (server/switch/router/firewall/load_balancer/san/nas/ups/pdu),
  status (active/inactive/maintenance/decommissioned), owner, notes,
  cpu, ram, storage, ip_address, mac_address, operating_system,
  rack_id (nullable), position_u (nullable), height_u (default 1),
  warranty_expiry (nullable date), organization_id, created_at, updated_at
- **AuditLog**: user_id, user_email, action, entity_type, entity_id, entity_name,
  old_values (JSON), new_values (JSON), organization_id, timestamp

Constraints:
- Unique per organization: (organization_id, asset_tag), (organization_id, serial_number)
- Devices must not overlap in a rack: a device occupies position_u .. position_u + height_u - 1.
  Enforce this in the service layer with clear 409 errors, and validate position fits within rack u_height.

## Task 3 — Auth

- POST /api/auth/register — creates a new Organization + its first admin user
- POST /api/auth/login — returns access + refresh JWT
- POST /api/auth/refresh
- GET /api/auth/me
- Role-based dependencies: require_admin, require_engineer (admin or engineer), any authenticated user for reads.

## Task 4 — CRUD API (all tenant-scoped, all mutations audit-logged)

- /api/datacenters, /api/rooms, /api/racks, /api/devices — full CRUD
- GET /api/racks/{id}/layout — returns the full U-map of the rack:
  for each U from u_height down to 1: occupied or empty, device id/name/type if occupied
- Device list endpoint supports: search (name, serial, asset_tag, ip_address),
  filters (device_type, status, datacenter_id, rack_id), pagination.

## Task 5 — Dashboard endpoint

GET /api/dashboard — returns:
- total devices, counts by device_type group (servers / network / storage / power)
- rack utilization % (occupied U / total U across org)
- devices with warranty_expiry within the next 90 days
- 10 most recent audit log entries

## Task 6 — Seed data

`backend/seed.py` (idempotent) — demo org "Example Telecom":
- 2 datacenters: "Baku DC" (Baku, Azerbaijan), "Ganja DC" (Ganja, Azerbaijan)
- 4 rooms, 8 racks (RACK-01 … RACK-08)
- ~40 realistic devices: Dell PowerEdge R750/R650, HPE ProLiant DL380 Gen11,
  Lenovo ThinkSystem SR650, Cisco Catalyst/Nexus switches, FortiGate firewalls,
  F5 load balancer, NetApp/Synology storage, APC UPS + PDUs.
  Realistic serials, asset tags (AZT-XXXX), 10.x.x.x IPs, mixed statuses,
  a few with warranty_expiry within 90 days.
- 3 users: admin@example.com (admin), engineer@example.com (engineer),
  viewer@example.com (viewer) — password for all: Demo123!

## Task 7 — Tests

Pytest suite (use a separate test database or SQLite where feasible):
- register/login/refresh flow
- tenant isolation: org A user cannot read or modify org B objects
- rack position conflict returns 409
- viewer role gets 403 on mutations

## Final steps

1. `docker compose up -d`, apply migrations, run seed.py
2. Verify endpoints work (hit a few with curl), run pytest, fix any failures
3. Commit everything with conventional commits
4. Print a summary: what was built, how to test manually, demo credentials
