# RackPilot DCIM — Stage 9 Instructions for Claude Code
# QR/Barcode generation + Warehouse & Stock Management

Read CLAUDE.md first. Stage 8 (lifecycle, power, AI assistant) is complete,
tagged v1.7-ai-assistant. Work autonomously. Commit and tag after each part
so we always have a safe rollback point. If you hit usage limits mid-stage,
stop cleanly after the current part's checkpoint — do not leave a part
half-done.

# TASK 0 — Snapshot

Commit any uncommitted changes, confirm clean state before proceeding.

# PART A — QR Code and Barcode Asset Tracking

## Backend
- GET /api/devices/{id}/qrcode — generates a QR code (PNG) encoding a URL
  like {frontend_base_url}/assets/{id} (use a Python QR library, e.g. `qrcode`)
- GET /api/devices/{id}/barcode — generates a traditional linear barcode
  (Code128, using e.g. the `python-barcode` library) encoding the device's
  asset_tag as plain text — this is for classic handheld barcode scanners
  commonly used in physical warehouses, which is a different device profile
  than smartphone QR scanning
- Add the same two endpoints for StockItem once Part B's model exists
  (GET /api/stock-items/{id}/qrcode and /barcode, encoding sku/asset reference)
- Make sure the device detail page route (/assets/:id) is reachable and shows
  full detail even when navigated to directly — this is what a scanned QR
  code lands on
- A generic lookup endpoint: GET /api/lookup/{code} — accepts either an
  asset_tag or a stock item SKU, returns whichever entity matches (device or
  stock item) with its type, so a single "scan anything" flow can resolve to
  the right page without the operator needing to know what they're scanning

## Frontend
- Device detail page: a "Codes" section with tabs/toggle for QR vs Barcode,
  each downloadable as PNG (for printing and sticking on physical equipment)
- Asset table: small QR/barcode icon per row linking to the same
- Bulk "Print labels" action: opens a printable page with multiple QR codes
  AND barcodes + device name + asset tag laid out in a label-sheet grid for
  a selection of devices (choose QR, barcode, or both per print job)
- A "Scan / Lookup" page: a single text input (works with both a physical
  USB barcode scanner acting as a keyboard, and manual typing) that calls
  /api/lookup/{code} and navigates straight to the matching device or stock
  item — this is the primary warehouse workflow entry point
- Auto-focus that input and auto-submit on Enter (barcode scanners send an
  Enter keystroke after the scanned value) so an operator can scan
  continuously without touching the mouse

## Checkpoint
Commit, tag v1.8-qr-barcode.

# PART B — Warehouse & Stock Management

This models a separate storage/inventory workflow from the rack hierarchy:
spare parts, consumables, and equipment sitting in a physical warehouse
before being racked or after being decommissioned, tracked by quantity
rather than as individually racked serialized devices.

## Backend — models
- Warehouse: name, location, description, organization_id (org-scoped,
  independent of the DataCenter hierarchy — a warehouse is its own top-level
  physical location, e.g. "Baku Central Warehouse")
- StockItem: name, sku (unique per org), category (e.g. cable, transceiver,
  rail-kit, screw-kit, spare-psu, spare-drive, other), quantity (int),
  min_threshold (int, for low-stock alerts), unit (pcs, box, meter, roll),
  warehouse_id, vendor, notes, organization_id
- StockMovement: stock_item_id, movement_type (received/issued/adjusted/
  returned), quantity (positive int; direction implied by movement_type),
  performed_by (user), reason/note, linked_device_id (nullable — e.g. "2 SFP
  modules issued for Device X installation"), timestamp, organization_id
- Existing Device model: add warehouse_id (nullable) so a serialized device
  can live in a warehouse (unracked spare/decommissioned equipment) instead
  of or in addition to a rack_id — a device should be in at most one place
  at a time (rack OR warehouse OR neither); enforce this in the service layer
- Every stock movement updates StockItem.quantity accordingly and is
  audit-logged like other mutations

## Backend — API
- Full tenant-scoped CRUD for Warehouse and StockItem
- POST /api/stock-items/{id}/movement — records a movement (in/out/adjust),
  validates quantity doesn't go negative, updates the running quantity
- GET /api/stock-items/{id}/movements — movement history for that item
  (paginated)
- GET /api/warehouses/{id} — returns its stock items and any unracked
  devices stored there
- Move endpoint for Device: assign/clear warehouse_id (with the same
  audit logging pattern used for rack moves)
- Dashboard/reports: low-stock alert list (StockItem where quantity <=
  min_threshold), similar in style to the existing warranty alerts

## Frontend
- New sidebar section "Warehouse" with sub-pages:
  - /warehouses — list/grid of warehouses (create/edit/delete, admin/engineer)
  - /warehouses/:id — shows stock items (table: name, sku, category, quantity,
    threshold status badge, unit) and any unracked devices stored there;
    "Receive stock" and "Issue stock" quick actions open a movement modal
  - /warehouses/:id/stock/:stockItemId — stock item detail: current quantity,
    threshold, full movement history table, QR/barcode for the SKU
- Low-stock indicator: a badge/count in the sidebar next to "Warehouse"
  (like a notification badge) and an entry in the dashboard alerts panel
  alongside warranty alerts
- Device detail / device create-edit: allow setting warehouse_id as an
  alternative to rack placement (e.g. a "Location" section with a
  Rack/Warehouse/Unassigned toggle)
- Reports page: add a "Stock levels" report (all stock items, quantity vs
  threshold, exportable to CSV) and a "Stock movements" report (recent
  movements across all items, filterable by date range and type)

## Checkpoint
Commit, tag v1.9-warehouse.

# Final verification

1. docker compose up — full stack healthy, tsc --noEmit clean, pytest green
2. Manually verify:
   - generate and download both a QR code and a barcode for a device
   - use the Scan/Lookup page to resolve an asset_tag to its device page
   - create a warehouse, add a stock item, receive stock, issue stock,
     confirm quantity updates and movement history is correct
   - trigger a low-stock alert (issue below min_threshold) and see it on
     the dashboard
   - move a device into a warehouse and confirm it's no longer shown as
     occupying its old rack position
3. Fix all console/test errors
4. Update README features list to include Stage 9 additions
5. Print a summary of everything built, what to check in the browser, and
   the full list of tags from v1.4 through v1.9
