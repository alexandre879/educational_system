from django.contrib import admin
from django.contrib.auth.admin import GroupAdmin as BaseGroupAdmin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.contrib.auth.models import Group
from django.db import models
from django.db.models import Count
from django.utils.translation import gettext_lazy as _
from django.utils.translation import gettext_noop
from rest_framework_simplejwt.token_blacklist.admin import BlacklistedTokenAdmin as BaseBlacklistedTokenAdmin
from rest_framework_simplejwt.token_blacklist.admin import OutstandingTokenAdmin as BaseOutstandingTokenAdmin
from rest_framework_simplejwt.token_blacklist.models import BlacklistedToken, OutstandingToken
from unfold.admin import ModelAdmin, TabularInline
from unfold.decorators import display
from unfold.forms import AdminPasswordChangeForm
from unfold.widgets import UnfoldAdminTextareaWidget

from .admin_ui import mark_variant
from .translation import get_localized_json_value

from .models import (
    Comment,
    DailyExercise,
    ExerciseCompletion,
    Mark,
    User,
    Grade,
    Subject,
    Exam,
    Question,
    Option,
    UserExamSession,
    UserAnswer,
    Announcement,
    GradeCategory,
    UserSubjectPoints,
    WeeklyLesson,
    LessonAttendance,
    ParentStudent,
    PushDevice,
    UserNotification,
    SubjectBook,
    visible_comment_count,
)
from .forms import UserCreationForm, UserChangeForm


# Branding, sidebar and the dashboard are configured in settings.UNFOLD (see api/admin_ui.py).
admin.site.index_title = _("Dashboard")

ROLE_BADGES = {
    User.Role.STUDENT: "info",
    User.Role.TEACHER: "success",
    User.Role.PARENT: "warning",
    User.Role.ADMIN: "danger",
}


def person(user):
    """Name, email and initials for Unfold's two-line list cell (instead of the long User.__str__)."""
    if user is None:
        return ["-", "", ""]
    name = user.get_full_name()
    initials = "".join(part[0] for part in name.split()[:2]) if name else user.email[:2]
    return [name or user.email, user.email if name else "", initials.upper()]


def person_column(field, description):
    @display(description=description, ordering=f"{field}__email", header=True)
    def column(self, obj):
        return person(getattr(obj, field))

    return column


class BaseAdmin(ModelAdmin):
    # Ask before leaving a form with unsaved changes.
    warn_unsaved_form = True


class WithIDAdmin(BaseAdmin):
    def get_list_display(self, request):
        return ("id",) + tuple(super().get_list_display(request))


class UserAdmin(BaseUserAdmin, BaseAdmin):
    form = UserChangeForm
    add_form = UserCreationForm
    change_password_form = AdminPasswordChangeForm

    list_display = (
        "email",
        "first_name",
        "last_name",
        "role_badge",
        "grade_in",
        "points",
        "is_staff",
        "is_active",
    )

    list_filter = ("is_staff", "is_active", "role", "grade_in")

    fieldsets = (
        (None, {"fields": ("email", "password")}),
        (_("Personal info"), {
            "fields": (
                "first_name",
                "last_name",
                "role",
                "grade_in",
                "points",
                "profilePic",
                "subjects_taught",
            )
        }),
        (_("Permissions"), {
            "fields": (
                "is_staff",
                "is_active",
                "is_superuser",
                "groups",
                "user_permissions",
            )
        }),
        (_("Spectator mode"), {
            "classes": ("collapse",),
            "description": _(
                "Only for accounts with the Spectator role: visitors press “View as spectator” on the "
                "login page and see the site as these people, without being able to change anything."
            ),
            "fields": ("spectator_views",),
        }),
        (_("Important dates"), {
            "fields": ("last_login",),
        }),
    )

    add_fieldsets = (
        (None, {
            "classes": ("wide",),
            "fields": (
                "email",
                "first_name",
                "last_name",
                "role",
                "grade_in",
                "points",
                "subjects_taught",
                "profilePic",
                "password1",
                "password2",
                "is_staff",
                "is_active",
            ),
        }),
    )

    search_fields = ("email", "first_name", "last_name")
    ordering = ("email",)
    filter_horizontal = ("groups", "user_permissions", "subjects_taught", "spectator_views")
    list_select_related = ("grade_in",)

    def get_list_display(self, request):
        return ("id",) + self.list_display

    @display(description=_("Role"), ordering="role", label=ROLE_BADGES)
    def role_badge(self, obj):
        return (obj.role, obj.get_role_display()) if obj.role else None


