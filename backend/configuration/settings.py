"""
Django settings for the educational system backend.

All deployment-specific values come from environment variables, which are loaded
from ``backend/.env`` during local development. See ``backend/.env.example``.
"""

import os
from datetime import timedelta
from pathlib import Path

import dj_database_url
from django.core.exceptions import ImproperlyConfigured
from django.utils.translation import gettext_lazy as _
from dotenv import load_dotenv


BASE_DIR = Path(__file__).resolve().parent.parent
# Real environment variables (e.g. from docker-compose) win over the .env file.
load_dotenv(BASE_DIR / ".env")


def env_bool(name: str, default: bool = False) -> bool:
    value = os.getenv(name)
    if value is None or not value.strip():
        return default
    return value.strip().lower() in {"1", "true", "yes", "on"}


def env_int(name: str, default: int) -> int:
    value = os.getenv(name)
    try:
        return int(value) if value else default
    except ValueError:
        return default


def env_list(name: str, default: str = "") -> list[str]:
    return [item.strip() for item in os.getenv(name, default).split(",") if item.strip()]


# ---------------------------------------------------------------------------
# Core
# ---------------------------------------------------------------------------

DEBUG = env_bool("DJANGO_DEBUG", default=True)

SECRET_KEY = os.getenv("DJANGO_SECRET_KEY", "")
if not SECRET_KEY:
    if not DEBUG:
        raise ImproperlyConfigured("DJANGO_SECRET_KEY must be set when DEBUG is off.")
    SECRET_KEY = "django-insecure-local-development-only"

# This computer's current network IP (set by ../set-dev-ip.sh) so phones and other
# devices on the same Wi-Fi/hotspot can reach the dev servers.
NET_IP = os.getenv("NET_IP")

ALLOWED_HOSTS = env_list("DJANGO_ALLOWED_HOSTS", "localhost,127.0.0.1")
if NET_IP:
    ALLOWED_HOSTS.append(NET_IP)
if DEBUG:
    # Local development: phones reach `runserver` via whatever Wi-Fi/hotspot IP the
    # computer has at the moment, which changes between networks.
    ALLOWED_HOSTS.append("*")

CORS_ALLOW_ALL_ORIGINS = env_bool("CORS_ALLOW_ALL_ORIGINS", default=DEBUG)
CORS_ALLOWED_ORIGINS = env_list("CORS_ALLOWED_ORIGINS", "http://localhost:3000")
if NET_IP:
    CORS_ALLOWED_ORIGINS.append(f"http://{NET_IP}:3000")

LOCALE_PATHS = [BASE_DIR / "locale"]


# ---------------------------------------------------------------------------
# Application definition
# ---------------------------------------------------------------------------

INSTALLED_APPS = [
    # Admin theme; must come before django.contrib.admin. Configured in UNFOLD below.
    "unfold",
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "rest_framework_simplejwt.token_blacklist",
    "storages",
    "corsheaders",
    "rest_framework",
    "api",
]

MIDDLEWARE = [
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.security.SecurityMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.locale.LocaleMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "configuration.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [BASE_DIR / "templates"],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "configuration.wsgi.application"


# ---------------------------------------------------------------------------
# Database
# ---------------------------------------------------------------------------

DATABASE_URL = os.getenv("DATABASE_URL", "").strip()
if DATABASE_URL:
    DATABASES = {"default": dj_database_url.parse(DATABASE_URL, conn_max_age=600)}
else:
    DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.postgresql",
            "NAME": os.getenv("DB_NAME", "django_db"),
            "USER": os.getenv("DB_USER", "django_user"),
            "PASSWORD": os.getenv("DB_PASSWORD", ""),
            "HOST": os.getenv("DB_HOST", "localhost"),
            "PORT": os.getenv("DB_PORT", "5432"),
            "CONN_MAX_AGE": 60,
            "CONN_HEALTH_CHECKS": True,
        }
    }

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

AUTH_USER_MODEL = "api.User"

AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]


# ---------------------------------------------------------------------------
# Cache
# ---------------------------------------------------------------------------

# OTP codes live in the cache, so it must be shared by every worker/instance.
# The table is created by migration 0026.
CACHES = {
    "default": {
        "BACKEND": "django.core.cache.backends.db.DatabaseCache",
        "LOCATION": "django_cache",
    }
}


# ---------------------------------------------------------------------------
# Internationalization
# ---------------------------------------------------------------------------

LANGUAGE_CODE = "ru"
TIME_ZONE = "Asia/Tbilisi"
USE_I18N = True
USE_TZ = True

LANGUAGES = [
    ("en", _("English")),
    ("ka", _("Georgian")),
    ("ru", _("Russian")),
]


# ---------------------------------------------------------------------------
# Static & media files
# ---------------------------------------------------------------------------

STATIC_URL = "static/"
STATIC_ROOT = BASE_DIR / "staticfiles"

STORAGES = {
    "default": {
        "BACKEND": os.getenv("DEFAULT_FILE_STORAGE", "django.core.files.storage.FileSystemStorage"),
    },
    "staticfiles": {
        "BACKEND": "django.contrib.staticfiles.storage.StaticFilesStorage",
    },
}

AWS_ACCESS_KEY_ID = os.getenv("AWS_ACCESS_KEY_ID")
AWS_SECRET_ACCESS_KEY = os.getenv("AWS_SECRET_ACCESS_KEY")
AWS_STORAGE_BUCKET_NAME = os.getenv("AWS_STORAGE_BUCKET_NAME")
AWS_S3_REGION_NAME = os.getenv("AWS_REGION_NAME")
AWS_QUERYSTRING_AUTH = False

