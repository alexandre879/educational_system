"""
Spectator mode: visitors without an account look around the site read-only.

The spectator account is linked to one student, one teacher and one parent (`User.spectator_views`).
Its tokens name the one being looked at, and every request then runs as that person, so each page
shows exactly what they see. Anything that would change data is refused.
"""

from rest_framework.exceptions import AuthenticationFailed, PermissionDenied
from rest_framework.permissions import SAFE_METHODS
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.tokens import RefreshToken

from .models import User

# Claim in a spectator's tokens: the id of the account they're viewing the site as.
VIEW_AS_CLAIM = "view_as"
READ_ONLY_CODE = "spectator_read_only"


class SpectatorReadOnly(PermissionDenied):
    default_detail = "Spectators can only look around; changes are turned off."

    def __init__(self):
        # A `code` in the body lets the apps tell this apart from an ordinary 403.
        super().__init__({"detail": self.default_detail, "code": READ_ONLY_CODE})


def spectator_account() -> User | None:
    return User.objects.filter(role=User.Role.SPECTATOR, is_active=True).order_by("id").first()


def views_by_role(spectator: User) -> dict[str, User]:
    """The accounts a spectator can view the site as, one per role, in student/teacher/parent order."""
    linked = spectator.spectator_views.filter(is_active=True, role__in=User.SPECTATOR_VIEW_ROLES).order_by("id")
    by_role: dict[str, User] = {}
    for person in linked:
        by_role.setdefault(person.role, person)
    return {str(role): by_role[role] for role in User.SPECTATOR_VIEW_ROLES if role in by_role}


def tokens_for(spectator: User, target: User) -> dict[str, str]:
    refresh = RefreshToken.for_user(spectator)
    # Set before deriving the access token: it copies the refresh token's claims.
    refresh[VIEW_AS_CLAIM] = target.pk
    return {"access": str(refresh.access_token), "refresh": str(refresh)}


class SpectatorAwareJWTAuthentication(JWTAuthentication):
    """
    JWT authentication where a spectator's request runs as the account named in its token.

    Only reading methods get through, except on views that set `spectator_write_allowed`
    (logging out). It's enforced here rather than in a permission class so that views with
    their own `permission_classes` are covered too.
    """

    def authenticate(self, request):
        result = super().authenticate(request)
        if result is None:
            return None

        user, token = result
        if user.role != User.Role.SPECTATOR:
            return result

        target = user.spectator_views.filter(
            pk=token.get(VIEW_AS_CLAIM), is_active=True, role__in=User.SPECTATOR_VIEW_ROLES
        ).first()
        if target is None:
            raise AuthenticationFailed("This spectator view is no longer available.", code="spectator_view_unavailable")

        view = (request.parser_context or {}).get("view")
        if request.method not in SAFE_METHODS and not getattr(view, "spectator_write_allowed", False):
            raise SpectatorReadOnly()

        target.spectating_from = user
        return target, token
