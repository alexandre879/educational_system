import random
from django.core.cache import cache
from api.models import User
from api.train.train import generate_school_email



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

