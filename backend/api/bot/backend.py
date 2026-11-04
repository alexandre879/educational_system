"""
The bot reads and changes school data through the same API views the apps use, run in-process as
the linked person. Permissions, role rules and payloads therefore match the apps exactly.
"""

from dataclasses import dataclass
from typing import Any

from django.urls import resolve
from rest_framework.test import APIRequestFactory, force_authenticate

from api.models import User


_factory = APIRequestFactory()


@dataclass
class Result:
    status: int
    data: Any

    @property
    def ok(self) -> bool:
        return 200 <= self.status < 300


def call(user: User, path: str, *, params: dict | None = None, data: dict | None = None, language: str = "ka") -> Result:
    """GET (or POST, when `data` is given) /api/<path> as `user`."""
    url = f"/api/{path.lstrip('/')}"
    if data is None:
        request = _factory.get(url, {k: v for k, v in (params or {}).items() if v is not None})
    else:
        request = _factory.post(url, data, format="json")
    # Normally set by LocaleMiddleware, which doesn't run here.
    request.LANGUAGE_CODE = language
    force_authenticate(request, user=user)

    match = resolve(url)
    response = match.func(request, *match.args, **match.kwargs)
    return Result(response.status_code, getattr(response, "data", None))


def user_for_chat(chat_id: int | str) -> User | None:
    return User.objects.filter(chat_id=str(chat_id), is_active=True).select_related("grade_in__category").first()
