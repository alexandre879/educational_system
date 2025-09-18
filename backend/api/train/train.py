from django.utils.text import slugify
from ..models import SchoolUser




def generate_school_email(full_name: str, existing_emails: set):
    
    base = slugify(full_name).replace("-", ".")  
    
    email = f"{base}@myschool.edu"
    counter = 1

    while email in existing_emails:
        counter += 1
        email = f"{base}{counter}@myschool.edu"

    existing_emails.add(email)

    return email

