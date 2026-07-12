import io
import secrets
from pathlib import Path

from fastapi import HTTPException, status
from PIL import Image, UnidentifiedImageError

from app.core.config import settings

# On-disk location (configurable via UPLOADS_DIR); mounted as a named volume in
# docker-compose so photos persist. Served at the fixed /uploads/devices URL path.
UPLOAD_DIR = Path(settings.uploads_dir) / "devices"
UPLOAD_URL_PREFIX = "/uploads/devices"

# Pillow format name -> file extension
ALLOWED_FORMATS = {"JPEG": "jpg", "PNG": "png", "WEBP": "webp"}
MAX_WIDTH = 1200
MAX_BYTES = 5 * 1024 * 1024


def save_device_photo(device_id: int, content: bytes, side: str = "front") -> str:
    """Validate (by content), resize, and store an image. Returns its public URL."""
    if len(content) > MAX_BYTES:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Image too large (max 5 MB)")

    # Validate by decoding, not by trusting the extension/content-type.
    try:
        Image.open(io.BytesIO(content)).verify()
        img = Image.open(io.BytesIO(content))  # reopen: verify() leaves it unusable
    except (UnidentifiedImageError, OSError):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Invalid or corrupt image file")

    fmt = img.format
    if fmt not in ALLOWED_FORMATS:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST, "Only JPEG, PNG and WEBP images are supported"
        )

    if img.width > MAX_WIDTH:
        height = round(img.height * MAX_WIDTH / img.width)
        img = img.resize((MAX_WIDTH, height), Image.LANCZOS)

    save_kwargs: dict = {}
    if fmt == "JPEG":
        img = img.convert("RGB")
        save_kwargs = {"quality": 85, "optimize": True}

    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    # Random suffix so replacing a photo yields a new URL (defeats stale caching).
    filename = f"{device_id}-{side}-{secrets.token_hex(8)}.{ALLOWED_FORMATS[fmt]}"
    img.save(UPLOAD_DIR / filename, fmt, **save_kwargs)
    return f"{UPLOAD_URL_PREFIX}/{filename}"


def delete_photo_file(photo_url: str | None) -> None:
    """Remove the on-disk file for a stored photo URL, if present."""
    if not photo_url:
        return
    filename = photo_url.rsplit("/", 1)[-1]
    path = UPLOAD_DIR / filename
    # Guard against path traversal — only delete inside UPLOAD_DIR.
    try:
        path.resolve().relative_to(UPLOAD_DIR.resolve())
    except ValueError:
        return
    if path.exists():
        path.unlink()