if AWS_STORAGE_BUCKET_NAME and AWS_S3_REGION_NAME:
    MEDIA_URL = f"https://{AWS_STORAGE_BUCKET_NAME}.s3.{AWS_S3_REGION_NAME}.amazonaws.com/"
else:
    MEDIA_URL = "media/"
    MEDIA_ROOT = BASE_DIR / "media"


# ---------------------------------------------------------------------------
# REST framework / auth
# ---------------------------------------------------------------------------

REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": (
        "rest_framework_simplejwt.authentication.JWTAuthentication",
    ),
    # Endpoints are private unless a view explicitly opts out.
    "DEFAULT_PERMISSION_CLASSES": (
        "rest_framework.permissions.IsAuthenticated",
    ),
    "DEFAULT_THROTTLE_RATES": {
        "ai_support": os.getenv("AI_SUPPORT_RATE", "60/hour"),
    },
}

SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(days=1),
    # Each refresh returns a new refresh token and blacklists the old one, so an
    # active (mobile) session keeps going while a stolen token soon stops working.
    "REFRESH_TOKEN_LIFETIME": timedelta(days=env_int("REFRESH_TOKEN_LIFETIME_DAYS", 30)),
    "ROTATE_REFRESH_TOKENS": True,
    "BLACKLIST_AFTER_ROTATION": True,
}


# ---------------------------------------------------------------------------
# Integrations
# ---------------------------------------------------------------------------

TELEGRAM_BOT_TOKEN = os.getenv("BOT_TOKEN", "")
# People with a linked Telegram also get their notifications there (each can turn it off in the bot).
TELEGRAM_NOTIFICATIONS_ENABLED = env_bool("TELEGRAM_NOTIFICATIONS_ENABLED", default=True)
# Animated premium emoji in the bot's messages. Telegram shows them while the bot's owner has Premium.
TELEGRAM_PREMIUM_EMOJI = env_bool("TELEGRAM_PREMIUM_EMOJI", default=True)
# The website, for the "Open" buttons under Telegram messages.
WEBSITE_URL = os.getenv("WEBSITE_URL", "https://blueapp.store").rstrip("/")

OTP_TTL_SECONDS = env_int("OTP_TIMEOUT", 300)
OTP_RESEND_COOLDOWN_SECONDS = env_int("OTP_RATE_LIMIT", 30)
OTP_MAX_ATTEMPTS = env_int("OTP_MAX_ATTEMPTS", 5)

DEEPSEEK_API_KEY = os.getenv("DEEPSEEK_API_KEY", "")
DEEPSEEK_MODEL = os.getenv("DEEPSEEK_MODEL", "deepseek-chat")

# Mobile push notifications via Expo. The access token is only needed when
# "enhanced push security" is enabled for the Expo project.
PUSH_NOTIFICATIONS_ENABLED = env_bool("PUSH_NOTIFICATIONS_ENABLED", default=True)
EXPO_ACCESS_TOKEN = os.getenv("EXPO_ACCESS_TOKEN", "")

# Secret path for the admin-only bulk student import endpoint (disabled if unset).
STUDENTS_BULK_CREATE_PATH = os.getenv("FOR_STUDENTS_API", "")

# Crash reporting: errors go to Sentry only when SENTRY_DSN is set.
SENTRY_DSN = os.getenv("SENTRY_DSN", "")
if SENTRY_DSN:
    import sentry_sdk

    sentry_sdk.init(
        dsn=SENTRY_DSN,
        environment=os.getenv("SENTRY_ENVIRONMENT", "development" if DEBUG else "production"),
        traces_sample_rate=float(os.getenv("SENTRY_TRACES_SAMPLE_RATE", "0.1")),
        send_default_pii=False,
    )


# ---------------------------------------------------------------------------
# Admin look (django-unfold): the app's blue, its icon, sidebar and dashboard
# ---------------------------------------------------------------------------

UNFOLD = {
    "SITE_TITLE": "Blueapp",
    "SITE_HEADER": "Blueapp",
    "SITE_SUBHEADER": _("School administration"),
    "SITE_URL": os.getenv("ADMIN_SITE_URL", "https://blueapp.store"),
    "SITE_ICON": "api.admin_ui.site_icon",
    "SITE_FAVICONS": "api.admin_ui.site_favicons",
    "SHOW_LANGUAGES": True,
    "SHOW_HISTORY": True,
    "BORDER_RADIUS": "10px",
    "ENVIRONMENT": "api.admin_ui.environment_callback",
    "DASHBOARD_CALLBACK": "api.admin_ui.dashboard_callback",
    "COLORS": {
        # Tailwind blue: the 500 shade is the app's #1677FF.
        "primary": {
            "50": "oklch(97% .014 254.604)",
            "100": "oklch(93.2% .032 255.585)",
            "200": "oklch(88.2% .059 254.128)",
            "300": "oklch(80.9% .105 251.813)",
            "400": "oklch(70.7% .165 254.624)",
            "500": "oklch(62.3% .214 259.815)",
            "600": "oklch(54.6% .245 262.881)",
            "700": "oklch(48.8% .243 264.376)",
            "800": "oklch(42.4% .199 265.638)",
            "900": "oklch(37.9% .146 265.522)",
            "950": "oklch(28.2% .091 267.935)",
        },
    },
    "SIDEBAR": {
        "show_search": True,
        "show_all_applications": True,
        "navigation": "api.admin_ui.sidebar_navigation",
    },
}


LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "handlers": {"console": {"class": "logging.StreamHandler"}},
    "root": {"handlers": ["console"], "level": "WARNING"},
    "loggers": {
        "django": {"handlers": ["console"], "level": "INFO", "propagate": False},
        "api": {"level": "INFO"},
    },
}
