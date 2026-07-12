# RackPilot DCIM — Combined Final Stage (Stage 5 + Stage 6)
# Production packaging → Rename → Visual features → Final handoff zip

Read CLAUDE.md first. Stages 1-4 are complete and tagged v0.4-stage4.
Execute everything below IN ORDER. Work autonomously. Commit and tag after
each numbered task so we always have a safe rollback point.

================================================================
STAGE 5 — Production packaging, CI, and professional polish
================================================================

# Task 1 — Production deployment setup

- docker-compose.prod.yml: postgres (with named volume), backend (gunicorn/uvicorn
  workers, no reload), frontend built and served via nginx (multi-stage Dockerfile),
  nginx reverse-proxying /api to backend. Single entry port.
- .env.production.example with all required vars and safe placeholder values
- JWT secret, DB password etc. come only from env — no secrets in the repo
- A short Makefile (or justfile): make dev, make prod, make seed, make test, make backup

# Task 2 — CI pipeline

- .github/workflows/ci.yml:
  - backend job: install deps, run pytest against a postgres service container
  - frontend job: npm ci, tsc --noEmit, production build
  - Trigger on push and pull_request to main

# Task 3 — Seed polish for demo value

- Ensure seed data tells a good demo story: some racks nearly full, some half empty,
  a couple of devices in maintenance/decommissioned, several warranty alerts,
  a few audit entries generated (seed performs a couple of updates so the audit
  log and dashboard activity feed are not empty on first login)

# Task 4 — Professional README.md

Write a README that sells the project to a technical recruiter/engineer.
Use the product name "RackPilot DCIM" throughout (see the rename task below —
write the README with this name directly, no need to rename it twice). Structure:

1. Title + one-line pitch + badges (CI, Python, TypeScript, PostgreSQL, Docker)
2. Screenshots section — placeholder image links: docs/screenshots/dashboard.png,
   rack-view.png, floorplan.png, 3d-view.png, assets.png, audit.png (create the
   docs/screenshots/ dir with a .gitkeep; real screenshots added manually later)
3. Features — grouped: Multi-tenant & RBAC / Infrastructure hierarchy /
   Interactive rack elevation / 2D floor plan & 3D view / Asset inventory /
   Import-Export / Audit trail / Dashboard & Reports
4. Architecture — an ASCII or mermaid diagram: React SPA → nginx → FastAPI →
   PostgreSQL; layered backend explanation, multi-tenancy approach, audit design
5. Tech stack table
6. Quick start — clone, cp .env.example, docker compose up, seed, demo credentials
   (admin@example.com / Demo123! etc.), URLs (app :3000, API docs :8000/docs)
7. Running tests
8. API overview — a short table of main endpoint groups
9. Project structure tree (top 2 levels)
10. Roadmap — honest future items: AD/LDAP integration, VMware vCenter linkage,
    network/cabling topology diagrams, per-rack power (kW) capacity planning,
    QR-code asset lookup, email notifications, multi-language UI (AZ/EN/TR),
    Prometheus/Grafana export, SNMP/IPMI discovery, Kubernetes deployment
11. Author section: Agil Guliyev — Linux System Administrator & Infrastructure
    Engineer; note the project is inspired by real-world DCIM workflows
    (NetBox, vCenter operations at a telecom operator). Link placeholders for
    GitHub and LinkedIn.

Keep the tone factual and technical, not salesy. No emojis in headings.

# Task 5 — Repo hygiene

- LICENSE file (MIT, Agil Guliyev, 2026)
- .env files ignored; verify no secrets, tokens or passwords anywhere in git
  history (search tracked files; fix any real credential outside seed demo creds)
- Add a short docs/architecture.md if any deeper notes are worth keeping out
  of the README
- Move STAGE*.md task files from the repo root to docs/build-log/ instead of
  deleting them — they are interesting evidence of the AI-assisted build process
- Ensure git log is clean

# Task 6 — Verify and tag

1. docker compose -f docker-compose.prod.yml up --build works end to end;
   dev compose still works too
2. All tests green, tsc clean
3. Commit everything, tag v1.0.0

================================================================
STAGE 6 — Rename to "RackPilot DCIM" + visual/spatial features
================================================================

# Task 7 — Rename the project to RackPilot DCIM

Rename from "InfraVault" / "InfraVault DCIM" to "RackPilot DCIM" everywhere it
appears as a display name or title, including but not limited to:
- CLAUDE.md title and references
- README.md title, badges alt text, all prose mentions (should already be correct
  from Task 4, but double check)
- frontend: page <title>, header/logo text component, package.json "name"
  (slug "rackpilot-dcim-frontend"), favicon/browser tab title = "RackPilot DCIM"
- backend: FastAPI(title="RackPilot DCIM"), OpenAPI docs title,
  package.json/pyproject name fields (slug "rackpilot-dcim-backend")
