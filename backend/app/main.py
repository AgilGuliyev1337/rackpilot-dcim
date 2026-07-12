import logging
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.api import (
    assistant,
    audit_logs,
    auth,
    dashboard,
    datacenters,
    device_io,
    device_photos,
    devices,
    lookup,
    racks,
    reports,
    rooms,
    stock_items,
    warehouses,
)
from app.core.config import settings

app = FastAPI(title="RackPilot DCIM", version="1.0.0")

app.include_router(auth.router)
app.include_router(datacenters.router)
app.include_router(rooms.router)
app.include_router(racks.router)
app.include_router(device_io.router)  # before devices: /export must beat /{device_id}
app.include_router(device_photos.router)
app.include_router(devices.router)
app.include_router(dashboard.router)
app.include_router(audit_logs.router)
app.include_router(reports.router)
app.include_router(assistant.router)
app.include_router(warehouses.router)
app.include_router(stock_items.router)
app.include_router(lookup.router)

# Serve uploaded device photos as static files
(Path(settings.uploads_dir) / "devices").mkdir(parents=True, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=settings.uploads_dir), name="uploads")

# Explicit allow-list (no wildcard) — same-origin in prod behind nginx.
_allowed_origins = {
    settings.frontend_base_url,
    "http://localhost:3000",
    "http://localhost:5173",
}
app.add_middleware(
    CORSMiddleware,
    allow_origins=sorted(_allowed_origins),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Fail loudly if the JWT secret is left at a known placeholder or too short.
_WEAK_SECRETS = {"change-me-in-production-use-32-plus-bytes", "change-me-in-production"}
if settings.jwt_secret in _WEAK_SECRETS or len(settings.jwt_secret) < 32:
    logging.getLogger("security").warning(
        "JWT_SECRET is weak or default — set a random 32+ byte secret in production."
    )


@app.get("/api/health")
def health() -> dict[str, str]:
    return {"status": "ok"}
