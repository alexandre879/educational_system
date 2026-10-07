from datetime import date
from io import BytesIO

from django.core.files.base import ContentFile
from PIL import Image, ImageOps


def parse_iso_date(value) -> date | None:
    """Parse a ``YYYY-MM-DD`` string. Returns ``None`` for empty or invalid input."""
    if not value:
        return None
    try:
        return date.fromisoformat(str(value))
    except ValueError:
        return None


def normalize_image_to_square(image_file, size: int = 512, format="JPEG", quality: int = 85):
    img = Image.open(image_file)

    # Fix orientation from phone photos (EXIF)
    img = ImageOps.exif_transpose(img)

    # JPEG has no alpha channel / palette
    if img.mode != "RGB":
        img = img.convert("RGB")

    # Center crop to square, then resize
    img = ImageOps.fit(img, (size, size), Image.Resampling.LANCZOS)

    buffer = BytesIO()
    img.save(buffer, format=format, quality=quality, optimize=True)
    buffer.seek(0)

    new_name = getattr(image_file, "name", None) or "profile.jpg"
    base = new_name.rsplit("/", 1)[-1].rsplit(".", 1)[0]
    final_name = f"{base}_{size}x{size}.jpg"

    return ContentFile(buffer.read(), name=final_name)
