"""
The bot's screens. Each loads what it needs through the app's own API (as the linked person) and
returns HTML text with inline buttons. Buttons are plain Bot API dicts, so the website's backend
can send them too.
"""

import html
import re
from dataclasses import dataclass, field
from datetime import date, timedelta

from django.conf import settings
from django.utils import dateformat, timezone, translation
from django.utils.dateparse import parse_datetime

from api.models import User
from api.translation import get_localized_json_value

from . import backend
from .emoji import e as premium_emoji
from .emoji import icon as premium_icon
from .texts import LANGUAGE_NAMES, LANGUAGE_PROMPT, tr


# Telegram's 🎉 message effect, for moments worth celebrating (private chats only).
CONFETTI_EFFECT = "5046509860389126442"
EMAIL = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
# Inline keyboards get unwieldy beyond this many task buttons.
MAX_TASK_BUTTONS = 6

Button = dict


@dataclass
class Screen:
    text: str
    buttons: list[list[Button]] = field(default_factory=list)
    # A message effect id, used when the screen is sent as a new message.
    effect: str | None = None
    # A short pop-up shown when the screen answers a button press.
    toast: str | None = None


@dataclass(frozen=True)
class Ctx:
    """Who's looking: their language, the premium emoji ids, and for parents the child selected."""

    lang: str
    ids: dict[str, str]
    child_id: int | None = None

    def t(self, key: str, **values) -> str:
        return tr(self.lang, key, **values)

    def e(self, emoji: str) -> str:
        return premium_emoji(emoji, self.ids)

    def date(self, value: date, fmt: str = "D j E") -> str:
        with translation.override(self.lang):
            return dateformat.format(value, fmt)

    def name(self, value) -> str:
        """A (possibly translated) name from the API, escaped for HTML."""
        return esc(get_localized_json_value(value, self.lang))

    def button(
        self,
        label: str,
        *,
        emoji: str | None = None,
        data: str | None = None,
        url: str | None = None,
        copy: str | None = None,
        style: str | None = None,
    ) -> Button:
        """A button with an animated emoji icon when possible; `style` is primary, success or danger."""
        custom = premium_icon(emoji, self.ids) if emoji else None
        button: Button = {"text": f"{emoji} {label}" if emoji and not custom else label}
        if custom:
            button["icon_custom_emoji_id"] = custom
        if style:
            button["style"] = style
        if data:
            button["callback_data"] = data
        elif url:
            button["url"] = url
        elif copy:
            button["copy_text"] = {"text": copy}
        return button

    def app_url(self, path: str = "home") -> str:
        return f"{settings.WEBSITE_URL}/{self.lang}/{path}"


def esc(value) -> str:
    return html.escape(str(value or ""))


def bar(fraction: float, width: int = 10) -> str:
    filled = max(0, min(width, round(fraction * width)))
    return "▰" * filled + "▱" * (width - filled)


def full_name(user: User) -> str:
    return esc(f"{user.first_name} {user.last_name}".strip() or user.email)


def grade_label(ctx: Ctx, grade: dict | None) -> str:
    if not grade:
        return ""
    return f"{esc(grade.get('name'))} {ctx.name(grade.get('category_name'))}".strip()


def user_grade(ctx: Ctx, user: User) -> str:
    grade = user.grade_in
    if grade is None:
        return ""
    category = grade.category.name if grade.category else None
    return grade_label(ctx, {"name": grade.name, "category_name": category})


def role_label(ctx: Ctx, role: str | None) -> str:
    return ctx.t(f"role_{role}") if role in ("student", "teacher", "parent", "admin") else ""


def greeting(ctx: Ctx) -> str:
    hour = timezone.localtime().hour
    if 5 <= hour < 12:
        return ctx.t("greet_morning")
    if 12 <= hour < 18:
        return ctx.t("greet_afternoon")
    if 18 <= hour < 23:
        return ctx.t("greet_evening")
    return ctx.t("greet_night")


def menu_row(ctx: Ctx) -> list[Button]:
    return [ctx.button(ctx.t("menu"), emoji="🏠", data="home")]


def failure(ctx: Ctx, result: backend.Result) -> Screen:
    key = "not_for_role" if result.status in (400, 403, 404) else "server_error"
    return Screen(f"{ctx.e('⚠️')} {ctx.t(key)}", [menu_row(ctx)])


def day_label(ctx: Ctx, value: date) -> str:
    offset = (value - timezone.localdate()).days
    relative = {0: "today", 1: "tomorrow", -1: "yesterday"}.get(offset)
    return f"{ctx.t(relative)} · {ctx.date(value, 'l, j E')}" if relative else ctx.date(value, "l, j E")


