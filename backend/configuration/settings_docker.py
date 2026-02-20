import dj_database_url
from .settings import * 
import os

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

# SECRET KEY
# In production, DO NOT rely on the fallback. Set DJANGO_SECRET_KEY in DO.
SECRET_KEY = os.getenv("DJANGO_SECRET_KEY") or SECRET_KEY  # noqa: F405

# ----------------------------------------
# HOSTS / CSRF
# ----------------------------------------
# On DigitalOcean your host will be like: *.ondigitalocean.app
# Recommended: set DJANGO_ALLOWED_HOSTS explicitly.
# Temporary debug: DJANGO_ALLOWED_HOSTS=*
allowed = env_list("DJANGO_ALLOWED_HOSTS", "localhost,127.0.0.1")
if "*" in allowed:
    ALLOWED_HOSTS = ["*"]
else:
    ALLOWED_HOSTS = allowed

# CSRF trusted origins (needed when using HTTPS domains)
# Example:
# CSRF_TRUSTED_ORIGINS=https://backend-xxx.ondigitalocean.app,https://frontend-xxx.ondigitalocean.app
CSRF_TRUSTED_ORIGINS = env_list("CSRF_TRUSTED_ORIGINS", "")

# If behind a proxy/load balancer (DO is), these help Django know it’s HTTPS
SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
USE_X_FORWARDED_HOST = True

# ----------------------------------------
# CORS
# ----------------------------------------
# For browser -> API requests only. Telegram bot does not care about CORS.
CORS_ALLOW_ALL_ORIGINS = env_bool("CORS_ALLOW_ALL_ORIGINS", "0")

# Example:
# CORS_ALLOWED_ORIGINS=https://frontend-xxx.ondigitalocean.app,http://localhost:3000
CORS_ALLOWED_ORIGINS = env_list("CORS_ALLOWED_ORIGINS", "http://localhost:3000")

# If you use cookies/auth, you may need:
# CORS_ALLOW_CREDENTIALS = True
# and ensure your frontend uses same-site settings properly.

# ----------------------------------------
# DATABASE (DigitalOcean managed Postgres friendly)
# ----------------------------------------
DB_NAME = os.getenv("DB_NAME", "django_db")
DB_USER = os.getenv("DB_USER", "django_user")
DB_PASSWORD = os.getenv("DB_PASSWORD", "")
DB_HOST = os.getenv("DB_HOST", "db")  # local docker default
DB_PORT = os.getenv("DB_PORT", "5432")

DATABASES = {
    "default": dj_database_url.config(
        default=os.getenv("DATABASE_URL"),
        conn_max_age=600,
        ssl_require=True,
    )
}

# DigitalOcean managed DB usually requires SSL.
# Set DB_SSLMODE=require in DO backend + bot worker env vars.
DB_SSLMODE = os.getenv("DB_SSLMODE", "").strip()
if DB_SSLMODE:
    DATABASES["default"]["OPTIONS"] = {"sslmode": DB_SSLMODE}

# ----------------------------------------
# Static files (optional)
# ----------------------------------------
# If you use collectstatic inside the container, ensure STATIC_ROOT exists.
# Many setups add WhiteNoise in middleware; if you already do in settings.py keep it.
# STATIC_ROOT = os.path.join(BASE_DIR, "staticfiles")  # noqa: F405

# ----------------------------------------
# Security toggles for production (optional hardening)
# ----------------------------------------
# You can enable these once everything works.
# if not DEBUG:
#     SECURE_SSL_REDIRECT = True
#     SESSION_COOKIE_SECURE = True
#     CSRF_COOKIE_SECURE = True