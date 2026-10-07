"""Push notifications to the mobile app through Expo's push service."""

import logging
from collections import defaultdict
from collections.abc import Callable, Iterable
from dataclasses import dataclass

import requests
from django.conf import settings


logger = logging.getLogger(__name__)

EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send"
# Expo accepts at most 100 messages per request.
BATCH_SIZE = 100

DEFAULT_LANGUAGE = "ka"

# Builds (title, body) in the device's language.
MessageBuilder = Callable[[str], tuple[str, str]]


TEXTS = {
    "announcement": {"en": "New announcement", "ka": "ახალი განცხადება", "ru": "Новое объявление"},
    "exercise": {"en": "New exercise", "ka": "ახალი დავალება", "ru": "Новое задание"},
    "comment": {"en": "New comment", "ka": "ახალი კომენტარი", "ru": "Новый комментарий"},
    "exam": {"en": "New exam", "ka": "ახალი გამოცდა", "ru": "Новый экзамен"},
    "mark": {"en": "New mark", "ka": "ახალი ნიშანი", "ru": "Новая оценка"},
    "present": {"en": "Attended the lesson", "ka": "გამოცხადდა გაკვეთილზე", "ru": "Присутствовал(а) на уроке"},
    "absent": {"en": "Missed the lesson", "ka": "არ გამოცხადდა გაკვეთილზე", "ru": "Отсутствовал(а) на уроке"},
}


def text(key: str, language: str) -> str:
    options = TEXTS[key]
    return options.get(language) or options[DEFAULT_LANGUAGE]


@dataclass
class Notification:
    user_ids: Iterable[int]
    build_message: MessageBuilder
    data: dict | None = None


def notify_users(user_ids: Iterable[int], build_message: MessageBuilder, data: dict | None = None) -> None:
    """Send one notification to every registered device of the given users."""
    send([Notification(user_ids, build_message, data)])


def send(notifications: Iterable[Notification]) -> None:
    """
    Deliver several notifications using as few HTTP requests as possible.
    Never raises: failures are logged so callers (usually request handlers) are unaffected.
    """
    from .models import PushDevice

    if not settings.PUSH_NOTIFICATIONS_ENABLED:
        return

    notifications = [(set(n.user_ids), n) for n in notifications]
    all_user_ids = set().union(*(ids for ids, _ in notifications)) if notifications else set()
    if not all_user_ids:
        return

    devices_by_user: dict[int, list[tuple[str, str]]] = defaultdict(list)
    for user_id, token, language in PushDevice.objects.filter(user_id__in=all_user_ids).values_list(
        "user_id", "token", "language"
    ):
        devices_by_user[user_id].append((token, language or DEFAULT_LANGUAGE))

    messages = []
    for user_ids, notification in notifications:
        for user_id in user_ids:
            for token, language in devices_by_user.get(user_id, []):
                title, body = notification.build_message(language)
                messages.append(
                    {
                        "to": token,
                        "title": title,
                        "body": body,
                        "data": notification.data or {},
                        "sound": "default",
                    }
                )

    for start in range(0, len(messages), BATCH_SIZE):
        _send_batch(messages[start:start + BATCH_SIZE])


def _send_batch(messages: list[dict]) -> None:
    from .models import PushDevice

    headers = {"Accept": "application/json", "Content-Type": "application/json"}
    if settings.EXPO_ACCESS_TOKEN:
        headers["Authorization"] = f"Bearer {settings.EXPO_ACCESS_TOKEN}"

    try:
        response = requests.post(EXPO_PUSH_URL, json=messages, headers=headers, timeout=10)
    except requests.RequestException as exc:
        logger.error("Expo push request failed: %s", type(exc).__name__)
        return

    if not response.ok:
        logger.warning("Expo push API returned %s: %s", response.status_code, response.text[:300])
        return

    try:
        tickets = response.json().get("data", [])
    except ValueError:
        logger.warning("Expo push API returned invalid JSON")
        return

    # Tickets come back in the same order as the messages.
    stale_tokens = [
        message["to"]
        for message, ticket in zip(messages, tickets)
        if ticket.get("status") == "error"
        and (ticket.get("details") or {}).get("error") == "DeviceNotRegistered"
    ]
    if stale_tokens:
        PushDevice.objects.filter(token__in=stale_tokens).delete()

    for ticket in tickets:
        if ticket.get("status") == "error":
            logger.info("Expo push ticket error: %s", ticket.get("message"))
