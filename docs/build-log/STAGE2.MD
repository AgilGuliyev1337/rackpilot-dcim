# InfraVault — Stage 2 Instructions for Claude Code

Read CLAUDE.md first. Stage 1 (backend) is complete and running. Now build Stage 2:
the complete React frontend foundation. Work autonomously.

## Task 1 — Frontend skeleton

- `frontend/` — Vite + React 18 + TypeScript + Tailwind CSS
- Add the frontend service to docker-compose.yml (node:20, hot reload, port 3000),
  proxying /api requests to the backend service
- Structure: src/api (typed API client), src/components, src/pages, src/hooks,
  src/context (auth), src/types (TypeScript interfaces mirroring backend schemas)
- Axios (or fetch wrapper) client with: base URL config, JWT attach interceptor,
  automatic refresh-token retry on 401, redirect to /login when refresh fails

## Task 2 — Design system

Enterprise SaaS look (quality bar: NetBox / ServiceNow / modern cloud dashboards):
- Dark mode + light mode with a toggle; persist choice (in-memory + localStorage is fine here)
- Professional infrastructure palette: dark slate/graphite backgrounds, one accent color
  (electric blue or teal), semantic colors for statuses:
  active=green, inactive=gray, maintenance=amber, decommissioned=red
- Reusable components: Button, Input, Select, Modal, Table (sortable), Badge (status),
  Card, Toast notifications, Skeleton loaders, EmptyState
- Clean typography, consistent spacing, subtle borders — no heavy shadows, no gradients

## Task 3 — Auth pages

- /login — email + password, error handling, demo credentials hint box
  (admin@example.com / Demo123!)
- /register — organization name + admin user creation
- Auth context: current user, role, organization; ProtectedRoute wrapper
- Role awareness in UI: viewers see no create/edit/delete buttons anywhere

## Task 4 — App layout

- Sidebar navigation: Dashboard, Data Centers, Racks, Assets, Audit Log, Settings
  (icons: lucide-react)
- Top bar: global search input (searches devices by name/serial/asset tag/IP,
  dropdown results, navigates to device), theme toggle, user menu (name, role, logout)
- Responsive: sidebar collapses on smaller screens

## Task 5 — Dashboard page

Wired to GET /api/dashboard:
- Stat cards: Total Devices, Servers, Network, Storage, Power
- Rack utilization: overall % with a progress bar
- Warranty alerts panel: devices expiring within 90 days (name, tag, expiry date, days left)
- Recent activity feed: last 10 audit entries (user, action, entity, time ago)

## Task 6 — Infrastructure pages (CRUD)

- /datacenters — card grid: name, location, room/rack/device counts; create/edit/delete
  modals (admin+engineer only)
- /datacenters/:id — rooms list with racks inside; add/edit/delete rooms and racks
- /assets — the device table: columns name, asset tag, type (badge), vendor/model,
  status (badge), location (DC / rack / U), IP; server-side pagination;
  filters: device type, status, datacenter; search box; row click opens device detail
- Device detail: slide-over or page showing all fields (general / location / technical),
  edit + delete for admin/engineer
- Device create/edit form: validated (required name/asset tag/serial, IP format,
  MAC format), rack + position selectors showing only free positions

## Task 7 — Verification

1. docker compose up — all three services healthy
2. Manually verify via curl / build that: login works, dashboard loads real data,
   device table paginates and filters, a device can be created and appears in audit log
3. Fix TypeScript errors (tsc --noEmit passes), fix console errors
4. Commit with conventional commits
5. Print summary + what to check in the browser

Note: Rack visualization (the interactive 42U elevation view) is intentionally NOT in
this stage — it is Stage 3. Leave a placeholder "Rack view" link on rack cards.
