# import os
# import dj_database_url
# from .settings import *



# def env_bool(name: str, default: str = "0") -> bool:
#     return os.getenv(name, default).strip() == "1"


# def env_list(name: str, default: str = "") -> list[str]:
#     raw = os.getenv(name, default)
#     return [x.strip() for x in raw.split(",") if x.strip()]



# STATIC_URL = "/static/"
# STATIC_ROOT = os.path.join(BASE_DIR, "staticfiles")

# DEBUG = env_bool("DJANGO_DEBUG", "0")

# SECRET_KEY = os.getenv("DJANGO_SECRET_KEY", SECRET_KEY)

# FORCE_SCRIPT_NAME = "/back"


# ALLOWED_HOSTS = env_list("DJANGO_ALLOWED_HOSTS", "localhost,127.0.0.1")

# CSRF_TRUSTED_ORIGINS= env_list("DJANGO_CSRF_TRUSTED_ORIGINS", "http://localhost:3000")

# if "*" in ALLOWED_HOSTS:
#     ALLOWED_HOSTS = ["*"]
# else:
#     ALLOWED_HOSTS = ALLOWED_HOSTS


# SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
# USE_X_FORWARDED_HOST = True


# CORS_ALLOW_ALL_ORIGINS = env_bool("CORS_ALLOW_ALL_ORIGINS", "0")

# CORS_ALLOWED_ORIGINS = env_list(
#     "CORS_ALLOWED_ORIGINS",
#     "http://localhost:3000",
# )

# DATABASE_URL = os.getenv("DATABASE_URL", "").strip()

# if DATABASE_URL:
#     DATABASES = {
#         "default": dj_database_url.parse(
#             DATABASE_URL,
#             conn_max_age=600,
#             ssl_require=True,
#         )
#     }
# else:
#     DATABASES = {
#         "default": {
#             "ENGINE": "django.db.backends.postgresql",
#             "NAME": os.getenv("DB_NAME", "django_db"),
#             "USER": os.getenv("DB_USER", "django_user"),
#             "PASSWORD": os.getenv("DB_PASSWORD", ""),
#             "HOST": os.getenv("DB_HOST", "localhost"),
#             "PORT": os.getenv("DB_PORT", "5432"),
#         }
#     }


# if not DEBUG:
#     SECURE_SSL_REDIRECT = True
#     SESSION_COOKIE_SECURE = True
#     CSRF_COOKIE_SECURE = True




# MIDDLEWARE = [
#     "django.middleware.security.SecurityMiddleware",
#     "whitenoise.middleware.WhiteNoiseMiddleware",
# ]






import os
import dj_database_url
from .settings import *

def env_bool(name: str, default: str = "0") -> bool:
    return os.getenv(name, default).strip() == "1"

def env_list(name: str, default: str = "") -> list[str]:
    raw = os.getenv(name, default)
    return [x.strip() for x in raw.split(",") if x.strip()]

DEBUG = env_bool("DJANGO_DEBUG", "0")
SECRET_KEY = os.getenv("DJANGO_SECRET_KEY", SECRET_KEY)

# Your app is mounted under /back (DO trims /back before sending to Django)
FORCE_SCRIPT_NAME = "/back"

ALLOWED_HOSTS = env_list("DJANGO_ALLOWED_HOSTS", "localhost,127.0.0.1")
if "*" in ALLOWED_HOSTS:
    ALLOWED_HOSTS = ["*"]

# IMPORTANT: must include scheme, and must be a list
CSRF_TRUSTED_ORIGINS = env_list(
    "DJANGO_CSRF_TRUSTED_ORIGINS",
    "https://educational-system-front-wh8sd.ondigitalocean.app",
)

SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
USE_X_FORWARDED_HOST = True

# Static (admin css/js)
STATIC_URL = "/back/static/"
STATIC_ROOT = os.path.join(BASE_DIR, "staticfiles")

# Whitenoise (DO NOT overwrite middleware; insert it)
if "whitenoise.middleware.WhiteNoiseMiddleware" not in MIDDLEWARE:
    try:
        idx = MIDDLEWARE.index("django.middleware.security.SecurityMiddleware")
        MIDDLEWARE.insert(idx + 1, "whitenoise.middleware.WhiteNoiseMiddleware")
    except ValueError:
        # fallback if SecurityMiddleware not present for some reason
        MIDDLEWARE.insert(0, "whitenoise.middleware.WhiteNoiseMiddleware")

# Optional: compressed static
STATICFILES_STORAGE = "whitenoise.storage.CompressedManifestStaticFilesStorage"

# CORS (usually not needed if same domain; keep if you use it)
CORS_ALLOW_ALL_ORIGINS = env_bool("CORS_ALLOW_ALL_ORIGINS", "0")
CORS_ALLOWED_ORIGINS = env_list("CORS_ALLOWED_ORIGINS", "http://localhost:3000")

# Database
DATABASE_URL = os.getenv("DATABASE_URL", "").strip()
if DATABASE_URL:
    DATABASES = {
        "default": dj_database_url.parse(
            DATABASE_URL,
            conn_max_age=600,
            ssl_require=True,
        )
    }
else:
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

if not DEBUG:
    SECURE_SSL_REDIRECT = True
    SESSION_COOKIE_SECURE = True
    CSRF_COOKIE_SECURE = True