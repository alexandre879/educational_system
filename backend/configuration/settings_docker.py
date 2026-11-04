import os

import dj_database_url
from django.core.exceptions import ImproperlyConfigured

from .settings import *  # noqa: F401,F403
from .settings import MIDDLEWARE, STORAGES, env_bool, env_list

DEBUG = env_bool("DJANGO_DEBUG", default=False)

SECRET_KEY = os.getenv("DJANGO_SECRET_KEY", "")
if not SECRET_KEY:
    raise ImproperlyConfigured("DJANGO_SECRET_KEY must be set.")

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

# Static (admin css/js), served by WhiteNoise
STATIC_URL = "/back/static/"

if "whitenoise.middleware.WhiteNoiseMiddleware" not in MIDDLEWARE:
    idx = MIDDLEWARE.index("django.middleware.security.SecurityMiddleware")
    MIDDLEWARE.insert(idx + 1, "whitenoise.middleware.WhiteNoiseMiddleware")

STORAGES = {
    **STORAGES,
    "staticfiles": {"BACKEND": "whitenoise.storage.CompressedStaticFilesStorage"},
}

CORS_ALLOW_ALL_ORIGINS = env_bool("CORS_ALLOW_ALL_ORIGINS", default=False)
CORS_ALLOWED_ORIGINS = env_list("CORS_ALLOWED_ORIGINS", "http://localhost:3000")

# Managed databases (DATABASE_URL) require SSL; the compose `db` service does not.
DATABASE_URL = os.getenv("DATABASE_URL", "").strip()
if DATABASE_URL:
    DATABASES = {
        "default": dj_database_url.parse(DATABASE_URL, conn_max_age=600, ssl_require=True)
    }

# DJANGO_FORCE_HTTPS=0 lets a production build run over plain HTTP (e.g. a local Kubernetes cluster).
if not DEBUG and env_bool("DJANGO_FORCE_HTTPS", default=True):
    SECURE_SSL_REDIRECT = True
    SESSION_COOKIE_SECURE = True
    CSRF_COOKIE_SECURE = True
