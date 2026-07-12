# RackPilot DCIM — Stage 8 Instructions for Claude Code

Read CLAUDE.md first. Stage 7 (front/back photos) is complete, tagged
v1.4-front-back-photos. Work autonomously. Commit and tag after each part so
we always have a safe rollback point. If you hit usage limits mid-stage, stop
cleanly after the current part's checkpoint — do not leave a part half-done.

# TASK 0 — Snapshot

Commit any uncommitted changes, confirm clean state before proceeding.

# PART A — Asset Lifecycle Management

## Backend
- Add lifecycle_status to Device as its own field, separate from the existing
  operational status (active/inactive/maintenance/decommissioned). Lifecycle
  values: planning, ordered, received, installed, production, maintenance,
  decommissioned, disposed
- Add fields if not already present: purchase_date, support_contract,
  department (owner and warranty_expiry already exist)
- Enforce a sensible forward progression in the service layer (warn/block
  skipping backwards, but don't over-engineer a strict state machine — a
  simple validation that decommissioned/disposed can't move back to
  production without explicit admin override is enough)
- Audit-log lifecycle transitions like any other update

## Frontend
- Device detail: a lifecycle stage indicator (horizontal stepper showing the
  8 stages, current one highlighted) with a control to advance/change it
  (admin/engineer)
- Device create/edit form: purchase_date, support_contract, department fields
- Asset table: optional lifecycle filter alongside existing status filter
- Reports page: add a small "lifecycle breakdown" chip/summary (count per stage)

## Checkpoint
Commit, tag v1.5-lifecycle.

# PART B — Power Management

## Backend
- Add power_watts (nullable int) to Device — its typical power draw
- Add power_capacity_watts to Rack (nullable int, e.g. default 10000 = 10kW)
- Rack layout/detail endpoint includes: total capacity, current consumption
  (sum of watts of all devices in the rack), available watts, and a status
  (normal <70%, warning 70-90%, critical >90% — pick reasonable thresholds
  and document them)
- Dashboard/reports: overall power consumption rollup per datacenter

## Frontend
- Device create/edit form: power_watts field
- Rack elevation view header: capacity bar (like utilization %) showing
  kW used / kW available, color-coded by the normal/warning/critical status
- Rack cards (overview + floor plan): small power indicator alongside the
  existing U-utilization indicator
- Reports page: power capacity report per rack, datacenter rollup

## Checkpoint
Commit, tag v1.6-power.

# PART C — QR Code Asset Tracking

## Backend
- GET /api/devices/{id}/qrcode — generates a QR code (PNG) encoding a URL
  like {frontend_base_url}/assets/{id} (use a small Python QR library,
  e.g. qrcode); no new device fields needed, asset_tag already exists as
  the human-readable identifier
- Make sure the device detail page route (/assets/:id or similar) is
  reachable and shows full detail even when navigated to directly (not just
  from within the table) — this is what a scanned QR code lands on

## Frontend
- Device detail page: a "QR Code" button/section showing the generated code,
  downloadable as PNG (for printing and sticking on physical equipment)
- Asset table: small QR icon per row linking to the same
- Bulk option: a "Print QR labels" action that opens a printable page with
  multiple QR codes + device name + asset tag laid out in a label-sheet grid
  for a selection of devices (nice-to-have if time allows; skip if it adds
  too much scope — the single-device QR is the core requirement)

## Checkpoint
Commit, tag v1.7-qrcode.

# PART D — Command Palette (Cmd/Ctrl+K)