def mark_dot(value: float, max_mark: float = 10) -> str:
    share = value / max_mark if max_mark else 0
    return "🟢" if share >= 0.8 else "🟡" if share >= 0.5 else "🔴"


# ---------------------------------------------------------------------------
# Accounts
# ---------------------------------------------------------------------------

ROLE_ORDER = {"parent": 0, "teacher": 1, "admin": 2, "student": 3}


def accounts_for_chat(chat_id: int | str) -> list[User]:
    """Every account linked to this chat. A parent may link a young child's account to receive its codes."""
    accounts = User.objects.filter(chat_id=str(chat_id), is_active=True).select_related("grade_in__category")
    return sorted(accounts, key=lambda u: (ROLE_ORDER.get(u.role, 9), u.pk))


def active_account(chat_id: int | str, preferred_id: int | None) -> User | None:
    accounts = accounts_for_chat(chat_id)
    return next((a for a in accounts if a.pk == preferred_id), accounts[0] if accounts else None)


def children_of(user: User) -> list[User]:
    return list(
        User.objects
        .filter(parent_links__parent=user, role=User.Role.STUDENT)
        .select_related("grade_in__category")
        .order_by("first_name", "last_name", "id")
    )


def student_for(ctx: Ctx, user: User) -> tuple[dict, str]:
    """API params and a title suffix for whose records to show: a parent sees the selected child."""
    if user.role != User.Role.PARENT:
        return {}, ""
    children = children_of(user)
    child = next((c for c in children if c.pk == ctx.child_id), children[0] if children else None)
    if child is None:
        return {}, ""
    return {"student_id": child.pk}, f" · {esc(child.first_name or child.email)}"


# ---------------------------------------------------------------------------
# Not linked yet
# ---------------------------------------------------------------------------

def language_rows(ctx: Ctx) -> list[list[Button]]:
    return [
        [
            ctx.button(
                f"{name} ✓" if code == ctx.lang else name,
                data=f"lang:{code}",
                style="primary" if code == ctx.lang else None,
            )
            for code, name in LANGUAGE_NAMES.items()
        ]
    ]


def language_picker(ctx: Ctx) -> Screen:
    """The bot's first question, asked in all three languages at once."""
    prompts = [f"<b>{prompt}</b>" for prompt in LANGUAGE_PROMPT.values()]
    return Screen(
        f"{ctx.e('🌐')} " + "\n".join(prompts),
        [[ctx.button(name, data=f"lang:{code}:start", style="primary")] for code, name in LANGUAGE_NAMES.items()],
    )


def welcome(ctx: Ctx) -> Screen:
    return Screen(
        f"{ctx.e('👋')} <b>{ctx.t('welcome_title')}</b>\n\n{ctx.e('🤖')} {ctx.t('welcome_body')}",
        [
            [ctx.button(ctx.t("connect"), emoji="🔗", data="link", style="primary")],
            [
                ctx.button(LANGUAGE_NAMES[ctx.lang], emoji="🌐", data="language"),
                ctx.button(ctx.t("btn_help"), emoji="ℹ️", data="help"),
            ],
        ],
    )


def cancelled(ctx: Ctx) -> Screen:
    return Screen(
        f"{ctx.e('👌')} {ctx.t('cancelled')}",
        [[ctx.button(ctx.t("connect"), emoji="🔗", data="link", style="primary")]],
    )


def ask_email(ctx: Ctx, problem: str | None = None) -> Screen:
    lines = [f"{ctx.e('⚠️')} {ctx.t(problem)}", ""] if problem else []
    lines.append(f"{ctx.e('✍️')} {ctx.t('ask_email')}")
    return Screen("\n".join(lines), [[ctx.button(ctx.t("cancel"), emoji="❌", data="cancel")]])


@dataclass
class LinkOutcome:
    # "invalid" / "unknown" (ask again), "taken", "already" or "linked".
    status: str
    account: User | None = None

    @property
    def retry(self) -> bool:
        """Whether the chat's next message should still be read as an email."""
        return self.status in ("invalid", "unknown")


