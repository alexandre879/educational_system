"""
Set up spectator mode: the account visitors use when they press "View as spectator" on the login page.

    python manage.py setup_spectator --student nino@school.ge --teacher tamar@school.ge --parent ana@school.ge

Creates the spectator account if there isn't one and links the given people. Spectators then see
the site exactly as those people do, read-only, so pick accounts whose classes don't show anything
private (other students' names, marks). Roles left out keep their current link; run it without
options to see the current setup. The same links can be changed in the admin, on the spectator
account's page, and spectator mode is turned off by unticking that account's "Active".
"""

from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from api.models import User
from api.spectator import views_by_role

DEFAULT_EMAIL = "spectator@blueapp.demo"


class Command(BaseCommand):
    help = "Create the spectator account and choose who spectators view the site as."

    def add_arguments(self, parser):
        for role in User.SPECTATOR_VIEW_ROLES:
            parser.add_argument(f"--{role}", metavar="EMAIL", help=f"Email of the {role} spectators view the site as.")
        parser.add_argument(
            "--email", default=DEFAULT_EMAIL, help=f"Email for the spectator account if it's created (default {DEFAULT_EMAIL})."
        )

    @transaction.atomic
    def handle(self, *args, **options):
        chosen = {str(role): self.person(options[str(role)], role) for role in User.SPECTATOR_VIEW_ROLES if options[str(role)]}

        spectator = User.objects.filter(role=User.Role.SPECTATOR).order_by("id").first()
        if spectator is None:
            if not chosen:
                raise CommandError("There's no spectator account yet. Pass --student, --teacher and/or --parent to create it.")
            if User.objects.filter(email__iexact=options["email"]).exists():
                raise CommandError(f"{options['email']} already belongs to someone else; pass another --email.")
            spectator = User.objects.create_user(email=options["email"], first_name="Spectator", role=User.Role.SPECTATOR)
            self.stdout.write(f"Created the spectator account {spectator.email}.")

        for role, person in chosen.items():
            spectator.spectator_views.remove(*spectator.spectator_views.filter(role=role))
            spectator.spectator_views.add(person)

        if chosen and not spectator.is_active:
            spectator.is_active = True
            spectator.save(update_fields=["is_active"])
            self.stdout.write("Turned spectator mode back on.")

        views = views_by_role(spectator)
        if not spectator.is_active:
            self.stdout.write(self.style.WARNING("Spectator mode is off (the spectator account isn't active)."))
        elif not views:
            self.stdout.write(self.style.WARNING("Spectator mode is off until a student, teacher or parent is linked."))
        for role in User.SPECTATOR_VIEW_ROLES:
            person = views.get(str(role))
            self.stdout.write(f"  {role:<8} {person.email if person else '-'}")

    def person(self, email: str, role: str) -> User:
        person = User.objects.filter(email__iexact=email.strip()).first()
        if person is None:
            raise CommandError(f"No account has the email {email}.")
        if person.role != role:
            raise CommandError(f"{email} is a {person.role or 'user without a role'}, not a {role}.")
        if not person.is_active:
            raise CommandError(f"{email} isn't active.")
        return person
