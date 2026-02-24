from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
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
    SubjectBook
)
from .forms import UserCreationForm, UserChangeForm




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
        ("Personal info", {
            "fields": (
                "first_name",
                "last_name",
                "role",
                "grade_in",
                "points",
                "subjects_taught",
            )
        }),
        ("Permissions", {
            "fields": (
                "is_staff",
                "is_active",
                "is_superuser",
                "groups",
                "user_permissions",
            )
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




admin.site.register(User, UserAdmin)
admin.site.register(Grade, WithIDAdmin)
admin.site.register(Subject, WithIDAdmin)
admin.site.register(Exam, WithIDAdmin)
admin.site.register(Question, WithIDAdmin)
admin.site.register(Option, WithIDAdmin)
admin.site.register(UserExamSession, WithIDAdmin)
admin.site.register(UserAnswer, WithIDAdmin)
admin.site.register(Announcement, WithIDAdmin)
admin.site.register(GradeCategory, WithIDAdmin)
admin.site.register(UserSubjectPoints, WithIDAdmin)
admin.site.register(WeeklyLesson, WithIDAdmin)
admin.site.register(LessonAttendance, WithIDAdmin)
admin.site.register(ParentStudent, WithIDAdmin)
admin.site.register(DailyExercise, WithIDAdmin)



@admin.register(SubjectBook)
class SubjectBookAdmin(WithIDAdmin):
    list_display = ("grade_name", "subject", "pdf_file", "uploaded_at")
    list_select_related = ("subject", "subject__grade")
    search_fields = ("subject__name", "subject__grade__name")
    list_filter = ("subject__grade",)

    @admin.display(description="Grade")
    def grade_name(self, obj):
        return obj.subject.grade.name if obj.subject and obj.subject.grade else "-"