def link_account(chat_id: int | str, email: str, language: str) -> LinkOutcome:
    """Connects the account with this email to the chat."""
    email = email.strip().lower()
    if not EMAIL.match(email):
        return LinkOutcome("invalid")

    user = User.objects.filter(email__iexact=email, is_active=True).select_related("grade_in__category").first()
    if user is None:
        return LinkOutcome("unknown")
    if user.chat_id and user.chat_id != str(chat_id):
        return LinkOutcome("taken")
    if user.chat_id == str(chat_id):
        return LinkOutcome("already", user)

    user.chat_id = str(chat_id)
    user.telegram_language = language
    user.save(update_fields=["chat_id", "telegram_language"])
    return LinkOutcome("linked", user)


def link_result(ctx: Ctx, outcome: LinkOutcome) -> Screen:
    if outcome.retry:
        return ask_email(ctx, f"email_{outcome.status}")
    if outcome.status == "taken":
        return Screen(f"{ctx.e('⛔️')} {ctx.t('email_taken')}", [[ctx.button(ctx.t("btn_help"), emoji="ℹ️", data="help")]])

    menu = [[ctx.button(ctx.t("menu"), emoji="🏠", data="home", style="primary")]]
    name = full_name(outcome.account)
    if outcome.status == "already":
        return Screen(f"{ctx.e('🔗')} {ctx.t('already_linked', name=name)}", menu)
    return Screen(
        f"{ctx.e('🎉')} <b>{ctx.t('linked_title')}</b>\n\n{ctx.t('linked_body', name=name)}",
        menu,
        effect=CONFETTI_EFFECT,
    )


# ---------------------------------------------------------------------------
# Home
# ---------------------------------------------------------------------------

def menu_buttons(ctx: Ctx, user: User) -> list[list[Button]]:
    b = ctx.button
    today = b(ctx.t("btn_today"), emoji="🗓", data="day:0", style="primary")
    week = b(ctx.t("btn_week"), emoji="📈", data="week")
    homework = b(ctx.t("btn_homework"), emoji="📚", data="hw")
    marks = b(ctx.t("btn_marks"), emoji="⭐", data="marks")
    attendance = b(ctx.t("btn_attendance"), emoji="✅", data="att")
    exams = b(ctx.t("btn_exams"), emoji="📝", data="exams")
    news = b(ctx.t("btn_news"), emoji="📣", data="news")
    profile = b(ctx.t("btn_profile"), emoji="👤", data="profile")
    settings_ = b(ctx.t("btn_settings"), emoji="⚙️", data="settings")
    app = b(ctx.t("open_app"), emoji="🌐", url=ctx.app_url())

    if user.role == User.Role.TEACHER:
        return [[today, week], [homework, exams], [news, profile], [settings_, app]]
    if user.role == User.Role.ADMIN:
        return [[news, profile], [settings_, app]]
    return [[today, week], [homework, marks], [attendance, exams], [news, profile], [settings_, app]]


def next_lesson_line(ctx: Ctx, user: User, params: dict) -> str | None:
    """The next lesson today, from the timetable."""
    today = timezone.localdate()
    result = backend.call(
        user, "calendar/", params={"start": str(today), "end": str(today), **params}, language=ctx.lang
    )
    if not result.ok:
        return None
    now = timezone.localtime().strftime("%H:%M")
    upcoming = sorted(
        (lesson for lesson in result.data["lessons"]
         if lesson["weekday"] == today.isoweekday() and lesson["start_time"] > now),
        key=lambda lesson: lesson["start_time"],
    )
    if not upcoming:
        return None
    lesson = upcoming[0]
    grade = f" · {esc(lesson['grade'])}" if user.role == User.Role.TEACHER else ""
    return f"{ctx.e('⏰')} <code>{lesson['start_time']}</code> {ctx.name(lesson['subject'])}{grade}"


