"""Settings for the test suite: `python manage.py test --settings=configuration.settings_test`."""

from .settings import *  # noqa: F401,F403

DATABASES = {"default": {"ENGINE": "django.db.backends.sqlite3", "NAME": ":memory:"}}

CACHES = {"default": {"BACKEND": "django.core.cache.backends.locmem.LocMemCache"}}

PASSWORD_HASHERS = ["django.contrib.auth.hashers.MD5PasswordHasher"]

STORAGES = {
    "default": {"BACKEND": "django.core.files.storage.InMemoryStorage"},
    "staticfiles": {"BACKEND": "django.contrib.staticfiles.storage.StaticFilesStorage"},
}

TELEGRAM_BOT_TOKEN = "test-bot-token"
DEEPSEEK_API_KEY = "test-deepseek-key"
STUDENTS_BULK_CREATE_PATH = ""

LOGGING = {"version": 1, "disable_existing_loggers": False}