class GroupAdmin(BaseGroupAdmin, BaseAdmin):
    pass


class OutstandingTokenAdmin(BaseOutstandingTokenAdmin, BaseAdmin):
    pass


class BlacklistedTokenAdmin(BaseBlacklistedTokenAdmin, BaseAdmin):
    pass


# simplejwt has no Georgian translation; listing its model names here keeps them in our locale files.
SIMPLEJWT_NAMES = (
    gettext_noop("Outstanding Token"),
    gettext_noop("Outstanding Tokens"),
    gettext_noop("Blacklisted Token"),
    gettext_noop("Blacklisted Tokens"),
)

# Built-in and third-party admins, re-registered so they get the same look.
admin.site.unregister(Group)
admin.site.register(Group, GroupAdmin)
admin.site.unregister(OutstandingToken)
admin.site.register(OutstandingToken, OutstandingTokenAdmin)
admin.site.unregister(BlacklistedToken)
admin.site.register(BlacklistedToken, BlacklistedTokenAdmin)


@admin.register(GradeCategory)
class GradeCategoryAdmin(WithIDAdmin):
    list_display = ("localized_name",)
    search_fields = ("name__en", "name__ka", "name__ru")

    @admin.display(description=_("Name"))
    def localized_name(self, obj):
        return get_localized_json_value(obj.name)


@admin.register(Grade)
class GradeAdmin(WithIDAdmin):
    list_display = ("name", "localized_category")
    search_fields = ("name", "category__name__en", "category__name__ka", "category__name__ru")
    list_filter = ("category",)
    list_select_related = ("category",)

    @admin.display(description=_("Category"))
    def localized_category(self, obj):
        return get_localized_json_value(obj.category.name) if obj.category else "-"


@admin.register(Subject)
class SubjectAdmin(WithIDAdmin):
    list_display = ("localized_name", "grade")
    search_fields = (
        "name__en",
        "name__ka",
        "name__ru",
        "grade__name",
        "grade__category__name__en",
        "grade__category__name__ka",
        "grade__category__name__ru",
    )
    list_filter = ("grade", "grade__category")
    list_select_related = ("grade", "grade__category")

    @admin.display(description=_("Name"))
    def localized_name(self, obj):
        return get_localized_json_value(obj.name)


class QuestionInline(TabularInline):
    """The exam's questions at a glance; each opens its own page to edit the answers."""

    model = Question
    fields = ("localized_text", "points")
    readonly_fields = ("localized_text",)
    extra = 0
    show_change_link = True
    tab = True

    @admin.display(description=_("Text"))
    def localized_text(self, obj):
        return get_localized_json_value(obj.text) if obj.pk else "-"

    def has_add_permission(self, request, obj=None):
        # The text is translated JSON, edited on the question's own page (Questions → Add).
        return False


@admin.register(Exam)
class ExamAdmin(WithIDAdmin):
    list_display = (
        "localized_title", "subject", "grade", "duration", "question_count", "scheduled_for", "author",
    )
    search_fields = (
        "title__en",
        "title__ka",
        "title__ru",
        "subject__name__en",
        "subject__name__ka",
        "subject__name__ru",
        "grade__name",
    )
    list_filter = ("grade", "subject", "scheduled_for")
    list_select_related = ("subject", "grade", "created_by")
    autocomplete_fields = ("created_by",)
    inlines = (QuestionInline,)
    author = person_column("created_by", _("Created by"))

    def get_queryset(self, request):
        return super().get_queryset(request).annotate(questions_total=Count("questions"))

    @admin.display(description=_("Title"))
    def localized_title(self, obj):
        return get_localized_json_value(obj.title)

    @display(description=_("Questions"), ordering="questions_total", label=True)
    def question_count(self, obj):
        return obj.questions_total


class OptionInline(TabularInline):
    model = Option
    fields = ("title", "is_correct")
    extra = 0


