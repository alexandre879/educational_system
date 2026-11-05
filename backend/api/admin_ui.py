"""
The admin's look and dashboard (django-unfold). Settings point here by import path;
see UNFOLD in configuration/settings.py.
"""

import json
from datetime import timedelta
from typing import Any

from django.conf import settings
from django.contrib.auth.models import Group
from django.db.models import Avg, Count, Q, Sum
from django.http import HttpRequest
from django.template.loader import render_to_string
from django.templatetags.static import static
from django.urls import reverse, reverse_lazy
from django.utils import timezone
from django.utils.formats import date_format
from django.utils.html import format_html
from django.utils.safestring import mark_safe
from django.utils.text import capfirst
from django.utils.translation import gettext_lazy as _
from rest_framework_simplejwt.token_blacklist.models import BlacklistedToken, OutstandingToken

from .models import (
    Announcement,
    Comment,
    DailyExercise,
    Exam,
    ExerciseCompletion,
    Grade,
    GradeCategory,
    LessonAttendance,
    Mark,
    Option,
    ParentStudent,
    PushDevice,
    Question,
    Subject,
    SubjectBook,
    User,
    UserAnswer,
    UserExamSession,
    UserSubjectPoints,
    WeeklyLesson,
    visible_comment_count,
)
from .translation import get_localized_json_value

BRAND_ICON = "api/brand/icon.png"


def site_icon(request: HttpRequest) -> str:
    return static(BRAND_ICON)


def site_favicons(request: HttpRequest) -> list[dict[str, str]]:
    return [{"rel": "icon", "sizes": "128x128", "type": "image/png", "href": static(BRAND_ICON)}]


def environment_callback(request: HttpRequest) -> list:
    """A badge next to the title so nobody mistakes the test server for the real one."""
    return [_("Development"), "warning"] if settings.DEBUG else [_("Production"), "danger"]


# ---------------------------------------------------------------------------
# Sidebar
# ---------------------------------------------------------------------------

def _model_link(model, icon: str) -> dict[str, Any]:
    opts = model._meta

    def can_view(request: HttpRequest) -> bool:
        return request.user.has_perm(f"{opts.app_label}.view_{opts.model_name}") or request.user.has_perm(
            f"{opts.app_label}.change_{opts.model_name}"
        )

    return {
        "title": capfirst(opts.verbose_name_plural),
        "icon": icon,
        "link": reverse_lazy(f"admin:{opts.app_label}_{opts.model_name}_changelist"),
        "permission": can_view,
    }


def sidebar_navigation(request: HttpRequest) -> list[dict[str, Any]]:
    """Models grouped the way the school thinks about them, with Material Symbols icons."""
    return [
        {
            "items": [{"title": _("Dashboard"), "icon": "space_dashboard", "link": reverse_lazy("admin:index")}],
        },
        {
            "title": _("People"),
            "separator": True,
            "items": [
                _model_link(User, "person"),
                _model_link(ParentStudent, "family_restroom"),
                _model_link(Group, "group"),
            ],
        },
        {
            "title": _("School"),
            "separator": True,
            "items": [
                _model_link(GradeCategory, "category"),
                _model_link(Grade, "school"),
                _model_link(Subject, "menu_book"),
                _model_link(WeeklyLesson, "calendar_month"),
                _model_link(SubjectBook, "library_books"),
            ],
        },
        {
            "title": _("Daily work"),
            "separator": True,
            "items": [
                _model_link(DailyExercise, "assignment"),
                _model_link(ExerciseCompletion, "task_alt"),
                _model_link(Mark, "grade"),
                _model_link(LessonAttendance, "how_to_reg"),
            ],
        },
        {
            "title": _("Exams"),
            "separator": True,
            "items": [
                _model_link(Exam, "quiz"),
                _model_link(Question, "help"),
                _model_link(Option, "checklist"),
                _model_link(UserExamSession, "timer"),
                _model_link(UserAnswer, "fact_check"),
                _model_link(UserSubjectPoints, "leaderboard"),
            ],
        },
        {
            "title": _("Communication"),
            "separator": True,
            "items": [
                _model_link(Announcement, "campaign"),
                _model_link(Comment, "forum"),
                _model_link(PushDevice, "smartphone"),
            ],
        },
        {
            "title": _("Security"),
            "separator": True,
            "collapsible": True,
            "items": [
                _model_link(OutstandingToken, "key"),
                _model_link(BlacklistedToken, "block"),
            ],
        },
    ]


# ---------------------------------------------------------------------------
# Dashboard
# ---------------------------------------------------------------------------

def _percent(part: float, whole: float) -> int | None:
    return round(100 * part / whole) if whole else None


def _label(text: str, variant: str) -> str:
    return mark_safe(render_to_string("unfold/helpers/label.html", {"text": text, "variant": variant}))


