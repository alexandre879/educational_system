"""Messages the backend sends through the school's Telegram bot: login codes and notifications."""

import html
import logging
import time
from collections.abc import Callable, Iterable
from concurrent.futures import ThreadPoolExecutor

import requests
from django.conf import settings
from django.db import connections

from api.bot.emoji import premium_ids
from api.bot.screens import Ctx
from api.bot.texts import normalize_language


logger = logging.getLogger(__name__)

# Builds (HTML text, inline keyboard rows) from the premium emoji ids, or from {} for plain emoji.
MessageBuilder = Callable[[dict[str, str]], tuple[str, list[list[dict]]]]

# Longest we wait when Telegram asks us to slow down.
MAX_RETRY_AFTER = 5

NOTIFICATION_EMOJI = {"announcement": "📣", "exercise": "📚", "exam": "📝", "mark": "⭐"}
# Website pages the "Open" button leads to.
NOTIFICATION_PAGE = {"announcement": "announcement", "exercise": "exercise", "exam": "exam", "mark": "marks"}

_executor = ThreadPoolExecutor(max_workers=2, thread_name_prefix="telegram")


def _post(method: str, payload: dict) -> requests.Response | None:
    try:
        return requests.post(
            f"https://api.telegram.org/bot{settings.TELEGRAM_BOT_TOKEN}/{method}", json=payload, timeout=10
        )
    except requests.RequestException as exc:
        # Don't log the exception itself: its message contains the URL with the bot token.
        logger.error("Telegram %s request failed: %s", method, type(exc).__name__)
        return None


def send_message(chat_id: str, build: MessageBuilder) -> bool:
    """
    Sends an HTML message. If Telegram refuses the premium emoji (say the bot owner's Premium has
    lapsed) it's sent again with plain ones. Returns False (and logs) instead of raising.
    """
    if not settings.TELEGRAM_BOT_TOKEN:
        logger.error("BOT_TOKEN is not configured; cannot send Telegram messages.")
        return False

    ids = premium_ids()
    attempts = [ids, {}] if ids else [{}]
    while attempts:
        text, buttons = build(attempts[0])
        payload = {
            "chat_id": chat_id,
            "text": text,
            "parse_mode": "HTML",
            "link_preview_options": {"is_disabled": True},
        }
        if buttons:
            payload["reply_markup"] = {"inline_keyboard": buttons}

        response = _post("sendMessage", payload)
        if response is None:
            return False
        if response.ok:
            return True

        if response.status_code == 429:
            try:
                wait = response.json().get("parameters", {}).get("retry_after", 1)
            except ValueError:
                wait = 1
            if wait <= MAX_RETRY_AFTER:
                time.sleep(wait)
                continue
        elif response.status_code == 400 and len(attempts) > 1:
            logger.info("Telegram refused premium formatting for chat %s; sending plain emoji.", chat_id)
            attempts.pop(0)
            continue

        logger.warning(
            "Telegram API rejected message to chat %s (%s): %s",
            chat_id,
            response.status_code,
            response.text[:200],
        )
        return False
    return False


def send_login_code(chat_id: str, code: str, language: str) -> bool:
    minutes = max(1, settings.OTP_TTL_SECONDS // 60)

    def build(ids):
        ctx = Ctx(normalize_language(language), ids)
        text = (
            f"{ctx.e('🔐')} <b>{ctx.t('code_title')}</b>\n\n"
            f"<code>{code}</code>\n\n"
            f"{ctx.e('⏳')} {ctx.t('code_hint', minutes=minutes)}"
        )
        return text, [[ctx.button(ctx.t("copy_code"), emoji="🔑", copy=code, style="primary")]]

    return send_message(chat_id, build)


def run_in_background(job: Callable[[], None]) -> None:
    """Runs a Telegram delivery without holding up the request that triggered it."""

    def guarded():
        try:
            job()
        except Exception:
            logger.exception("Telegram delivery failed")
        finally:
            # The worker thread's own database connection (used for the emoji cache).
            connections.close_all()

    _executor.submit(guarded)


def notify(notifications: Iterable) -> None:
    """
    Forwards app notifications (push.Notification) to the people who connected Telegram and kept
    its notifications on, each in the bot's language for them.
    """
    from .models import User

    if not settings.TELEGRAM_BOT_TOKEN:
        return
    notifications = [(set(n.user_ids), n) for n in notifications]
    user_ids = set().union(*(ids for ids, _ in notifications)) if notifications else set()
    if not user_ids:
        return

    recipients = {
        user.pk: user
        for user in User.objects
        .filter(pk__in=user_ids, is_active=True, telegram_notifications=True, chat_id__isnull=False)
        .exclude(chat_id="")
        .only("pk", "chat_id", "telegram_language")
    }

    messages = []
    for ids, notification in notifications:
        for user_id in ids:
            user = recipients.get(user_id)
            if user is None:
                continue
            language = normalize_language(user.telegram_language)
            title, body = notification.build_message(language)
            messages.append((user.chat_id, language, title, body, notification.data or {}))

    if messages:
        run_in_background(lambda: _deliver(messages))


def notification_emoji(data: dict) -> str:
    kind = data.get("type")
    if kind == "attendance":
        return "✅" if data.get("present") else "🚨"
    if kind == "announcement" and data.get("comment"):
        return "💬"
    return NOTIFICATION_EMOJI.get(kind, "🔔")


def _deliver(messages: list[tuple[str, str, str, str, dict]]) -> None:
    for chat_id, language, title, body, data in messages:

        def build(ids, language=language, title=title, body=body, data=data):
            ctx = Ctx(language, ids)
            text = f"{ctx.e(notification_emoji(data))} <b>{html.escape(title)}</b>\n{html.escape(body)}"
            page = NOTIFICATION_PAGE.get(data.get("type"), "home")
            return text, [[ctx.button(ctx.t("open"), emoji="🌐", url=ctx.app_url(page))]]

        send_message(chat_id, build)