def home(ctx: Ctx, user: User) -> Screen:
    result = backend.call(user, "home/", language=ctx.lang)
    if not result.ok:
        return failure(ctx, result)
    data = result.data

    role = role_label(ctx, user.role)
    grade = user_grade(ctx, user)
    lines = [
        f"{ctx.e('👋')} <b>{greeting(ctx)}, {esc(user.first_name or user.email)}!</b>",
        f"{ctx.e('🎓')} {role}{f' · {grade}' if grade else ''}",
        "",
    ]
    buttons = menu_buttons(ctx, user)

    if user.role == User.Role.STUDENT:
        average = data.get("average_mark")
        if average is not None:
            lines.append(f"{ctx.e('⭐')} {ctx.t('average')}: <b>{average}</b>")
        lines.append(f"{ctx.e('📚')} {ctx.t('homework_left')}: <b>{data.get('pending_homework', 0)}</b>")
        if data.get("streak"):
            lines.append(f"{ctx.e('🔥')} {ctx.t('streak', n=data['streak'])}")
        lines.append(f"{ctx.e('🏆')} {ctx.t('points')}: <b>{data['me'].get('points') or 0}</b>")
        if any(session.get("is_active") for session in data.get("sessions", [])):
            lines += ["", f"{ctx.e('⏳')} {ctx.t('exam_running')}"]
        upcoming = next_lesson_line(ctx, user, {})
        if upcoming:
            lines += ["", upcoming]

    elif user.role == User.Role.PARENT:
        children = data.get("children", [])
        for child in children:
            lines.append(f"{ctx.e('🧒')} <b>{esc(child['first_name'])} {esc(child['last_name'])}</b> · {grade_label(ctx, child.get('grade'))}")
            stats = []
            if child.get("average_mark") is not None:
                stats.append(f"{ctx.e('⭐')} {child['average_mark']}")
            if child.get("attendance_rate") is not None:
                stats.append(f"{ctx.e('✅')} {child['attendance_rate']}%")
            stats.append(f"{ctx.e('📚')} {child.get('pending_homework', 0)}")
            lines.append("     " + "   ".join(stats))
            for lesson in child.get("attendance_today", []):
                mark = ctx.e("✅") if lesson["is_present"] else ctx.e("❌")
                lines.append(f"     {mark} <code>{esc(lesson['start_time'])}</code> {ctx.name(lesson['subject'])}")
            lines.append("")
        if len(children) > 1:
            selected = ctx.child_id if ctx.child_id in {c["id"] for c in children} else children[0]["id"]
            buttons.insert(0, [
                ctx.button(
                    f"{child['first_name']}{' ✓' if child['id'] == selected else ''}",
                    emoji="🧒",
                    data=f"child:{child['id']}",
                    style="primary" if child["id"] == selected else None,
                )
                for child in children
            ])

    elif user.role == User.Role.TEACHER:
        taught = data.get("subjectsTaught", [])
        if taught:
            lines.append(f"{ctx.e('📖')} <b>{ctx.t('subjects_taught')}</b>")
            lines += [f"     {ctx.name(s['name'])} · {grade_label(ctx, s.get('grade'))}" for s in taught[:8]]
        upcoming = next_lesson_line(ctx, user, {})
        if upcoming:
            lines += ["", upcoming]

    elif user.role == User.Role.ADMIN:
        stats = data.get("stats", {})
        lines += [
            f"{ctx.e('📊')} <b>{ctx.t('school_stats')}</b>",
            f"     {ctx.e('👤')} {ctx.t('stat_users')}: <b>{stats.get('users', 0)}</b>",
            f"     {ctx.e('🎓')} {ctx.t('stat_grades')}: <b>{stats.get('grades', 0)}</b>",
            f"     {ctx.e('📖')} {ctx.t('stat_subjects')}: <b>{stats.get('subjects', 0)}</b>",
            f"     {ctx.e('📝')} {ctx.t('stat_exams')}: <b>{stats.get('exams', 0)}</b>",
        ]

    return Screen("\n".join(lines).strip(), buttons)


# ---------------------------------------------------------------------------
# Timetable
# ---------------------------------------------------------------------------

