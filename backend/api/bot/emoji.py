"""
Animated premium emoji for the bot's messages and buttons.

Telegram's own "RestrictedEmoji" pack has an animated version of almost every standard emoji, so
the bot looks each emoji up there (once a day, shared through the cache) instead of hard-coding
IDs. Telegram only renders them while the bot's owner has Premium; everything falls back to the
plain emoji when a lookup fails or the feature is off.
"""

import html
import logging
import re

import requests
from django.conf import settings
from django.core.cache import cache


logger = logging.getLogger(__name__)

# Later packs only fill in what earlier ones lack.
PACKS = ("RestrictedEmoji", "NewsEmoji")
CACHE_KEY = "telegram:premium-emoji:v1"
CACHE_SECONDS = 24 * 60 * 60
# After a failed lookup, try again a little later rather than on every message.
RETRY_SECONDS = 10 * 60

VARIATION_SELECTOR = "️"
TG_EMOJI = re.compile(r'<tg-emoji emoji-id="\d+">(.*?)</tg-emoji>', re.DOTALL)


def _key(emoji: str) -> str:
    return emoji.replace(VARIATION_SELECTOR, "")


def _fetch() -> dict[str, str]:
    ids: dict[str, str] = {}
    base = f"https://api.telegram.org/bot{settings.TELEGRAM_BOT_TOKEN}"
    for name in PACKS:
        try:
            response = requests.get(f"{base}/getStickerSet", params={"name": name}, timeout=10)
            stickers = response.json()["result"]["stickers"]
        except (requests.RequestException, ValueError, KeyError) as exc:
            # The exception text can contain the URL, and with it the bot token.
            logger.warning("Couldn't load the %s emoji pack: %s", name, type(exc).__name__)
            continue
        for sticker in stickers:
            if sticker.get("emoji") and sticker.get("custom_emoji_id"):
                ids.setdefault(_key(sticker["emoji"]), sticker["custom_emoji_id"])
    return ids


def premium_ids() -> dict[str, str]:
    """Standard emoji → custom emoji id; empty when premium emoji are off or unavailable."""
    if not settings.TELEGRAM_PREMIUM_EMOJI or not settings.TELEGRAM_BOT_TOKEN:
        return {}
    ids = cache.get(CACHE_KEY)
    if ids is None:
        ids = _fetch()
        cache.set(CACHE_KEY, ids, timeout=CACHE_SECONDS if ids else RETRY_SECONDS)
    return ids


def e(emoji: str, ids: dict[str, str] | None = None) -> str:
    """The emoji for an HTML message: animated when possible, plain otherwise."""
    custom_id = (premium_ids() if ids is None else ids).get(_key(emoji))
    if not custom_id:
        return emoji
    return f'<tg-emoji emoji-id="{custom_id}">{html.escape(emoji)}</tg-emoji>'


def icon(emoji: str, ids: dict[str, str] | None = None) -> str | None:
    """Custom emoji id for a button's icon, if there is one."""
    return (premium_ids() if ids is None else ids).get(_key(emoji))


def strip_premium(text: str) -> str:
    """The same HTML with plain emoji, for when Telegram refuses the animated ones."""
    return TG_EMOJI.sub(lambda match: html.unescape(match.group(1)), text)