- docker-compose.yml (both dev and prod) service/container/network names:
  rename from infravault-* to rackpilot-* (e.g. rackpilot-backend,
  rackpilot-frontend, rackpilot-db, rackpilot-network); update all internal
  references consistently (depends_on, DATABASE_URL host names, etc.)
- Leave the demo tenant "Example Telecom" as-is — that's seed customer data,
  not the product name
- .env.example / .env.production.example comments/headers mentioning the old name
- Sidebar/header logo: "RackPilot" in bold + a small muted "DCIM" pill badge
  next to it — keep both parts visible together (branding + searchability)

Do a final repo-wide case-insensitive search for "infravault" and confirm nothing
user-facing remains (git history from earlier stages does not need rewriting).

Note the GitHub repo slug to use later: "rackpilot-dcim"

Verify the app still builds and runs (docker compose up, tsc --noEmit, pytest).
Commit as "chore: rename project to RackPilot DCIM", tag v1.0.1-rename.

# Task 8 — Device photos

## Backend
- Add photo_url (nullable string) to Device
- POST /api/devices/{id}/photo — image upload (jpg/png/webp, max 5MB), stored on
  disk under a persistent volume (backend/uploads/devices/), served via a static
  route, URL saved on the device
- DELETE /api/devices/{id}/photo
- Validate file type by content, not just extension; resize/compress server-side
  (max ~1200px wide)
- Add the uploads directory to docker-compose as a named volume

## Frontend
- Device detail page: photo display (or neutral device-type icon placeholder)
  with upload/replace/remove controls (admin/engineer)
- Device create/edit form: optional photo upload step
- Rack elevation view: small thumbnail inside occupied slots when a photo exists
  (fall back to the existing color-coded block otherwise)
- Asset table: small thumbnail/icon in the name column

Commit, tag v1.1-device-photos.

# Task 9 — 2D Room Floor Plan (rack map)

## Backend
- Add pos_x, pos_y (float, grid units), width_units, depth_units (default 1x1)
  to Rack
- Add floor_width, floor_height (grid dimensions, e.g. 20x15 units) to Room
- Update rack endpoints to accept/return position; room endpoint returns all
  its racks with positions

## Frontend — /datacenters/:id/rooms/:id/floorplan
- Grid/canvas view of the room: grid background, each rack as a rectangle at
  its stored position, sized per width/depth, colored by utilization %
  (green low, amber mid, red near-full)
- Drag racks to reposition (admin/engineer); snap to grid; save on drop
- Click a rack → navigate to its elevation view
- Hover tooltip: rack name, utilization, device count
- "Add rack" directly on the floor plan at a clicked empty grid cell
- Link from datacenter/room pages ("View floor plan")

Commit, tag v1.2-floorplan.

# Task 10 — 3D Datacenter View (stretch, built on Task 9's data)

## Frontend — /datacenters/:id/rooms/:id/3d
- Add three.js + @react-three/fiber + @react-three/drei
- Room as a flat floor plane sized to floor_width x floor_height
- Each rack as a simple 3D box positioned per pos_x/pos_y, height representing
  u_height, colored by utilization the same way as the 2D view
- OrbitControls: rotate/pan/zoom
- Click a rack (raycasting) → navigate to its elevation view
- Simple lighting (ambient + one directional light); dark, minimal "blueprint"
  aesthetic matching the existing dark theme
- Toggle on the room page: "2D floor plan" / "3D view"
- If WebGL isn't available, friendly fallback pointing to the 2D floor plan

Commit, tag v1.3-3dview.

# Task 11 — Verification (Tasks 8-10)

1. docker compose up — full stack healthy, tsc --noEmit clean
2. Manually verify: upload a device photo, drag a rack on the floor plan and
   confirm position persists after refresh, orbit the 3D view and click a rack
3. Fix all console/test errors
4. Update README features list; note new screenshots needed for device photos,
   floor plan, and 3D view

================================================================
FINAL TASK — Handoff package (do this LAST, after everything above)
================================================================

# Task 12 — Final handoff package

1. Ensure everything is committed. Tag the final state: v1.3-final
2. Create a clean, complete archive for manual download at
   ~/rackpilot-dcim-final.zip, containing the full project EXCLUDING:
   - .git (kept out of the zip; git history goes to GitHub separately via push)
   - node_modules, .venv, __pycache__, dist, build
   - any local .env files (keep .env.example / .env.production.example)
   - postgres data volumes
3. Confirm the git repo itself (full history, all tags) is clean and ready to
   be pushed as-is — this is what actually goes to GitHub; the zip is the
   user's own local copy/backup
4. Print:
   - the final list of all tags in order
   - the zip file path and its size
   - exact instructions to download the zip via SFTP/SCP from this VM to the
     user's local machine
   - exact git remote/push commands for pushing the real repo (with history)
     to GitHub once the repo "rackpilot-dcim" is created there