def day(ctx: Ctx, user: User, offset: int = 0) -> Screen:
    target = timezone.localdate() + timedelta(days=offset)
    params, whose = student_for(ctx, user)
    result = backend.call(
        user, "calendar/", params={"start": str(target), "end": str(target), **params}, language=ctx.lang
    )
    if not result.ok:
        return failure(ctx, result)
    data = result.data

    lessons = sorted(
        (lesson for lesson in data["lessons"] if lesson["weekday"] == target.isoweekday()),
        key=lambda lesson: lesson["start_time"],
    )
    homework = [item for item in data["homework"] if item["due_date"] == str(target)]
    exams = [exam for exam in data["exams"] if str(exam["scheduled_for"])[:10] == str(target)]

    lines = [f"{ctx.e('🗓')} <b>{day_label(ctx, target)}</b>{whose}", ""]
    if lessons:
        lines.append(f"{ctx.e('⏰')} <b>{ctx.t('lessons')}</b>")
        for lesson in lessons:
            extras = []
            if user.role == User.Role.TEACHER:
                extras.append(esc(lesson["grade"]))
            if lesson.get("room"):
                extras.append(f"<i>{ctx.t('room', room=esc(lesson['room']))}</i>")
            suffix = f" · {' · '.join(extras)}" if extras else ""
            lines.append(f"<code>{lesson['start_time']}</code> {ctx.name(lesson['subject'])}{suffix}")
    else:
        lines.append(f"{ctx.e('☕')} {ctx.t('no_lessons')}")

    if homework:
        lines += ["", f"{ctx.e('📚')} <b>{ctx.t('due_that_day')}</b>"]
        for item in homework:
            subject = f" · {ctx.name(item['subject'])}" if item.get("subject") else ""
            if item.get("completed"):
                lines.append(f"{ctx.e('✅')} <s>{esc(item['title'])}</s>{subject}")
            else:
                lines.append(f"{ctx.e('⏳')} {esc(item['title'])}{subject}")

    if exams:
        lines += ["", f"{ctx.e('📝')} <b>{ctx.t('exams')}</b>"]
        for exam in exams:
            lines.append(
                f"• {ctx.name(exam['title'])} · {ctx.name(exam['subject'])} · "
                f"{ctx.e('⏳')} {ctx.t('minutes', n=exam['duration'])}"
            )

    navigation = [ctx.button(ctx.t("previous"), emoji="◀️", data=f"day:{offset - 1}")]
    if offset != 0:
        navigation.append(ctx.button(ctx.t("today"), emoji="🗓", data="day:0", style="primary"))
    navigation.append(ctx.button(ctx.t("next"), emoji="▶️", data=f"day:{offset + 1}"))
    return Screen("\n".join(lines), [navigation, menu_row(ctx)])


def week(ctx: Ctx, user: User) -> Screen:
    start = timezone.localdate()
    days = [start + timedelta(days=i) for i in range(7)]
    params, whose = student_for(ctx, user)
    result = backend.call(
        user, "calendar/", params={"start": str(days[0]), "end": str(days[-1]), **params}, language=ctx.lang
    )
    if not result.ok:
        return failure(ctx, result)
    data = result.data

    lines = [f"{ctx.e('📈')} <b>{ctx.t('week_title')}</b>{whose}", ""]
    for value in days:
        lessons = sum(1 for lesson in data["lessons"] if lesson["weekday"] == value.isoweekday())
        due = sum(1 for item in data["homework"] if item["due_date"] == str(value))
        exams = sum(1 for exam in data["exams"] if str(exam["scheduled_for"])[:10] == str(value))
        parts = [
            f"{ctx.e(emoji)} {count}"
            for emoji, count in (("⏰", lessons), ("📚", due), ("📝", exams))
            if count
        ]
        label = ctx.t("today") if value == start else ctx.date(value, "D j E")
        summary = " · ".join(parts) if parts else f"<i>{ctx.t('free_day')}</i>"
        lines.append(f"<b>{label}</b> · {summary}")

    lines += [
        "",
        f"<i>{ctx.e('⏰')} {ctx.t('lessons')} · {ctx.e('📚')} {ctx.t('btn_homework')} · {ctx.e('📝')} {ctx.t('exams')}</i>",
    ]

    day_buttons = [
        ctx.button(ctx.t("today") if i == 0 else ctx.date(value, "D"), data=f"day:{i}", style="primary" if i == 0 else None)
        for i, value in enumerate(days)
    ]
    return Screen("\n".join(lines), [day_buttons[:4], day_buttons[4:], menu_row(ctx)])


# ---------------------------------------------------------------------------
# Homework
# ---------------------------------------------------------------------------

def homework(ctx: Ctx, user: User, toast: str | None = None) -> Screen:
    start = timezone.localdate()
    params, whose = student_for(ctx, user)
    result = backend.call(
        user,
        "calendar/",
        params={"start": str(start), "end": str(start + timedelta(days=7)), **params},
        language=ctx.lang,
    )
    if not result.ok:
        return failure(ctx, result)
    items = result.data["homework"]

    lines = [f"{ctx.e('📚')} <b>{ctx.t('homework_title')}</b>{whose}", ""]
    if not items:
        lines.append(f"{ctx.e('🎉')} {ctx.t('homework_none')}")
        return Screen("\n".join(lines), [menu_row(ctx)], toast=toast)

    tracked = user.role != User.Role.TEACHER
    if tracked:
        done = sum(1 for item in items if item.get("completed"))
        lines += [f"{bar(done / len(items))}  {ctx.t('homework_done', done=done, total=len(items))}", ""]

    for item in items:
        due = ctx.t("due", date=ctx.date(date.fromisoformat(item["due_date"])))
        subject = f" · {ctx.name(item['subject'])}" if item.get("subject") else ""
        if item.get("completed"):
            lines.append(f"{ctx.e('✅')} <s>{esc(item['title'])}</s>{subject}\n     <i>{due}</i>")
        else:
            icon = ctx.e("⏳") if tracked else ctx.e("📌")
            lines.append(f"{icon} <b>{esc(item['title'])}</b>{subject}\n     <i>{due}</i>")

    buttons = []
    if user.role == User.Role.STUDENT:
        pending = [item for item in items if not item.get("completed")][:MAX_TASK_BUTTONS]
        if pending:
            lines += ["", f"<i>{ctx.t('homework_tap')}</i>"]
        buttons += [
            [ctx.button(item["title"][:40], emoji="✅", data=f"hw:{item['id']}", style="success")]
            for item in pending
        ]
    buttons.append(menu_row(ctx))
    return Screen("\n".join(lines), buttons, toast=toast)


