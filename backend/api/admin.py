from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.utils.translation import gettext_lazy as _

from .models import (
    DailyExercise,
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
        "profilePic",
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
    list_display = ("sign_name", "name")
    search_fields = ("sign_name", "name")


@admin.register(Grade)
class GradeAdmin(WithIDAdmin):
    list_display = ("name", "category")
    search_fields = ("name", "category__name")
    list_filter = ("category",)
    list_select_related = ("category",)


@admin.register(Subject)
class SubjectAdmin(WithIDAdmin):
    list_display = ("sign_name", "name", "grade")
    search_fields = ("name", "sign_name", "grade__name", "grade__category__name")
    list_filter = ("grade", "grade__category")
    list_select_related = ("grade", "grade__category")


@admin.register(Exam)
class ExamAdmin(WithIDAdmin):
    list_display = ("sign_name", "duration")
    search_fields = ("title", "subject__name", "grade__name")
    list_filter = ("grade", "subject")
    list_select_related = ("subject", "grade")


@admin.register(Question)
class QuestionAdmin(WithIDAdmin):
    list_display = ("sign_name", "short_text", "exam", "question_category", "points")
    search_fields = ("text", "exam__title", "question_category")
    list_filter = ("exam",)

    @admin.display(description=_("Text"))
    def short_text(self, obj):
        return obj.text[:60] + "..." if len(obj.text) > 60 else obj.text


@admin.register(Option)
class OptionAdmin(WithIDAdmin):
    list_display = ("title", "question", "is_correct")
    search_fields = ("title", "question__text")
    list_filter = ("is_correct",)


@admin.register(UserExamSession)
class UserExamSessionAdmin(WithIDAdmin):
    list_display = (
        "user",
        "exam",
        "current_question_index",
        "score_so_far",
        "started",
        "finished",
        "is_active",
        "expired",
    )
    search_fields = ("user__email", "exam__title")
    list_filter = ("started", "finished", "is_active", "expired")
    list_select_related = ("user", "exam")


@admin.register(UserAnswer)
class UserAnswerAdmin(WithIDAdmin):
    list_display = ("session", "question", "answer_option", "is_correct")
    search_fields = (
        "session__user__email",
        "question__text",
        "answer_option__title",
    )
    list_filter = ("is_correct",)


@admin.register(Announcement)
class AnnouncementAdmin(WithIDAdmin):
    list_display = ("title", "grade", "subject", "created_by", "created_at")
    search_fields = (
        "title",
        "content",
        "grade__name",
        "subject__name",
        "created_by__email",
    )
    list_filter = ("grade", "subject", "created_at")
    list_select_related = ("grade", "subject", "created_by")


@admin.register(UserSubjectPoints)
class UserSubjectPointsAdmin(WithIDAdmin):
    list_display = ("user", "subject", "points")
    search_fields = ("user__email", "subject__name")
    list_filter = ("subject",)
    list_select_related = ("user", "subject")


@admin.register(WeeklyLesson)
class WeeklyLessonAdmin(WithIDAdmin):
    list_display = ("grade", "subject", "teacher", "weekday", "start_time", "end_time", "room")
    search_fields = ("grade__name", "subject__name", "teacher__email", "room")
    list_filter = ("weekday", "grade", "subject")
    list_select_related = ("grade", "subject", "teacher")


@admin.register(LessonAttendance)
class LessonAttendanceAdmin(WithIDAdmin):
    list_display = ("lesson", "date", "student", "is_present", "marked_by", "marked_at")
    search_fields = ("student__email", "lesson__subject__name", "lesson__grade__name")
    list_filter = ("is_present", "date")
    list_select_related = ("lesson", "student", "marked_by")


@admin.register(ParentStudent)
class ParentStudentAdmin(WithIDAdmin):
    list_display = ("parent", "student")
    search_fields = ("parent__email", "student__email")
    list_select_related = ("parent", "student")


@admin.register(DailyExercise)
class DailyExerciseAdmin(WithIDAdmin):
    list_display = ("date", "title", "grade", "subject", "teacher", "due_date", "created_at")
    search_fields = ("title", "description", "grade__name", "subject__name", "teacher__email")
    list_filter = ("date", "due_date", "grade", "subject")
    list_select_related = ("grade", "subject", "teacher")


@admin.register(SubjectBook)
class SubjectBookAdmin(WithIDAdmin):
    list_display = ("grade_name", "subject", "pdf_file", "uploaded_at")
    list_select_related = ("subject", "subject__grade")
    search_fields = ("subject__name", "subject__grade__name")
    list_filter = ("subject__grade",)

    @admin.display(description=_("Grade"))
    def grade_name(self, obj):
        return obj.subject.grade.name if obj.subject and obj.subject.grade else "-"


admin.site.register(User, UserAdmin)