def mark_variant(value: int) -> str:
    """Marks are 1–10: 9–10 excellent, 7–8 good, 5–6 fair, lower needs attention."""
    if value >= 9:
        return "success"
    if value >= 7:
        return "info"
    if value >= 5:
        return "warning"
    return "danger"


def attendance_variant(percent: int) -> str:
    """A day's attendance: 90%+ is good, 75–89% worth a look, lower is a problem."""
    if percent >= 90:
        return "success"
    if percent >= 75:
        return "warning"
    return "danger"


# Bar colours for each badge variant (the 500 shades of the badges' green/blue/orange/red),
# so a chart reads the same way as the coloured badges in the lists.
TONE_COLORS = {"success": "#22c55e", "info": "#3b82f6", "warning": "#f97316", "danger": "#ef4444"}


def _changelist(model, query: str = "") -> str:
    opts = model._meta
    url = reverse(f"admin:{opts.app_label}_{opts.model_name}_changelist")
    return f"{url}?{query}" if query else url


def _headcount() -> list[dict[str, Any]]:
    roles = dict(User.objects.order_by().values("role").annotate(n=Count("id")).values_list("role", "n"))
    return [
        {"title": _("Students"), "value": roles.get(User.Role.STUDENT, 0), "icon": "school",
         "link": _changelist(User, "role__exact=student")},
        {"title": _("Teachers"), "value": roles.get(User.Role.TEACHER, 0), "icon": "co_present",
         "link": _changelist(User, "role__exact=teacher")},
        {"title": _("Parents"), "value": roles.get(User.Role.PARENT, 0), "icon": "family_restroom",
         "link": _changelist(User, "role__exact=parent")},
        {"title": Grade._meta.verbose_name_plural, "value": Grade.objects.count(), "icon": "groups",
         "link": _changelist(Grade)},
        {"title": Subject._meta.verbose_name_plural, "value": Subject.objects.count(), "icon": "menu_book",
         "link": _changelist(Subject)},
        {"title": Exam._meta.verbose_name_plural, "value": Exam.objects.count(), "icon": "quiz",
         "link": _changelist(Exam)},
    ]


def _this_week(since) -> list[dict[str, Any]]:
    marks = Mark.objects.filter(date__gte=since).aggregate(n=Count("id"), avg=Avg("value"))

    attendance = LessonAttendance.objects.filter(date__gte=since).aggregate(
        total=Count("id"), present=Count("id", filter=Q(is_present=True))
    )

    # Homework set this week: how many of the expected ticks (one per student in the class) arrived.
    exercises = dict(DailyExercise.objects.filter(date__gte=since).values_list("id", "grade_id"))
    class_sizes = dict(
        User.objects.filter(role=User.Role.STUDENT, grade_in_id__in=set(exercises.values()))
        .order_by().values("grade_in_id").annotate(n=Count("id")).values_list("grade_in_id", "n")
    )
    expected = sum(class_sizes.get(grade_id, 0) for grade_id in exercises.values())
    completed = ExerciseCompletion.objects.filter(exercise_id__in=exercises.keys()).count()

    # Exams finished this week, as a share of the points available.
    sessions = list(
        UserExamSession.objects.filter(finished=True, submitted_at__date__gte=since).values_list("exam_id", "score_so_far")
    )
    max_scores = dict(
        Question.objects.filter(exam_id__in={exam_id for exam_id, _score in sessions})
        .order_by().values("exam_id").annotate(total=Sum("points")).values_list("exam_id", "total")
    )
    scored = [score / max_scores[exam_id] for exam_id, score in sessions if max_scores.get(exam_id)]

    attendance_rate = _percent(attendance["present"], attendance["total"])
    homework_rate = _percent(completed, expected)
    exam_rate = round(100 * sum(scored) / len(scored)) if scored else None

    return [
        {
            "title": _("Marks given"),
            "value": marks["n"],
            "detail": _("Average %(avg).1f") % {"avg": marks["avg"]} if marks["avg"] is not None else "—",
            "progress": round(marks["avg"] * 10) if marks["avg"] is not None else None,
            "icon": "grade",
            "link": _changelist(Mark, f"date__gte={since.isoformat()}"),
        },
        {
            "title": _("Attendance"),
            "value": f"{attendance_rate}%" if attendance_rate is not None else "—",
            "detail": _("%(present)d of %(total)d lessons") % attendance,
            "progress": attendance_rate,
            "icon": "how_to_reg",
            "link": _changelist(LessonAttendance, f"date__gte={since.isoformat()}"),
        },
        {
            "title": _("Homework done"),
            "value": f"{homework_rate}%" if homework_rate is not None else "—",
            "detail": _("%(count)d assignments") % {"count": len(exercises)},
            "progress": homework_rate,
            "icon": "task_alt",
            "link": _changelist(DailyExercise, f"date__gte={since.isoformat()}"),
        },
        {
            "title": _("Exam results"),
            "value": f"{exam_rate}%" if exam_rate is not None else "—",
            "detail": _("%(count)d finished") % {"count": len(sessions)},
            "progress": exam_rate,
            "icon": "quiz",
            "link": _changelist(UserExamSession, "finished__exact=1"),
        },
    ]


