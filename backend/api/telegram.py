import logging

import requests
from django.conf import settings


logger = logging.getLogger(__name__)


def tg_send(chat_id: str, text: str) -> bool:
    """Send a Telegram message. Returns False (and logs) instead of raising on failure."""
    token = settings.TELEGRAM_BOT_TOKEN
    if not token:
        logger.error("BOT_TOKEN is not configured; cannot send Telegram messages.")
        return False

    try:
        response = requests.post(
            f"https://api.telegram.org/bot{token}/sendMessage",
            json={"chat_id": chat_id, "text": text},
            timeout=10,
        )
    except requests.RequestException as exc:
        # Don't log the exception itself: its message contains the URL with the bot token.
        logger.error("Telegram request to chat %s failed: %s", chat_id, type(exc).__name__)
        return False

    if not response.ok:
        logger.warning(
            "Telegram API rejected message to chat %s (%s): %s",
            chat_id,
            response.status_code,
            response.text[:200],
        )
        return False

    return True
