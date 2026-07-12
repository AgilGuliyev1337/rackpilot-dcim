# InfraVault — Stage 3+4 Instructions for Claude Code (combined)

Read CLAUDE.md first. Stages 1-2 are complete (backend + frontend foundation running).
Execute the tasks below in order. Work autonomously. Commit per feature with
conventional commits.

# TASK 0 — Snapshot before anything new (MANDATORY FIRST STEP)

1. Commit all uncommitted changes with message "chore: stage 2 complete snapshot"
2. Create a git tag: v0.2-stage2
3. Create a full backup archive of the project at ~/backups/infravault-stage2.tar.gz
   (create ~/backups if needed; exclude node_modules, .venv, __pycache__,
   .git objects are fine to include, and exclude any postgres volume data)
4. Verify the archive exists and print its size
5. Only after the archive is verified, proceed to Part A

# PART A — Interactive Rack Visualization (the flagship feature)

## A1 — Rack elevation view (/racks/:id)

- Render the rack as a vertical elevation: U slots from u_height (top) down to 1 (bottom),
  using GET /api/racks/{id}/layout
- Each U row: U number label on the left, slot content on the right
- Occupied slots: device block spanning its full height_u (a 2U device is one block
  covering 2 rows), showing device name + type icon; color-coded by device_type
  (servers blue, network purple, storage teal, power amber — consistent with badges)
- Empty slots: subtle dashed outline with the U number
- Header: rack name, room / datacenter breadcrumb, utilization bar (occupied U / total U)
- Click a device block → detail panel (slide-over): all device info + "Edit" +
  "Remove from rack" (admin/engineer)

## A2 — Placing and moving devices

- "Add device" on any empty slot → modal: pick an unracked device of the org
  (searchable select) OR create a new device inline; height_u aware — only allow
  placement if the device fits without overlap (backend already enforces 409;
  surface its message clearly)
- Move device: drag-and-drop within the rack (HTML5 DnD or a light library) —
  on drop call the update endpoint; on 409 snap back and show toast with the reason.
  Also provide a non-drag fallback: "Move" button in the detail panel with a
  position selector listing only valid free positions (so it works on any device/browser)
- Visual feedback while dragging: highlight valid target slots, dim invalid ones

## A3 — Racks overview page (/racks)

- Grid of rack cards: name, DC/room, mini utilization bar, device count
- Optional mini-elevation thumbnail per card (simplified colored strip per U)
- Click → rack elevation view

## A4 — Checkpoint

After Part A is working and verified in the running stack: commit and tag v0.3-rackview.
Then continue to Part B.

# PART B — Import / Export

## B1 — Backend

- GET /api/devices/export?format=csv|xlsx — exports the org's devices with all fields,
  respecting current filters (type/status/datacenter) passed as query params
- POST /api/devices/import — accepts CSV or XLSX upload:
  - Validate per row: required fields, enum values, unique asset_tag/serial within org,
    rack references by rack name + position with overlap checks
  - Import valid rows, collect per-row errors (row number + reason)
  - Response: {imported: n, failed: n, errors: [...]}
  - Audit-log the import as one action with a summary
- GET /api/devices/import/template — returns a template file with headers + 2 example rows
- Use openpyxl for xlsx; admin/engineer only

## B2 — Frontend (/assets page additions)

- "Export" button: choose CSV or Excel, downloads with current filters applied
- "Import" button (admin/engineer): modal with template download link, drag-and-drop
  file zone, upload → result screen showing imported count and an error table
  (row, field, message); errors also downloadable as CSV

# PART C — Audit Log UI

- /audit page: table of audit entries — time, user, action (badge: create=green,
  update=blue, delete=red), entity type, entity name, and an expandable diff view
  showing old vs new values side by side (only changed fields, highlighted)
- Filters: action type, entity type, user, date range; pagination
- Backend: extend the audit list endpoint with these filters if not already present

# PART D — Reports page

- /reports page with three simple, useful reports (query backend, render clean tables
  + summary cards; each exportable to CSV):
  1. Inventory by type & vendor — counts grouped by device_type and vendor
  2. Warranty report — all devices with warranty_expiry, sorted by date,
     highlight expired (red) and <90 days (amber)
  3. Capacity report — per rack: total U, used U, free U, utilization %;
     per datacenter rollup
- Add "Reports" to the sidebar navigation

# Verification

1. docker compose up — full stack healthy; tsc --noEmit passes
2. Add pytest coverage: import endpoint (valid file, file with bad rows, duplicate
   asset_tag), export returns correct rows under filters
3. Manually verify: place + drag-move a device in the rack view (and the non-drag
   fallback), import the template file, expand an audit diff, open all three reports
4. Fix all console/test errors, commit everything, tag v0.4-stage4
5. Print a summary of what was built and what to check in the browser