# Unfold draws hairline bars by default; a dashboard reads better with real columns.
CHART_BARS = {"maxBarThickness": 28, "borderRadius": 6}


def _attendance_chart(today) -> str:
    days = (
        LessonAttendance.objects.filter(date__gt=today - timedelta(days=14), date__lte=today)
        .order_by("date").values("date")
        .annotate(total=Count("id"), present=Count("id", filter=Q(is_present=True)))
    )
    rates = [_percent(day["present"], day["total"]) for day in days]
    return json.dumps({
        "labels": [date_format(day["date"], "D j") for day in days],
        "datasets": [{
            "label": str(_("Present, %")),
            "data": rates,
            "backgroundColor": [TONE_COLORS[attendance_variant(rate)] for rate in rates],
            **CHART_BARS,
        }],
    })


def _marks_chart(today) -> str:
    counts = dict(
        Mark.objects.filter(date__gt=today - timedelta(days=30))
        .order_by().values("value").annotate(n=Count("id")).values_list("value", "n")
    )
    return json.dumps({
        "labels": [str(value) for value in range(1, 11)],
        "datasets": [{
            "label": str(_("Marks")),
            "data": [counts.get(value, 0) for value in range(1, 11)],
            # Each mark in the colour of its badge: red 1–4, orange 5–6, blue 7–8, green 9–10.
            "backgroundColor": [TONE_COLORS[mark_variant(value)] for value in range(1, 11)],
            **CHART_BARS,
        }],
    })


def _latest_marks(lang: str) -> dict[str, Any]:
    marks = Mark.objects.select_related("student", "subject", "teacher").order_by("-date", "-created_at")[:8]
    return {
        "headers": [_("Student"), _("Subject"), _("Mark"), _("Date")],
        "rows": [
            [
                format_html('<a class="text-primary-600 dark:text-primary-500" href="{}">{}</a>',
                            reverse("admin:api_mark_change", args=[mark.pk]),
                            mark.student.get_full_name() or mark.student.email),
                get_localized_json_value(mark.subject.name, lang),
                _label(str(mark.value), mark_variant(mark.value)),
                date_format(mark.date, "j M"),
            ]
            for mark in marks
        ],
    }


def _latest_announcements() -> dict[str, Any]:
    announcements = (
        Announcement.objects.select_related("created_by")
        .annotate(comments_count=visible_comment_count())
        .order_by("-created_at")[:8]
    )
    return {
        "headers": [_("Title"), _("Author"), _("Comments"), _("Date")],
        "rows": [
            [
                format_html('<a class="text-primary-600 dark:text-primary-500" href="{}">{}</a>',
                            reverse("admin:api_announcement_change", args=[item.pk]), item.title),
                item.created_by.get_full_name() or item.created_by.email,
                item.comments_count,
                date_format(timezone.localtime(item.created_at), "j M") if item.created_at else "—",
            ]
            for item in announcements
        ],
    }


def _quick_actions(request: HttpRequest) -> list[dict[str, Any]]:
    actions = [
        (User, _("Add user"), "person_add"),
        (Announcement, _("New announcement"), "campaign"),
        (Exam, _("New exam"), "quiz"),
    ]
    return [
        {"title": title, "icon": icon, "link": reverse(f"admin:api_{model._meta.model_name}_add")}
        for model, title, icon in actions
        if request.user.has_perm(f"api.add_{model._meta.model_name}")
    ]


def dashboard_callback(request: HttpRequest, context: dict[str, Any]) -> dict[str, Any]:
    today = timezone.localdate()
    week_start = today - timedelta(days=6)
    lang = getattr(request, "LANGUAGE_CODE", None) or settings.LANGUAGE_CODE

    context.update({
        "greeting_name": request.user.first_name or request.user.email,
        "quick_actions": _quick_actions(request),
        "headcount": _headcount(),
        "this_week": _this_week(week_start),
        "attendance_chart": _attendance_chart(today),
        "marks_chart": _marks_chart(today),
        "latest_marks": _latest_marks(lang),
        "latest_announcements": _latest_announcements(),
        "dashboard_titles": {
            "week": _("Last 7 days"),
            "attendance_chart": _("Attendance, last 14 days"),
            "marks_chart": _("Marks given, last 30 days"),
            "latest_marks": _("Latest marks"),
            "latest_announcements": _("Latest announcements"),
        },
    })
    return context
