import os

import django
from django.core.management import call_command


if __name__ == "__main__":
    os.environ.setdefault("DJANGO_SETTINGS_MODULE", "configuration.settings")
    django.setup()
    call_command("telegram_bot")