@admin.register(Question)
class QuestionAdmin(WithIDAdmin):
    list_display = ("short_text", "exam", "localized_question_category", "points")
    search_fields = (
        "text__en",
        "text__ka",
        "text__ru",
        "question_category__en",
        "question_category__ka",
        "question_category__ru",
        "exam__title__en",
        "exam__title__ka",
        "exam__title__ru",
    )
    list_filter = ("exam",)
    list_select_related = ("exam",)
    inlines = (OptionInline,)

    @admin.display(description=_("Text"))
    def short_text(self, obj):
        text = get_localized_json_value(obj.text)
        return text[:60] + "..." if len(text) > 60 else text

    @admin.display(description=_("Question category"))
    def localized_question_category(self, obj):
        return get_localized_json_value(obj.question_category)


@admin.register(Option)
class OptionAdmin(WithIDAdmin):
    list_display = ("localized_title", "question", "is_correct")
    search_fields = (
        "title__en",
        "title__ka",
        "title__ru",
        "question__text__en",
        "question__text__ka",
        "question__text__ru",
    )
    list_filter = ("is_correct",)
    list_select_related = ("question",)

    @admin.display(description=_("Title"))
    def localized_title(self, obj):
        return get_localized_json_value(obj.title)


@admin.register(UserExamSession)
class UserExamSessionAdmin(WithIDAdmin):
    list_display = (
        "student",
        "localized_exam",
        "current_question_index",
        "score_so_far",
        "status",
    )
    search_fields = (
        "user__email",
        "exam__title__en",
        "exam__title__ka",
        "exam__title__ru",
    )
    list_filter = ("started", "finished", "is_active", "expired")
    list_select_related = ("user", "exam")
    autocomplete_fields = ("user",)
    student = person_column("user", _("Student"))

    @admin.display(description=_("Exam"))
    def localized_exam(self, obj):
        return get_localized_json_value(obj.exam.title) if obj.exam else "-"

    @display(
        description=_("Status"),
        label={"finished": "success", "expired": "warning", "active": "info", "waiting": None},
    )
    def status(self, obj):
        if obj.finished:
            return "finished", _("Finished")
        if obj.expired:
            return "expired", _("Time ran out")
        if obj.is_active:
            return "active", _("In progress")
        return "waiting", _("Not started")


@admin.register(UserAnswer)
class UserAnswerAdmin(WithIDAdmin):
    list_display = ("session", "localized_question", "localized_answer_option", "is_correct")
    search_fields = (
        "session__user__email",
        "question__text__en",
        "question__text__ka",
        "question__text__ru",
        "answer_option__title__en",
        "answer_option__title__ka",
        "answer_option__title__ru",
    )
    list_filter = ("is_correct",)
    list_select_related = ("session", "session__user", "question", "answer_option")

    @admin.display(description=_("Question"))
    def localized_question(self, obj):
        return get_localized_json_value(obj.question.text) if obj.question else "-"

    @admin.display(description=_("Answer option"))
    def localized_answer_option(self, obj):
        return get_localized_json_value(obj.answer_option.title) if obj.answer_option else "-"


class CommentInline(TabularInline):
    """The announcement's discussion, oldest first, so a teacher or admin can moderate it in place."""

    model = Comment
    fields = ("author", "content", "created_at")
    readonly_fields = ("author", "created_at")
    extra = 0
    tab = True
    show_title = False
    per_page = 20
    ordering = ("created_at",)
    formfield_overrides = {
        **TabularInline.formfield_overrides,
        models.TextField: {"widget": UnfoldAdminTextareaWidget(attrs={"rows": 2})},
    }

    def has_add_permission(self, request, obj=None):
        # Comments are written in the apps, as the person themselves.
        return False

    def get_queryset(self, request):
        return super().get_queryset(request).select_related("user")

    @admin.display(description=_("Author"))
    def author(self, obj):
        return obj.user.get_full_name() or obj.user.email


@admin.register(Announcement)
class AnnouncementAdmin(WithIDAdmin):
    list_display = ("title", "localized_grade", "localized_subject", "author", "comment_count", "created_at")
    search_fields = (
        "title",
        "content",
        "grade__name",
        "grade__category__name__en",
        "grade__category__name__ka",
        "grade__category__name__ru",
        "subject__name__en",
        "subject__name__ka",
        "subject__name__ru",
        "created_by__email",
    )
    list_filter = ("grade", "subject", "created_at")
    list_select_related = ("grade", "grade__category", "subject", "created_by")
    date_hierarchy = "created_at"
    autocomplete_fields = ("created_by",)
    inlines = (CommentInline,)
    author = person_column("created_by", _("Author"))

    def get_queryset(self, request):
        return super().get_queryset(request).annotate(comments_total=visible_comment_count())

    @admin.display(description=_("Grade"))
    def localized_grade(self, obj):
        if not obj.grade:
            return "-"
        category_name = get_localized_json_value(obj.grade.category.name) if obj.grade.category else ""
        return f"{obj.grade.name} {category_name}".strip()

    @admin.display(description=_("Subject"))
    def localized_subject(self, obj):
        return get_localized_json_value(obj.subject.name) if obj.subject else "-"

    @display(description=_("Comments"), ordering="comments_total", label=True)
    def comment_count(self, obj):
        return obj.comments_total