def complete_homework(user: User, exercise_id: int, language: str) -> str:
    """Ticks a task off for a student; returns the pop-up to show."""
    result = backend.call(user, f"exercises/{exercise_id}/complete/", data={"done": True}, language=language)
    if not result.ok:
        return tr(language, "not_for_role")
    streak = result.data.get("streak") or 0
    return tr(language, "streak_toast", n=streak) if streak > 1 else tr(language, "marked_done")


# ---------------------------------------------------------------------------
# Marks, attendance, exams
# ---------------------------------------------------------------------------

def marks(ctx: Ctx, user: User) -> Screen:
    params, whose = student_for(ctx, user)
    result = backend.call(user, "marks/", params=params, language=ctx.lang)
    if not result.ok:
        return failure(ctx, result)
    data = result.data
    max_mark = data.get("max_mark") or 10

    lines = [f"{ctx.e('⭐')} <b>{ctx.t('marks_title')}</b>{whose}", ""]
    subjects = [s for s in data.get("subjects", []) if s.get("marks")]
    if not subjects:
        lines.append(f"{ctx.e('✨')} {ctx.t('marks_none')}")
        return Screen("\n".join(lines), [menu_row(ctx)])

    if data.get("average") is not None:
        lines += [f"{ctx.e('📊')} {ctx.t('overall_average')}: <b>{data['average']}</b> / {max_mark}", ""]

    for subject in subjects:
        average = subject.get("average")
        if average is None:
            continue
        lines.append(f"<b>{ctx.name(subject['subject'])}</b>\n{bar(average / max_mark)}  {average}")

    latest = sorted(
        ((mark, subject["subject"]) for subject in subjects for mark in subject["marks"]),
        key=lambda pair: (pair[0]["date"], pair[0]["id"]),
        reverse=True,
    )[:5]
    lines += ["", f"{ctx.e('✨')} <b>{ctx.t('latest_marks')}</b>"]
    for mark, subject in latest:
        note = f" — <i>{esc(mark['comment'])}</i>" if mark.get("comment") else ""
        lines.append(
            f"{ctx.e(mark_dot(mark['value'], max_mark))} <b>{mark['value']}</b> · {ctx.name(subject)} · "
            f"{ctx.date(date.fromisoformat(mark['date']))}{note}"
        )

    return Screen("\n".join(lines), [[ctx.button(ctx.t("open_app"), emoji="🌐", url=ctx.app_url("marks"))], menu_row(ctx)])


