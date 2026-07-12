# RackPilot DCIM — Stage 7 Instructions for Claude Code (small scope)

Read CLAUDE.md first. Work autonomously. This stage is intentionally SMALL —
only front/back device photos. Commit and tag when done.

# Task 0 — Snapshot

Commit any uncommitted changes first. Confirm current state before proceeding.

# Task 1 — Front and back photos per device

## Backend
- Replace/extend the existing single photo_url on Device with two fields:
  photo_front_url and photo_back_url (both nullable strings). If photo_url
  already exists from an earlier stage, migrate its value into photo_front_url
  in the same migration (don't lose existing uploaded photos).
- POST /api/devices/{id}/photo?side=front|back — accepts an image upload
  (jpg/png/webp, max 5MB), stores it on disk under the existing persistent
  uploads volume (backend/uploads/devices/), serves via the existing static
  route, saves the URL to the correct field based on side
- DELETE /api/devices/{id}/photo?side=front|back — removes only that side
- Keep existing validation (content-based file type check, resize/compress to
  max ~1200px wide)

## Frontend
- Device detail page: a front/back toggle (two tabs or a switch) above the
  photo area; each side shows its own photo or a neutral device-type icon
  placeholder if not set, with its own upload/replace/remove controls
  (admin/engineer only)
- Device create/edit form: optional upload for both front and back photos
- Rack elevation view: keep showing the front photo thumbnail in occupied
  slots (as before); no change needed there beyond using photo_front_url
- Asset table thumbnail: use photo_front_url as before

# Task 2 — Verify and finish

1. docker compose up — stack healthy, tsc --noEmit clean, pytest green
2. Manually verify: upload a front photo, upload a back photo, toggle between
   them on the device detail page, confirm both persist after refresh
3. Fix any errors, commit, tag v1.4-front-back-photos
4. Print a short summary of what was built and what to check in the browser

This is the end of Stage 7. Do not start any other features — Power Management,
Asset Lifecycle, QR Code, Command Palette, PDF export, and AI Assistant are
planned for Stage 8, later.
