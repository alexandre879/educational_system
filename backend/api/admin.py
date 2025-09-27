from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import User, Grade, Subject, Exam, Question, Option, UserExamSession, UserAnswer, Announcement, GradeCategory
from .forms import UserCreationForm, UserChangeForm


class UserAdmin(BaseUserAdmin):
    form = UserChangeForm
    add_form = UserCreationForm

    list_display = ("email", "first_name", "last_name", "role", "grade_in", "points", "is_staff", "is_active")
    list_filter = ("is_staff", "is_active", "role", "grade_in")
    
    fieldsets = (
        (None, {"fields": ("email", "password")}),
        ("Personal info", {
            "fields": (
                "first_name", "last_name", "role", "grade_in", "points", "subjects_taught"
            )
        }),
        ("Permissions", {
            "fields": ("is_staff", "is_active", "is_superuser", "groups", "user_permissions")
        }),
    )
    
    add_fieldsets = (
        (None, {
            "classes": ("wide",),
            "fields": (
                "email", "first_name", "last_name", "role", "grade_in", "points",
                "subjects_taught", "password1", "password2", "is_staff", "is_active"
            ),
        }),
    )
    
    search_fields = ("email", "first_name", "last_name")
    ordering = ("email",)
    filter_horizontal = ("groups", "user_permissions", "subjects_taught") 


admin.site.register(User, UserAdmin)
admin.site.register(Grade)
admin.site.register(Subject)
admin.site.register(Exam)
admin.site.register(Question)
admin.site.register(Option)
admin.site.register(UserExamSession)
admin.site.register(UserAnswer)
admin.site.register(Announcement)
admin.site.register(GradeCategory)