## Frontend only
- Global keyboard shortcut (Cmd+K on Mac, Ctrl+K on Windows/Linux) opens a
  centered modal command palette (similar to Linear/Vercel/GitHub's)
- Fuzzy search across: pages (Dashboard, Assets, Racks, Reports, Audit Log,
  Settings), and live entity search (devices by name/serial/asset_tag/IP,
  racks by name, datacenters by name) using existing search/list endpoints
- Keyboard navigation (arrow keys + enter), recent/frequently visited items
  shown when the palette opens with an empty query
- Selecting a result navigates directly to that page/entity
- Accessible from anywhere in the app (global listener, not per-page)

## Checkpoint
Commit, tag v1.8-command-palette.

# PART E — Rack Elevation PDF/PNG Export

## Backend or frontend-only (frontend-only is simpler and preferred here)
- On the rack elevation view, an "Export" button generates a clean printable
  version of the current rack elevation (U numbers, device names/types,
  utilization header, rack name/location) as:
  - PNG (client-side canvas/svg-to-image is fine)
  - PDF (a simple one-page layout is enough; a frontend library like jsPDF
    with the rendered canvas, or a backend endpoint using a Python PDF lib
    if that's cleaner given the existing stack — choose whichever is less
    code, this doesn't need to be fancy)
- Include a small header: organization name, datacenter/room/rack path,
  generated timestamp — this is meant to look like a real handover document

## Checkpoint
Commit, tag v1.9-rack-export.

# PART F — AI Assistant (powered by OpenRouter)

## Backend
- New endpoint POST /api/assistant/ask — accepts a natural-language question,
  gathers relevant context from the database (dashboard stats, rack
  utilization, warranty alerts, device counts — scoped to the user's
  organization only), and calls the OpenRouter API with that context plus
  the question, returning a concise answer
- Use OpenRouter's OpenAI-compatible chat completions endpoint:
  POST https://openrouter.ai/api/v1/chat/completions
  Headers: Authorization: Bearer {OPENROUTER_API_KEY}, Content-Type: application/json
  Body: {"model": "<configurable>", "messages": [{"role": "system", "content": "..."},
  {"role": "user", "content": "..."}]}
  (Optional but recommended headers: HTTP-Referer and X-Title, per OpenRouter's
  docs, for attribution on their dashboard — use placeholder values like the
  app's name if unsure of the exact current header requirements; check
  https://openrouter.ai/docs if you have network access to confirm the current
  request format before finalizing, since third-party API details can change.)
- Read two environment variables:
  - OPENROUTER_API_KEY (required for the feature to work)
  - OPENROUTER_MODEL (optional, default to a fast/cheap general-purpose model
    slug such as "openai/gpt-4o-mini" or "anthropic/claude-3.5-haiku" — make
    this configurable rather than hardcoded so the user can swap models
    without a code change)
- If OPENROUTER_API_KEY is not set, the endpoint should return a clear
  "AI assistant not configured" response rather than erroring — this
  feature must be fully optional and not break the app if no key is present
- Support example questions like: "which racks have available space?",
  "which racks are overloaded on power?", "how many devices need
  warranty renewal soon?", "give me a summary of datacenter X"
- Keep the context sent to the API strictly scoped to the requesting user's
  organization (reuse the existing tenant-scoping dependency) — never leak
  cross-tenant data into the prompt
- Handle OpenRouter error responses gracefully (rate limits, invalid model,
  invalid key) and surface a clean error message to the frontend rather than
  a raw stack trace
- Log assistant queries lightly (not full audit log, just enough for
  debugging) but do not store the API key or full prompts insecurely

## Frontend
- A small floating chat-style widget (bottom-right corner, expandable) or a
  dedicated /assistant page — pick whichever is less code given the existing
  component library; a simple chat thread (question in, answer out) is enough,
  no need for streaming or multi-turn memory beyond the current session
- If the backend reports "not configured", show a friendly message explaining
  an OpenRouter API key needs to be set (don't hide the feature entirely —
  it's good to show it exists even when not active, for portfolio purposes)
- Add a note in the README about this feature and how to enable it: sign up
  at openrouter.ai, generate an API key, set OPENROUTER_API_KEY (and
  optionally OPENROUTER_MODEL) in .env — mention that OpenRouter provides
  access to many models (OpenAI, Anthropic, others) through one API

## Checkpoint
Commit, tag v1.10-ai-assistant.

# Final verification

1. docker compose up — full stack healthy, tsc --noEmit clean, pytest green
2. Manually verify each part works as described
3. Fix all console/test errors
4. Update README features list to include all Stage 8 additions
5. Print a summary of everything built in this stage and what to check in
   the browser, plus the full list of tags from v1.4 through v1.10
