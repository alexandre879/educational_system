import os
import django

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "configuration.settings")
django.setup()

from api.bot.telegram_bot import run_bot

if __name__ == "__main__":
    run_bot() 
