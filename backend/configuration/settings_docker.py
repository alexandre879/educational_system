import os
import dj_database_url
from .settings import *  # import base settings


# ----------------------------------------
# Helpers
# ----------------------------------------
def env_bool(name: str, default: str = "0") -> bool:
    return os.getenv(name, default).strip() == "1"


def env_list(name: str, default: str = "") -> list[str]:
    raw = os.getenv(name, default)
    return [x.strip() for x in raw.split(",") if x.strip()]


# ----------------------------------------
# BASIC
# ----------------------------------------
DEBUG = env_bool("DJANGO_DEBUG", "0")

SECRET_KEY = os.getenv("DJANGO_SECRET_KEY", SECRET_KEY)


# ----------------------------------------
# HOSTS
# ----------------------------------------
ALLOWED_HOSTS = env_list("DJANGO_ALLOWED_HOSTS", "localhost,127.0.0.1")

CSRF_TRUSTED_ORIGINS= env_list("DJANGO_CSRF_TRUSTED_ORIGINS", "localhost,127.0.0.1")

if "*" in ALLOWED_HOSTS:
    ALLOWED_HOSTS = ["*"]
else:
    ALLOWED_HOSTS = ALLOWED_HOSTS


# ----------------------------------------
# CSRF / HTTPS (DigitalOcean proxy support)
# ----------------------------------------
CSRF_TRUSTED_ORIGINS = env_list("CSRF_TRUSTED_ORIGINS", "")

SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
USE_X_FORWARDED_HOST = True


# ----------------------------------------
# CORS
# ----------------------------------------
CORS_ALLOW_ALL_ORIGINS = env_bool("CORS_ALLOW_ALL_ORIGINS", "0")

CORS_ALLOWED_ORIGINS = env_list(
    "CORS_ALLOWED_ORIGINS",
    "http://localhost:3000",
)

# If using cookies auth:
# CORS_ALLOW_CREDENTIALS = True


# ----------------------------------------
# DATABASE (DigitalOcean App Platform)
# ----------------------------------------
DATABASE_URL = os.getenv("DATABASE_URL", "").strip()

if DATABASE_URL:
    # Production / DO managed database
    DATABASES = {
        "default": dj_database_url.parse(
            DATABASE_URL,
            conn_max_age=600,
            ssl_require=True,
        )
    }
else:
    # Local fallback (optional)
    DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.postgresql",
            "NAME": os.getenv("DB_NAME", "django_db"),
            "USER": os.getenv("DB_USER", "django_user"),
            "PASSWORD": os.getenv("DB_PASSWORD", ""),
            "HOST": os.getenv("DB_HOST", "localhost"),
            "PORT": os.getenv("DB_PORT", "5432"),
        }
    }


# ----------------------------------------
# Optional security hardening (enable later)
# ----------------------------------------
if not DEBUG:
    SECURE_SSL_REDIRECT = True
    SESSION_COOKIE_SECURE = True
    CSRF_COOKIE_SECURE = True


# ----------------------------------------
# Static files (optional)
# ----------------------------------------
# STATIC_ROOT = os.path.join(BASE_DIR, "staticfiles")