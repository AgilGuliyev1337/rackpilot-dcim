# Architecture notes

Deeper notes kept out of the README. See the README for the high-level diagram
and feature list.

## Layering and dependency direction

```
api (routers)  →  services  →  models
        │             │
        └──── schemas (Pydantic) ────┘
              core (config, db, security, deps)
```

Routers only translate HTTP ↔ Python and delegate to services. Services own all
business rules, validation that needs the database (uniqueness, rack overlap),
and every audit write. This keeps endpoints trivial and makes the rules unit-
testable without HTTP.

## Multi-tenancy

- `app/core/deps.py` exposes `get_current_user` (decodes the JWT, loads the user)
  and `get_current_org_id` (returns `current_user.organization_id`).
- Every service function takes an `org_id` (or the `User`) and filters queries by
  it. There is no code path that reads a domain row without the tenant filter.
- Cross-tenant access therefore returns 404 (the row is simply not in the tenant's
  result set), never 403 — we don't leak the existence of other tenants' objects.

## Audit trail

- `app/services/audit_service.py` serializes a model instance to a JSON-safe dict
  (`entity_to_dict`) and appends an `AuditLog` row.
- Mutating service methods capture `old = entity_to_dict(obj)` before applying
  changes and `new = entity_to_dict(obj)` after, then log within the same
  transaction as the mutation. The audit trail cannot drift from the data because
  they commit together.
- Bulk actions (CSV/XLSX import) log a single summarizing entry.

## Rack position model

- A device occupies `position_u .. position_u + height_u - 1`.
- The rack layout endpoint expands devices into per-U occupancy for rendering.
- Placement validation (service layer) checks (a) the device fits within the
  rack's `u_height` and (b) no overlap with existing devices, returning HTTP 409
  with a human-readable reason on conflict. The same logic guards drag-and-drop
  moves, the position picker, and CSV import.

## Spatial data (floor plan / 3D)

- `Rack` carries `pos_x`, `pos_y`, `width_units`, `depth_units`; `Room` carries
  `floor_width`, `floor_height` (grid units).
- The 2D floor plan and 3D room view read the same coordinates; the 3D view adds
  `u_height` as the box height. Repositioning persists via the rack update
  endpoint.

## Testing

- Tests run against a dedicated PostgreSQL database (`TEST_DATABASE_URL`), created
  and torn down per session, with tables truncated between tests for isolation —
  chosen over SQLite for parity with production (JSONB, enums, composite unique
  constraints).

## Production packaging

- `docker-compose.prod.yml` builds the frontend to static assets served by nginx,
  which also reverse-proxies `/api` and `/uploads` to the backend (gunicorn with
  uvicorn workers). A single host port is exposed. Secrets come only from
  `.env.production`.