@admin.register(Comment)
class CommentAdmin(WithIDAdmin):
    list_display = ("short_content", "author", "announcement", "created_at")
    search_fields = ("content", "user__email", "announcement__title")
    list_filter = ("created_at",)
    list_select_related = ("user", "announcement")
    date_hierarchy = "created_at"
    readonly_fields = ("user", "announcement", "reply_to", "created_at", "edited_at", "deleted_at")
    author = person_column("user", _("Author"))

    @admin.display(description=_("Content"))
    def short_content(self, obj):
        if obj.is_deleted:
            return _("(deleted)")
        return obj.content[:80] + "..." if len(obj.content) > 80 else obj.content


@admin.register(UserSubjectPoints)
class UserSubjectPointsAdmin(WithIDAdmin):
    list_display = ("student", "localized_subject", "points")
    search_fields = (
        "user__email",
        "subject__name__en",
        "subject__name__ka",
        "subject__name__ru",
    )
    list_filter = ("subject",)
    list_select_related = ("user", "subject")
    autocomplete_fields = ("user",)
    student = person_column("user", _("Student"))

    @admin.display(description=_("Subject"))
    def localized_subject(self, obj):
        return get_localized_json_value(obj.subject.name) if obj.subject else "-"


@admin.register(WeeklyLesson)
class WeeklyLessonAdmin(WithIDAdmin):
    list_display = ("localized_grade", "localized_subject", "teacher_name", "weekday", "start_time", "end_time", "room")
    search_fields = (
        "grade__name",
        "grade__category__name__en",
        "grade__category__name__ka",
        "grade__category__name__ru",
        "subject__name__en",
        "subject__name__ka",
        "subject__name__ru",
        "teacher__email",
        "room",
    )
    list_filter = ("weekday", "grade", "subject")
    list_select_related = ("grade", "grade__category", "subject", "teacher")
    autocomplete_fields = ("teacher",)
    teacher_name = person_column("teacher", _("Teacher"))

    @admin.display(description=_("Grade"))
    def localized_grade(self, obj):
        if not obj.grade:
            return "-"
        category_name = get_localized_json_value(obj.grade.category.name) if obj.grade.category else ""
        return f"{obj.grade.name} {category_name}".strip()

    @admin.display(description=_("Subject"))
    def localized_subject(self, obj):
        return get_localized_json_value(obj.subject.name) if obj.subject else "-"


@admin.register(LessonAttendance)
class LessonAttendanceAdmin(WithIDAdmin):
    list_display = ("lesson", "date", "student_name", "presence", "marked_by_name", "marked_at")
    search_fields = (
        "student__email",
        "lesson__subject__name__en",
        "lesson__subject__name__ka",
        "lesson__subject__name__ru",
        "lesson__grade__name",
    )
    list_filter = ("is_present", "date")
    list_select_related = ("lesson", "lesson__subject", "lesson__grade", "student", "marked_by")
    date_hierarchy = "date"
    autocomplete_fields = ("student", "marked_by")
    student_name = person_column("student", _("Student"))
    marked_by_name = person_column("marked_by", _("Marked by"))

    @display(description=_("Is present"), ordering="is_present", label={"present": "success", "absent": "danger"})
    def presence(self, obj):
        return ("present", _("Present")) if obj.is_present else ("absent", _("Absent"))


@admin.register(ParentStudent)
class ParentStudentAdmin(WithIDAdmin):
    list_display = ("parent_name", "student_name")
    search_fields = ("parent__email", "student__email")
    list_select_related = ("parent", "student")
    autocomplete_fields = ("parent", "student")
    parent_name = person_column("parent", _("Parent"))
    student_name = person_column("student", _("Student"))


