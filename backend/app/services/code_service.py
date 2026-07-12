"""QR code and Code128 barcode PNG generation."""

import io

import barcode
import qrcode
from barcode.writer import ImageWriter


def qr_png(data: str) -> bytes:
    """Render a QR code PNG encoding the given data."""
    qr = qrcode.QRCode(
        version=None,
        error_correction=qrcode.constants.ERROR_CORRECT_M,
        box_size=10,
        border=2,
    )
    qr.add_data(data)
    qr.make(fit=True)
    img = qr.make_image(fill_color="black", back_color="white")
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue()


def barcode_png(text: str) -> bytes:
    """Render a Code128 linear barcode PNG encoding the given text."""
    code128 = barcode.get("code128", text, writer=ImageWriter())
    buf = io.BytesIO()
    code128.write(buf, options={"module_height": 12.0, "font_size": 8, "quiet_zone": 2.0})
    return buf.getvalue()