def shift_month(month: date, months: int) -> date:
    index = month.year * 12 + month.month - 1 + months
    return date(index // 12, index % 12 + 1, 1)


def attendance(ctx: Ctx, user: User, month: str | None = None) -> Screen:
    current = timezone.localdate().replace(day=1)
    try:
        shown = date.fromisoformat(f"{month}-01") if month else current
    except ValueError:
        shown = current
    shown = min(shown, current)

    params, whose = student_for(ctx, user)
    result = backend.call(
        user, "attendance/history/", params={"month": shown.strftime("%Y-%m"), **params}, language=ctx.lang
    )
    if not result.ok:
        return failure(ctx, result)
    data = result.data
    summary = data.get("summary", {})

    lines = [f"{ctx.e('✅')} <b>{ctx.t('attendance_title')} · {ctx.date(shown, 'F Y')}</b>{whose}", ""]
    if not data.get("records"):
        lines.append(f"{ctx.e('✨')} {ctx.t('attendance_none')}")
    else:
        rate = summary.get("rate")
        if rate is not None:
            lines.append(f"{bar(rate / 100)}  <b>{rate}%</b>")
        lines.append(
            f"{ctx.e('🟢')} {ctx.t('present')}: <b>{summary.get('present', 0)}</b>    "
            f"{ctx.e('🔴')} {ctx.t('absent')}: <b>{summary.get('absent', 0)}</b>"
        )
        missed = [record for record in data["records"] if not record["is_present"]]
        if missed:
            lines += ["", f"{ctx.e('❌')} <b>{ctx.t('missed_lessons')}</b>"]
            for record in sorted(missed, key=lambda r: (r["date"], r["start_time"]), reverse=True)[:8]:
                lines.append(
                    f"• {ctx.date(date.fromisoformat(record['date']))} · {ctx.name(record['subject'])} · "
                    f"<code>{esc(record['start_time'])}</code>"
                )

    navigation = [ctx.button(ctx.date(shift_month(shown, -1), "F"), emoji="◀️", data=f"att:{shift_month(shown, -1):%Y-%m}")]
    if shown < current:
        navigation.append(ctx.button(ctx.date(shift_month(shown, 1), "F"), emoji="▶️", data=f"att:{shift_month(shown, 1):%Y-%m}"))
    return Screen("\n".join(lines), [navigation, menu_row(ctx)])


def exams(ctx: Ctx, user: User) -> Screen:
    today = timezone.localdate()
    params, whose = student_for(ctx, user)
    calendar = backend.call(
        user, "calendar/", params={"start": str(today), "end": str(today + timedelta(days=30)), **params}, language=ctx.lang
    )
    if not calendar.ok:
        return failure(ctx, calendar)

    lines = [f"{ctx.e('📝')} <b>{ctx.t('exams_title')}</b>{whose}", ""]
    upcoming = sorted(calendar.data["exams"], key=lambda exam: str(exam["scheduled_for"]))
    if upcoming:
        lines.append(f"{ctx.e('🗓')} <b>{ctx.t('coming_up')}</b>")
        for exam in upcoming[:6]:
            when = ctx.date(date.fromisoformat(str(exam["scheduled_for"])[:10]))
            lines.append(
                f"• <b>{when}</b> · {ctx.name(exam['title'])} · {ctx.name(exam['subject'])} · "
                f"{ctx.e('⏳')} {ctx.t('minutes', n=exam['duration'])}"
            )
        lines.append("")

    if user.role == User.Role.STUDENT:
        available = backend.call(user, "exams/", language=ctx.lang)
        if available.ok and available.data:
            lines.append(f"{ctx.e('🚀')} <b>{ctx.t('open_now')}</b>")
            for exam in available.data[:5]:
                lines.append(
                    f"• {ctx.name(exam['title'])} · {ctx.name(exam['subject'])} · "
                    f"{ctx.e('⏳')} {ctx.t('minutes', n=exam['duration'])}"
                )
            lines.append("")

    if user.role in (User.Role.STUDENT, User.Role.PARENT):
        history = backend.call(user, "exams/history/", params=params, language=ctx.lang)
        items = history.data.get("items", []) if history.ok else []
        if items:
            lines.append(f"{ctx.e('🏆')} <b>{ctx.t('latest_results')}</b>")
            for item in items[:3]:
                share = item["score"] / item["max_score"] if item.get("max_score") else 0
                lines.append(
                    f"{ctx.e(mark_dot(share * 10))} {ctx.name(item['title'])} · <b>{item['score']}/{item['max_score']}</b> "
                    f"({round(share * 100)}%)"
                )

    if len(lines) == 2:
        lines.append(f"{ctx.e('✨')} {ctx.t('exams_none')}")
    return Screen("\n".join(lines).strip(), [[ctx.button(ctx.t("open_app"), emoji="🌐", url=ctx.app_url("exam"))], menu_row(ctx)])


# ---------------------------------------------------------------------------
# News, profile, settings, help
# ---------------------------------------------------------------------------

def news(ctx: Ctx, user: User) -> Screen:
    result = backend.call(user, "announcements/list/", language=ctx.lang)
    if not result.ok:
        return failure(ctx, result)
    items = result.data.get("announcements", [])[:5]

    lines = [f"{ctx.e('📣')} <b>{ctx.t('news_title')}</b>", ""]
    if not items:
        lines.append(f"{ctx.e('✨')} {ctx.t('news_none')}")
    for item in items:
        created = parse_datetime(str(item["created_at"]))
        meta = [ctx.name(item["subject"]["name"])] if item.get("subject") else []
        meta.append(grade_label(ctx, item.get("grade")))
        if created:
            meta.append(ctx.date(timezone.localtime(created).date()))
        body = " ".join(str(item["content"]).split())
        body = body if len(body) <= 160 else f"{body[:159]}…"
        lines += [
            f"{ctx.e('📌')} <b>{esc(item['title'])}</b>",
            f"<i>{' · '.join(part for part in meta if part)}</i> · {ctx.e('💬')} {item.get('len_comments', 0)}",
            esc(body),
            "",
        ]

    return Screen(
        "\n".join(lines).strip(),
        [[ctx.button(ctx.t("open_app"), emoji="🌐", url=ctx.app_url("announcement"))], menu_row(ctx)],
    )


def profile(ctx: Ctx, user: User, accounts: list[User] | None = None) -> Screen:
    grade = user_grade(ctx, user)
    lines = [
        f"{ctx.e('👤')} <b>{full_name(user)}</b>",
        f"{ctx.e('🎓')} {role_label(ctx, user.role)}{f' · {grade}' if grade else ''}",
        f"{ctx.e('✉️')} <code>{esc(user.email)}</code>",
    ]
    if user.role == User.Role.STUDENT:
        lines.append(f"{ctx.e('🏆')} {ctx.t('points')}: <b>{user.points or 0}</b>")
    if user.role == User.Role.PARENT:
        children = children_of(user)
        if children:
            lines += ["", f"<b>{ctx.t('children')}</b>"]
            lines += [f"{ctx.e('🧒')} {full_name(child)} · {user_grade(ctx, child)}" for child in children]
    lines += ["", f"{ctx.e('🔗')} {ctx.t('telegram_connected')}"]

    buttons = []
    others = [account for account in (accounts or []) if account.pk != user.pk]
    if others:
        buttons.append([
            ctx.button(f"{account.first_name or account.email} · {role_label(ctx, account.role)}", emoji="🔄", data=f"account:{account.pk}")
            for account in others[:3]
        ])
    buttons += [
        [ctx.button(ctx.t("btn_settings"), emoji="⚙️", data="settings")],
        [ctx.button(ctx.t("unlink"), emoji="🚫", data="unlink", style="danger")],
        menu_row(ctx),
    ]
    return Screen("\n".join(lines), buttons)


def unlink_confirm(ctx: Ctx, user: User) -> Screen:
    return Screen(
        f"{ctx.e('⚠️')} {ctx.t('unlink_confirm', email=esc(user.email))}",
        [[
            ctx.button(ctx.t("unlink_yes"), emoji="🚫", data="unlink:yes", style="danger"),
            ctx.button(ctx.t("cancel"), data="profile"),
        ]],
    )


def unlinked(ctx: Ctx) -> Screen:
    return Screen(f"{ctx.e('👋')} {ctx.t('unlinked')}", [[ctx.button(ctx.t("connect"), emoji="🔗", data="link", style="primary")]])


def settings_screen(ctx: Ctx, user: User | None) -> Screen:
    lines = [
        f"{ctx.e('⚙️')} <b>{ctx.t('settings_title')}</b>",
        "",
        f"{ctx.e('🌐')} {ctx.t('language')}: <b>{LANGUAGE_NAMES[ctx.lang]}</b>",
    ]
    buttons = language_rows(ctx)
    if user is not None:
        on = user.telegram_notifications
        lines += [
            f"{ctx.e('🔔' if on else '🔕')} {ctx.t('notifications')}: <b>{ctx.t('on' if on else 'off')}</b>",
            "",
            f"<i>{ctx.t('notifications_hint')}</i>",
        ]
        buttons.append([
            ctx.button(
                f"{ctx.t('notifications')}: {ctx.t('on' if on else 'off')}",
                emoji="🔔" if on else "🔕",
                data="notif",
                style="success" if on else "danger",
            )
        ])
    buttons.append([ctx.button(ctx.t("back"), emoji="🏠", data="home" if user else "start")])
    return Screen("\n".join(lines), buttons)


def help_screen(ctx: Ctx, linked: bool) -> Screen:
    text = f"{ctx.e('💡')} <b>{ctx.t('help_title')}</b>\n\n{ctx.t('help_body')}"
    if linked:
        return Screen(text, [menu_row(ctx)])
    return Screen(text, [[ctx.button(ctx.t("connect"), emoji="🔗", data="link", style="primary")]])


def not_linked(ctx: Ctx) -> Screen:
    return Screen(
        f"{ctx.e('🔒')} {ctx.t('not_linked')}",
        [[ctx.button(ctx.t("connect"), emoji="🔗", data="link", style="primary")]],
    )
