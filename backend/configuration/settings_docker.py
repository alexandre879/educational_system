"""
Docker-specific settings for configuration project.
Keeps the original settings.py unchanged.
"""

from .settings import *  # import everything from your old settings
import os

# ----------------------------------------
# BASIC
# ----------------------------------------
DEBUG = os.getenv("DJANGO_DEBUG", "0") == "1"

# SECRET KEY (use env in docker)
SECRET_KEY = os.getenv("DJANGO_SECRET_KEY", SECRET_KEY)

# ----------------------------------------
# HOSTS
# ----------------------------------------
DJANGO_ALLOWED_HOSTS = os.getenv("DJANGO_ALLOWED_HOSTS", "backend,localhost,127.0.0.1")
ALLOWED_HOSTS = [h.strip() for h in DJANGO_ALLOWED_HOSTS.split(",") if h.strip()]

# ----------------------------------------
# CORS
# ----------------------------------------
# If you want to keep your old behavior, you can leave CORS_ALLOW_ALL_ORIGINS=True
# but usually in docker you want explicit origins:
CORS_ALLOW_ALL_ORIGINS = os.getenv("CORS_ALLOW_ALL_ORIGINS", "0") == "1"

CORS_ALLOWED_ORIGINS_ENV = os.getenv(
    "CORS_ALLOWED_ORIGINS",
    "http://frontend:3000,http://localhost:3000"
)
CORS_ALLOWED_ORIGINS = [o.strip() for o in CORS_ALLOWED_ORIGINS_ENV.split(",") if o.strip()]

# ----------------------------------------
# DATABASE (THE BIG DOCKER FIX)
# ----------------------------------------
DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.postgresql",
        "NAME": os.getenv("DB_NAME", "django_db"),
        "USER": os.getenv("DB_USER", "django_user"),
        "PASSWORD": os.getenv("DB_PASSWORD", "djangodb999"),
        "HOST": os.getenv("DB_HOST", "db"),
        "PORT": os.getenv("DB_PORT", "5432"),
    }
}