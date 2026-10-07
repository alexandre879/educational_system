from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.utils.translation import gettext_lazy as _

from .translation import get_localized_json_value

from .models import (
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
    SubjectBook,
)
from .forms import UserCreationForm, UserChangeForm


admin.site.site_header = _("BlueWeb Administration")
admin.site.site_title = _("BlueWeb Admin")
admin.site.index_title = _("Welcome to BlueWeb Control Panel")
admin.site.site_url = "https://blueapp.store"


class WithIDAdmin(admin.ModelAdmin):
    def get_list_display(self, request):
        return ("id",) + tuple(super().get_list_display(request))


class UserAdmin(BaseUserAdmin):
    form = UserChangeForm
    add_form = UserCreationForm

    list_display = (
        "email",
        "first_name",
        "last_name",
        "role",
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
    filter_horizontal = ("groups", "user_permissions", "subjects_taught")

    def get_list_display(self, request):
        return ("id",) + self.list_display


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


@admin.register(Exam)
class ExamAdmin(WithIDAdmin):
    list_display = ("localized_title", "subject", "grade", "duration", "scheduled_for", "created_by")
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

    @admin.display(description=_("Title"))
    def localized_title(self, obj):
        return get_localized_json_value(obj.title)


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

    @admin.display(description=_("Title"))
    def localized_title(self, obj):
        return get_localized_json_value(obj.title)


@admin.register(UserExamSession)
class UserExamSessionAdmin(WithIDAdmin):
    list_display = (
        "user",
        "localized_exam",
        "current_question_index",
        "score_so_far",
        "started",
        "finished",
        "is_active",
        "expired",
    )
    search_fields = (
        "user__email",
        "exam__title__en",
        "exam__title__ka",
        "exam__title__ru",
    )
    list_filter = ("started", "finished", "is_active", "expired")
    list_select_related = ("user", "exam")

    @admin.display(description=_("Exam"))
    def localized_exam(self, obj):
        return get_localized_json_value(obj.exam.title) if obj.exam else "-"


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

    @admin.display(description=_("Question"))
    def localized_question(self, obj):
        return get_localized_json_value(obj.question.text) if obj.question else "-"

    @admin.display(description=_("Answer option"))
    def localized_answer_option(self, obj):
        return get_localized_json_value(obj.answer_option.title) if obj.answer_option else "-"


@admin.register(Announcement)
class AnnouncementAdmin(WithIDAdmin):
    list_display = ("title", "localized_grade", "localized_subject", "created_by", "created_at")
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

    @admin.display(description=_("Grade"))
    def localized_grade(self, obj):
        if not obj.grade:
            return "-"
        category_name = get_localized_json_value(obj.grade.category.name) if obj.grade.category else ""
        return f"{obj.grade.name} {category_name}".strip()

    @admin.display(description=_("Subject"))
    def localized_subject(self, obj):
        return get_localized_json_value(obj.subject.name) if obj.subject else "-"


@admin.register(UserSubjectPoints)
class UserSubjectPointsAdmin(WithIDAdmin):
    list_display = ("user", "localized_subject", "points")
    search_fields = (
        "user__email",
        "subject__name__en",
        "subject__name__ka",
        "subject__name__ru",
    )
    list_filter = ("subject",)
    list_select_related = ("user", "subject")

    @admin.display(description=_("Subject"))
    def localized_subject(self, obj):
        return get_localized_json_value(obj.subject.name) if obj.subject else "-"


@admin.register(WeeklyLesson)
class WeeklyLessonAdmin(WithIDAdmin):
    list_display = ("localized_grade", "localized_subject", "teacher", "weekday", "start_time", "end_time", "room")
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
    list_display = ("lesson", "date", "student", "is_present", "marked_by", "marked_at")
    search_fields = (
        "student__email",
        "lesson__subject__name__en",
        "lesson__subject__name__ka",
        "lesson__subject__name__ru",
        "lesson__grade__name",
    )
    list_filter = ("is_present", "date")
    list_select_related = ("lesson", "lesson__subject", "lesson__grade", "student", "marked_by")


@admin.register(ParentStudent)
class ParentStudentAdmin(WithIDAdmin):
    list_display = ("parent", "student")
    search_fields = ("parent__email", "student__email")
    list_select_related = ("parent", "student")


@admin.register(DailyExercise)
class DailyExerciseAdmin(WithIDAdmin):
    list_display = ("date", "title", "localized_grade", "localized_subject", "teacher", "due_date", "created_at")
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

    @admin.display(description=_("Grade"))
    def localized_grade(self, obj):
        if not obj.grade:
            return "-"
        category_name = get_localized_json_value(obj.grade.category.name) if obj.grade.category else ""
        return f"{obj.grade.name} {category_name}".strip()

    @admin.display(description=_("Subject"))
    def localized_subject(self, obj):
        return get_localized_json_value(obj.subject.name) if obj.subject else "-"


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
    list_display = ("user", "platform", "language", "updated_at")
    search_fields = ("user__email", "token")
    list_filter = ("platform", "language")
    list_select_related = ("user",)


@admin.register(ExerciseCompletion)
class ExerciseCompletionAdmin(WithIDAdmin):
    list_display = ("exercise", "student", "completed_at")
    search_fields = ("exercise__title", "student__email")
    list_filter = ("completed_at",)
    list_select_related = ("exercise", "student")


@admin.register(Mark)
class MarkAdmin(WithIDAdmin):
    list_display = ("student", "localized_subject", "value", "date", "teacher", "comment")
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

    @admin.display(description=_("Subject"))
    def localized_subject(self, obj):
        return get_localized_json_value(obj.subject.name)


admin.site.register(User, UserAdmin)