@admin.register(DailyExercise)
class DailyExerciseAdmin(WithIDAdmin):
    list_display = ("date", "title", "localized_grade", "localized_subject", "teacher_name", "due_date", "done_count", "created_at")
    search_fields = (
        "title",
        "description",
        "grade__name",
        "grade__category__name__en",
        "grade__category__name__ka",
        "grade__category__name__ru",
        "subject__name__en",
        "subject__name__ka",
        "subject__name__ru",
        "teacher__email",
    )
    list_filter = ("date", "due_date", "grade", "subject")
    list_select_related = ("grade", "grade__category", "subject", "teacher")
    date_hierarchy = "date"
    autocomplete_fields = ("teacher",)
    teacher_name = person_column("teacher", _("Teacher"))

    def get_queryset(self, request):
        return super().get_queryset(request).annotate(completions_total=Count("completions"))

    @admin.display(description=_("Grade"))
    def localized_grade(self, obj):
        if not obj.grade:
            return "-"
        category_name = get_localized_json_value(obj.grade.category.name) if obj.grade.category else ""
        return f"{obj.grade.name} {category_name}".strip()

    @admin.display(description=_("Subject"))
    def localized_subject(self, obj):
        return get_localized_json_value(obj.subject.name) if obj.subject else "-"

    @display(description=_("Done"), ordering="completions_total", label=True)
    def done_count(self, obj):
        return obj.completions_total


@admin.register(SubjectBook)
class SubjectBookAdmin(WithIDAdmin):
    list_display = ("grade_name", "localized_subject", "pdf_file", "uploaded_at")
    list_select_related = ("subject", "subject__grade", "subject__grade__category")
    search_fields = (
        "subject__name__en",
        "subject__name__ka",
        "subject__name__ru",
        "subject__grade__name",
        "subject__grade__category__name__en",
        "subject__grade__category__name__ka",
        "subject__grade__category__name__ru",
    )
    list_filter = ("subject__grade",)

    @admin.display(description=_("Grade"))
    def grade_name(self, obj):
        if obj.subject and obj.subject.grade:
            grade_name = obj.subject.grade.name
            category_name = get_localized_json_value(obj.subject.grade.category.name) if obj.subject.grade.category else ""
            return f"{grade_name} {category_name}".strip()
        return "-"

    @admin.display(description=_("Subject"))
    def localized_subject(self, obj):
        return get_localized_json_value(obj.subject.name) if obj.subject else "-"


@admin.register(PushDevice)
class PushDeviceAdmin(WithIDAdmin):
    list_display = ("owner", "platform", "language", "updated_at")
    search_fields = ("user__email", "token")
    list_filter = ("platform", "language")
    list_select_related = ("user",)
    autocomplete_fields = ("user",)
    owner = person_column("user", _("User"))


@admin.register(UserNotification)
class UserNotificationAdmin(WithIDAdmin):
    list_display = ("recipient", "kind", "created_at", "read_at")
    search_fields = ("user__email",)
    list_filter = ("kind", "created_at")
    list_select_related = ("user",)
    autocomplete_fields = ("user",)
    recipient = person_column("user", _("User"))


@admin.register(ExerciseCompletion)
class ExerciseCompletionAdmin(WithIDAdmin):
    list_display = ("exercise", "student_name", "completed_at")
    search_fields = ("exercise__title", "student__email")
    list_filter = ("completed_at",)
    list_select_related = ("exercise", "student")
    autocomplete_fields = ("student",)
    student_name = person_column("student", _("Student"))


@admin.register(Mark)
class MarkAdmin(WithIDAdmin):
    list_display = ("student_name", "localized_subject", "mark", "date", "teacher_name", "comment")
    search_fields = (
        "student__email",
        "student__first_name",
        "student__last_name",
        "teacher__email",
        "subject__name__en",
        "subject__name__ka",
        "subject__name__ru",
        "comment",
    )
    list_filter = ("date", "value", "subject__grade", "subject")
    list_select_related = ("student", "subject", "teacher")
    date_hierarchy = "date"
    autocomplete_fields = ("student", "teacher")
    student_name = person_column("student", _("Student"))
    teacher_name = person_column("teacher", _("Teacher"))

    @admin.display(description=_("Subject"))
    def localized_subject(self, obj):
        return get_localized_json_value(obj.subject.name)

    @display(
        description=_("Mark"),
        ordering="value",
        label={variant: variant for variant in ("success", "info", "warning", "danger")},
    )
    def mark(self, obj):
        return mark_variant(obj.value), str(obj.value)


admin.site.register(User, UserAdmin)
