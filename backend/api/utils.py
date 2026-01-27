import random
from django.core.cache import cache
from api.models import User
from api.train.train import generate_school_email
from io import BytesIO
from PIL import Image, ImageOps
from django.core.files.base import ContentFile




def generate_otp(user_id):
    otp = str(random.randint(100000, 999999))
    cache_key = f"otp_{user_id}"
    cache.set(cache_key, otp, timeout=300) 
    return otp



def verify_otp(user_id, submitted_otp):
    cache_key = f"otp_{user_id}"
    otp = cache.get(cache_key)

    if otp is None:
        return False, "OTP expired"

    if otp == submitted_otp:
        cache.delete(cache_key)  
        return True, "OTP verified"
    else:
        return False, "Invalid OTP"
    
    

def bulk_register_school_members(members_list):

    existing_emails = set(User.objects.values_list("email", flat=True))
    
    new_users = []
    
    for member in members_list:
        email = generate_school_email(member["full_name"], existing_emails)
        
        user = User(
            full_name=member["full_name"],
            email=email,
            role=member["role"],
            otp=str(random.randint(100000, 999999)), 
            verified=False
        )
        new_users.append(user)
    
    User.objects.bulk_create(new_users)
    
    
    



def normalize_image_to_square(image_file, size: int = 512, format="JPEG", quality: int = 85):
    img = Image.open(image_file)

    # Fix orientation from phone photos (EXIF)
    img = ImageOps.exif_transpose(img)

    # Convert to RGB for JPEG (PNG alpha -> RGB)
    if img.mode not in ("RGB", "L"):
        img = img.convert("RGB")
    elif img.mode == "L":
        img = img.convert("RGB")

    # Center crop to square
    w, h = img.size
    min_side = min(w, h)
    left = (w - min_side) // 2
    top = (h - min_side) // 2
    img = img.crop((left, top, left + min_side, top + min_side))

    # Resize
    img = img.resize((size, size), Image.Resampling.LANCZOS)

    # Save to memory
    buffer = BytesIO()
    img.save(buffer, format=format, quality=quality, optimize=True)
    buffer.seek(0)

    # Build new file
    new_name = getattr(image_file, "name", "profile.jpg")
    base = new_name.rsplit(".", 1)[0]
    final_name = f"{base}_{size}x{size}.jpg"

    return ContentFile(buffer.read(), name=final_name)