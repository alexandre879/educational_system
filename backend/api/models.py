from django.contrib.auth.models import AbstractUser
from django.core.exceptions import ValidationError
from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models
from django.db.models import F
from django.db.models.functions import Coalesce
from django.utils import timezone
from django.utils.translation import gettext_lazy as _

from api.managers import UserManager

from .storage import BookStorage, ProfilePicStorage
from .translation import get_localized_json_value
from .utils import normalize_image_to_square


PROFILE_PIC_SIZE = 512

# Georgian schools mark on a 1–10 scale.
MIN_MARK = 1
MAX_MARK = 10


class GradeCategory(models.Model):
    name = models.JSONField(_("Name"), default=dict)

    class Meta:
        verbose_name = _("Grade category")
        verbose_name_plural = _("Grade categories")

    def __str__(self):
        return get_localized_json_value(self.name)

    def get_name(self, locale: str) -> str:
        return get_localized_json_value(self.name, locale)


class Grade(models.Model):
    name = models.CharField(_("Name"), max_length=50)
    category = models.ForeignKey(
        GradeCategory,
        verbose_name=_("Category"),
        on_delete=models.CASCADE,
        blank=True,
        null=True,
    )

    class Meta:
        verbose_name = _("Grade")
        verbose_name_plural = _("Grades")

    def __str__(self):
        if self.category:
            return f"{self.name} {self.category}"
        return self.name


class Subject(models.Model):
    class ContentMode(models.TextChoices):
        FIXED = "fixed", _("Fixed language")
        LOCALE = "locale", _("Follow website locale")

    class LanguageCode(models.TextChoices):
        KA = "ka", _("Georgian")
        EN = "en", _("English")
        RU = "ru", _("Russian")

    name = models.JSONField(_("Name"), default=dict)
    grade = models.ForeignKey(
        Grade,
        verbose_name=_("Grade"),
        on_delete=models.CASCADE,
        related_name="subjects",
    )
    content_mode = models.CharField(
        _("Content mode"),
        max_length=10,
        choices=ContentMode.choices,
        default=ContentMode.LOCALE,
    )
    fixed_language = models.CharField(
        _("Fixed language"),
        max_length=5,
        choices=LanguageCode.choices,
        blank=True,
        null=True,
    )

    class Meta:
        verbose_name = _("Subject")
        verbose_name_plural = _("Subjects")

    def __str__(self):
        subject_name = get_localized_json_value(self.name)
        return f"{subject_name} ({self.grade})"

    def clean(self):
        if self.content_mode == self.ContentMode.FIXED and not self.fixed_language:
            raise ValidationError(
                {"fixed_language": _("Fixed language is required for fixed mode.")}
            )

        if self.content_mode == self.ContentMode.LOCALE:
            self.fixed_language = None

    def get_exam_language(self, locale: str) -> str:
        if self.content_mode == self.ContentMode.FIXED and self.fixed_language:
            return self.fixed_language
        return locale

    def get_name(self, locale: str) -> str:
        return get_localized_json_value(self.name, locale)


class User(AbstractUser):
    class Role(models.TextChoices):
        STUDENT = "student", _("Student")
        TEACHER = "teacher", _("Teacher")
        ADMIN = "admin", _("Admin")
        PARENT = "parent", _("Parent")
        SPECTATOR = "spectator", _("Spectator")

    # The roles a spectator can look at the site as (one linked account per role).
    SPECTATOR_VIEW_ROLES = (Role.STUDENT, Role.TEACHER, Role.PARENT)

    email = models.CharField(_("Email"), max_length=255, unique=True)
    password = models.CharField(_("Password"), max_length=255, default=None, null=True)
    chat_id = models.CharField(_("Chat ID"), max_length=255, default=None, null=True)
    # The school bot's language for this person ("" = Georgian) and whether it forwards notifications.
    telegram_language = models.CharField(_("Telegram language"), max_length=8, blank=True, default="")
    telegram_notifications = models.BooleanField(_("Telegram notifications"), default=True)
    role = models.CharField(_("Role"), max_length=255, choices=Role.choices, null=True, blank=True)
    grade_in = models.ForeignKey(
        Grade,
        verbose_name=_("Grade"),
        on_delete=models.SET_NULL,
        related_name="users",
        null=True,
        blank=True,
    )
    points = models.IntegerField(_("Points"), null=True, default=None)
    subjects_taught = models.ManyToManyField(
        Subject,
        verbose_name=_("Subjects taught"),
        related_name="teachers",
        blank=True,
    )
    profilePic = models.ImageField(
        _("Profile picture"),
        storage=ProfilePicStorage(),
        blank=True,
        null=True,
    )
    # Only for spectator accounts: visitors see the site read-only as one of these people.
    spectator_views = models.ManyToManyField(
        "self",
        verbose_name=_("Spectators view the site as"),
        help_text=_("Pick one student, one teacher and one parent. Spectators see what they see, read-only."),
        symmetrical=False,
        related_name="spectated_by",
        limit_choices_to={"role__in": SPECTATOR_VIEW_ROLES},
        blank=True,
    )

    username = None
    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = []

    objects = UserManager()

    class Meta:
        verbose_name = _("User")
        verbose_name_plural = _("Users")
        constraints = [
            # Every visitor shares the one spectator account (each with their own session).
            models.UniqueConstraint(
                fields=["role"],
                condition=models.Q(role="spectator"),
                name="single_spectator_account",
                violation_error_message=_("There can only be one spectator account; every visitor shares it."),
            ),
        ]

    def __str__(self):
        if self.role == self.Role.STUDENT:
            grade_name = str(self.grade_in) if self.grade_in else "No Grade"
            return f"{self.email} ({self.role}, {grade_name})"

        if self.role == self.Role.TEACHER:
            subjects = ", ".join(
                get_localized_json_value(s.name) for s in self.subjects_taught.all()
            )
            return f"{self.email} ({self.role}, teaches: {subjects})"

        return f"{self.email} ({self.role})"

    def save(self, *args, **kwargs):
        update_fields = kwargs.get("update_fields")
        pic = self.profilePic

        # Only a freshly assigned upload is uncommitted; resize it once, before
        # it is sent to storage, instead of re-processing on every save.
        if (
            pic
            and not pic._committed
            and (update_fields is None or "profilePic" in update_fields)
        ):
            self.profilePic = normalize_image_to_square(pic.file, size=PROFILE_PIC_SIZE)

        super().save(*args, **kwargs)


class PushDevice(models.Model):
    """A phone with the mobile app installed, identified by its Expo push token."""

    class Platform(models.TextChoices):
        IOS = "ios", "iOS"
        ANDROID = "android", "Android"

    user = models.ForeignKey(
        User,
        verbose_name=_("User"),
        on_delete=models.CASCADE,
        related_name="push_devices",
    )
    token = models.CharField(_("Push token"), max_length=255, unique=True)
    platform = models.CharField(_("Platform"), max_length=10, choices=Platform.choices, blank=True)
    # Language the app was set to, so notifications arrive in it.
    language = models.CharField(_("Language"), max_length=5, default="ka")
    created_at = models.DateTimeField(_("Created at"), auto_now_add=True)
    updated_at = models.DateTimeField(_("Updated at"), auto_now=True)

    class Meta:
        verbose_name = _("Push device")
        verbose_name_plural = _("Push devices")

    def __str__(self):
        return f"{self.user.email} ({self.platform or 'unknown'})"


class UserNotification(models.Model):
    """
    One notification in someone's inbox (the bell on the website and in the app). Saved for every
    notification sent through api.push, in all languages, so it shows in whichever one is chosen.
    """

    user = models.ForeignKey(
        User,
        verbose_name=_("User"),
        on_delete=models.CASCADE,
        related_name="notifications",
    )
    # announcement, exercise, exam, mark or attendance: what the notification is about.
    kind = models.CharField(_("Kind"), max_length=32, blank=True)
    title = models.JSONField(_("Title"), default=dict)
    body = models.JSONField(_("Body"), default=dict)
    # What to open (the same data the phone notification carries).
    data = models.JSONField(_("Data"), default=dict, blank=True)
    created_at = models.DateTimeField(_("Created at"), auto_now_add=True, db_index=True)
    read_at = models.DateTimeField(_("Read at"), null=True, blank=True)

    class Meta:
        verbose_name = _("Notification")
        verbose_name_plural = _("Notifications")
        ordering = ["-created_at", "-id"]
        indexes = [models.Index(fields=["user", "read_at"], name="notification_user_unread")]

    def __str__(self):
        return f"{self.user.email}: {self.kind or 'notification'}"


class ParentStudent(models.Model):
    parent = models.ForeignKey(
        User,
        verbose_name=_("Parent"),
        on_delete=models.CASCADE,
        related_name="children_links",
        limit_choices_to={"role": User.Role.PARENT},
    )
    student = models.ForeignKey(
        User,
        verbose_name=_("Student"),
        on_delete=models.CASCADE,
        related_name="parent_links",
        limit_choices_to={"role": User.Role.STUDENT},
    )

    class Meta:
        verbose_name = _("Parent student link")
        verbose_name_plural = _("Parent student links")
        constraints = [
            models.UniqueConstraint(fields=["parent", "student"], name="unique_parent_student")
        ]

    def __str__(self):
        return f"{self.parent.email} -> {self.student.email}"


class UserSubjectPoints(models.Model):
    user = models.ForeignKey(User, verbose_name=_("User"), on_delete=models.CASCADE)
    subject = models.ForeignKey(Subject, verbose_name=_("Subject"), on_delete=models.CASCADE)
    points = models.IntegerField(_("Points"), default=0)

    class Meta:
        verbose_name = _("User subject points")
        verbose_name_plural = _("User subject points")
        unique_together = ("user", "subject")

    def __str__(self):
        return f"{self.user.email} - {get_localized_json_value(self.subject.name)} ({self.points} points)"


class Exam(models.Model):
    title = models.JSONField(_("Title"), default=dict)
    subject = models.ForeignKey(
        Subject,
        verbose_name=_("Subject"),
        on_delete=models.CASCADE,
        related_name="exams",
    )
    grade = models.ForeignKey(
        Grade,
        verbose_name=_("Grade"),
        on_delete=models.CASCADE,
        related_name="exams",
    )
    duration = models.PositiveIntegerField(
        _("Duration in minutes"),
        help_text=_("Duration in minutes"),
    )
    # Optional: the day the exam is planned for, shown in students' calendars.
    scheduled_for = models.DateField(_("Scheduled for"), null=True, blank=True)
    created_by = models.ForeignKey(
        User,
        verbose_name=_("Created by"),
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="created_exams",
    )
    created_at = models.DateTimeField(_("Created at"), auto_now_add=True, null=True)

    class Meta:
        verbose_name = _("Exam")
        verbose_name_plural = _("Exams")

    def __str__(self):
        exam_title = get_localized_json_value(self.title)
        return f"{exam_title} ({self.subject})"

    def get_title(self, lang: str):
        return get_localized_json_value(self.title, lang)


class Question(models.Model):
    exam = models.ForeignKey(
        Exam,
        verbose_name=_("Exam"),
        on_delete=models.CASCADE,
        related_name="questions",
    )
    question_category = models.JSONField(_("Question category"), default=dict, blank=True)
    text = models.JSONField(_("Text"), default=dict)
    points = models.PositiveIntegerField(_("Points"), default=1)

    class Meta:
        verbose_name = _("Question")
        verbose_name_plural = _("Questions")

    def __str__(self):
        return f"{self.exam} - Question #{self.pk}"

    def get_text(self, lang: str) -> str:
        return get_localized_json_value(self.text, lang)

    def get_category(self, lang: str) -> str:
        return get_localized_json_value(self.question_category, lang)


class Option(models.Model):
    question = models.ForeignKey(
        Question,
        verbose_name=_("Question"),
        on_delete=models.CASCADE,
        related_name="options",
    )
    title = models.JSONField(_("Title"), default=dict)
    is_correct = models.BooleanField(_("Is correct"), default=False)

    class Meta:
        verbose_name = _("Option")
        verbose_name_plural = _("Options")

    def __str__(self):
        return get_localized_json_value(self.title) or str(self.pk)

    def get_title(self, lang: str) -> str:
        return get_localized_json_value(self.title, lang)


class UserExamSession(models.Model):
    user = models.ForeignKey(
        User,
        verbose_name=_("User"),
        on_delete=models.CASCADE,
        related_name="exam_sessions",
    )
    exam = models.ForeignKey(
        Exam,
        verbose_name=_("Exam"),
        on_delete=models.CASCADE,
        related_name="sessions",
    )
    current_question_index = models.PositiveIntegerField(_("Current question index"), default=0)
    score_so_far = models.IntegerField(_("Score so far"), default=0)
    started = models.BooleanField(_("Started"), null=True, blank=True)
    finished = models.BooleanField(_("Finished"), null=True, blank=True)

    started_at = models.DateTimeField(_("Started at"), auto_now_add=True, null=True, blank=True)
    ends_at = models.DateTimeField(_("Ends at"), null=True, blank=True)

    submitted_at = models.DateTimeField(_("Submitted at"), null=True, blank=True)
    is_active = models.BooleanField(_("Is active"), default=True)
    expired = models.BooleanField(_("Expired"), default=False)

    class Meta:
        verbose_name = _("User exam session")
        verbose_name_plural = _("User exam sessions")

    def __str__(self):
        return f"{self.user.email} - {get_localized_json_value(self.exam.title)}"

    @property
    def is_expired(self) -> bool:
        return self.ends_at is not None and timezone.now() >= self.ends_at

    def start(self):
        if not self.started_at:
            self.started_at = timezone.now()

        if not self.ends_at:
            self.ends_at = self.started_at + timezone.timedelta(minutes=self.exam.duration)

        self.started = True
        self.is_active = True
        self.save(update_fields=["started_at", "ends_at", "started", "is_active"])

    def finish(self, *, timed_out: bool = False) -> None:
        """
        Close the session and credit its score to the student's global and
        per-subject points. Idempotent: a finished session is never credited twice.

        Callers must hold a row lock on the session (``select_for_update``)
        inside a transaction so concurrent requests cannot both credit it.
        """
        if self.finished:
            return

        self.finished = True
        self.is_active = False
        self.expired = timed_out
        self.submitted_at = self.submitted_at or timezone.now()
        self.save(
            update_fields=[
                "finished",
                "is_active",
                "expired",
                "submitted_at",
                "score_so_far",
                "current_question_index",
            ]
        )

        score = self.score_so_far
        User.objects.filter(pk=self.user_id).update(points=Coalesce(F("points"), 0) + score)

        subject_points, _ = UserSubjectPoints.objects.get_or_create(
            user_id=self.user_id,
            subject_id=self.exam.subject_id,
            defaults={"points": 0},
        )
        UserSubjectPoints.objects.filter(pk=subject_points.pk).update(points=F("points") + score)


class UserAnswer(models.Model):
    session = models.ForeignKey(
        UserExamSession,
        verbose_name=_("Session"),
        on_delete=models.CASCADE,
        related_name="answers",
        null=True,
    )
    question = models.ForeignKey(
        Question,
        verbose_name=_("Question"),
        on_delete=models.CASCADE,
        related_name="user_answers",
        null=True,
    )
    answer_option = models.ForeignKey(
        Option,
        verbose_name=_("Answer option"),
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="user_answers",
    )
    is_correct = models.BooleanField(_("Is correct"), default=False)

    class Meta:
        verbose_name = _("User answer")
        verbose_name_plural = _("User answers")

    def __str__(self):
        user = self.session.user.email if self.session else "Unknown User"
        question = self.question.pk if self.question else "Unknown"
        verdict = "Correct" if self.is_correct else "Wrong"
        return f"{user} - Q{question} ({verdict})"


class Announcement(models.Model):
    title = models.CharField(_("Title"), max_length=255)
    content = models.TextField(_("Content"))
    grade = models.ForeignKey(
        Grade,
        verbose_name=_("Grade"),
        on_delete=models.CASCADE,
        related_name="announcements",
    )
    subject = models.ForeignKey(
        Subject,
        verbose_name=_("Subject"),
        on_delete=models.CASCADE,
        related_name="announcements",
        null=True,
        blank=True,
    )
    created_by = models.ForeignKey(
        User,
        verbose_name=_("Created by"),
        on_delete=models.CASCADE,
        related_name="announcements",
    )
    created_at = models.DateTimeField(_("Created at"), auto_now_add=True)

    class Meta:
        verbose_name = _("Announcement")
        verbose_name_plural = _("Announcements")

    def __str__(self):
        if self.subject:
            return f"{self.title} - {self.subject}"
        return f"{self.title} - {self.grade} - Global"


class Comment(models.Model):
    content = models.TextField(_("Content"))
    announcement = models.ForeignKey(
        Announcement,
        verbose_name=_("Announcement"),
        on_delete=models.CASCADE,
        related_name="comments",
        null=True,
        blank=True,
    )
    user = models.ForeignKey(
        User,
        verbose_name=_("User"),
        on_delete=models.CASCADE,
        related_name="comments",
    )
    reply_to = models.ForeignKey(
        "self",
        verbose_name=_("Reply to"),
        on_delete=models.SET_NULL,
        related_name="replies",
        null=True,
        blank=True,
    )
    created_at = models.DateTimeField(_("Created at"), auto_now_add=True, null=True, blank=True)
    edited_at = models.DateTimeField(_("Edited at"), null=True, blank=True)
    # Deleted messages stay as a placeholder so replies to them still make sense.
    deleted_at = models.DateTimeField(_("Deleted at"), null=True, blank=True)

    class Meta:
        verbose_name = _("Comment")
        verbose_name_plural = _("Comments")

    def __str__(self):
        return f"comment of: {self.user.email}"

    @property
    def is_deleted(self) -> bool:
        return self.deleted_at is not None


def visible_comment_count() -> models.Count:
    """Annotation for an announcement's number of comments, leaving out deleted ones."""
    return models.Count("comments", filter=models.Q(comments__deleted_at__isnull=True))


class CommentReaction(models.Model):
    """One emoji per person on a comment; reacting again with another emoji replaces it."""

    EMOJIS = ("👍", "❤️", "😂", "😮", "🎉", "🙏")

    comment = models.ForeignKey(
        Comment,
        verbose_name=_("Comment"),
        on_delete=models.CASCADE,
        related_name="reactions",
    )
    user = models.ForeignKey(
        User,
        verbose_name=_("User"),
        on_delete=models.CASCADE,
        related_name="comment_reactions",
    )
    emoji = models.CharField(_("Emoji"), max_length=16, choices=[(emoji, emoji) for emoji in EMOJIS])
    created_at = models.DateTimeField(_("Created at"), auto_now_add=True)

    class Meta:
        verbose_name = _("Reaction")
        verbose_name_plural = _("Reactions")
        constraints = [
            models.UniqueConstraint(fields=["comment", "user"], name="unique_comment_reaction"),
        ]

    def __str__(self):
        return f"{self.emoji} by {self.user.email}"


class WeeklyLesson(models.Model):
    class WeekDay(models.IntegerChoices):
        MON = 1, _("Mon")
        TUE = 2, _("Tue")
        WED = 3, _("Wed")
        THU = 4, _("Thu")
        FRI = 5, _("Fri")
        SAT = 6, _("Sat")
        SUN = 7, _("Sun")

    grade = models.ForeignKey(
        Grade,
        verbose_name=_("Grade"),
        on_delete=models.CASCADE,
        related_name="weekly_lessons",
    )
    subject = models.ForeignKey(
        Subject,
        verbose_name=_("Subject"),
        on_delete=models.CASCADE,
        related_name="weekly_lessons",
    )
    teacher = models.ForeignKey(
        User,
        verbose_name=_("Teacher"),
        related_name="weekly_lessons",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        limit_choices_to={"role": "teacher"},
    )

    weekday = models.IntegerField(_("Weekday"), choices=WeekDay.choices)
    start_time = models.TimeField(_("Start time"))
    end_time = models.TimeField(_("End time"))
    room = models.CharField(_("Room"), max_length=50, null=True, blank=True)

    class Meta:
        verbose_name = _("Weekly lesson")
        verbose_name_plural = _("Weekly lessons")
        ordering = ["weekday", "start_time"]
        constraints = [
            models.UniqueConstraint(
                fields=["grade", "weekday", "start_time"],
                name="unique_grade_weekday_start",
            ),
        ]

    def clean(self):
        if self.end_time <= self.start_time:
            raise ValidationError({"end_time": _("end_time must be after start_time.")})

        if self.subject_id and self.grade_id and self.subject.grade_id != self.grade_id:
            raise ValidationError({"subject": _("Subject must belong to the selected grade.")})

        qs = WeeklyLesson.objects.filter(grade=self.grade, weekday=self.weekday)
        if self.pk:
            qs = qs.exclude(pk=self.pk)

        if qs.filter(start_time__lt=self.end_time, end_time__gt=self.start_time).exists():
            raise ValidationError(_("This time overlaps an existing lesson for this grade/day."))

    def save(self, *args, **kwargs):
        self.full_clean()
        return super().save(*args, **kwargs)

    def __str__(self):
        subject_name = get_localized_json_value(self.subject.name) if self.subject else ""
        category_name = (
            get_localized_json_value(self.grade.category.name)
            if self.grade and self.grade.category
            else ""
        )

        return f"{self.grade.name} {category_name} {self.weekday} {self.start_time}-{self.end_time} {subject_name}"


class LessonAttendance(models.Model):
    lesson = models.ForeignKey(
        WeeklyLesson,
        verbose_name=_("Lesson"),
        on_delete=models.CASCADE,
        related_name="attendance",
    )
    date = models.DateField(_("Date"))
    student = models.ForeignKey(
        User,
        verbose_name=_("Student"),
        on_delete=models.CASCADE,
        related_name="lesson_attendance",
    )
    is_present = models.BooleanField(_("Is present"), default=True)
    marked_by = models.ForeignKey(
        User,
        verbose_name=_("Marked by"),
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="marked_attendance",
    )
    marked_at = models.DateTimeField(_("Marked at"), auto_now=True)

    class Meta:
        verbose_name = _("Lesson attendance")
        verbose_name_plural = _("Lesson attendance")
        constraints = [
            models.UniqueConstraint(fields=["lesson", "date", "student"], name="unique_attendance_per_lesson_day_student")
        ]

    def __str__(self):
        return f"{self.date} {self.lesson} {self.student.email} {'P' if self.is_present else 'A'}"


class DailyExercise(models.Model):
    grade = models.ForeignKey(
        Grade,
        verbose_name=_("Grade"),
        on_delete=models.CASCADE,
        related_name="daily_exercises",
    )
    subject = models.ForeignKey(
        Subject,
        verbose_name=_("Subject"),
        on_delete=models.CASCADE,
        related_name="daily_exercises",
        null=True,
        blank=True,
    )
    teacher = models.ForeignKey(
        User,
        verbose_name=_("Teacher"),
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="assigned_exercises",
        limit_choices_to={"role": User.Role.TEACHER},
    )

    date = models.DateField(_("Date"))
    title = models.CharField(_("Title"), max_length=255)
    description = models.TextField(_("Description"), blank=True, null=True)

    due_date = models.DateField(_("Due date"), null=True, blank=True)
    created_at = models.DateTimeField(_("Created at"), auto_now_add=True)

    class Meta:
        verbose_name = _("Daily exercise")
        verbose_name_plural = _("Daily exercises")
        ordering = ["-date", "-created_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["grade", "subject", "date", "title"],
                name="unique_grade_subject_date_title_exercise",
            )
        ]

    def clean(self):
        if self.subject_id and self.grade_id and self.subject.grade_id != self.grade_id:
            raise ValidationError({"subject": _("Subject must belong to the selected grade.")})

    def save(self, *args, **kwargs):
        self.full_clean()
        return super().save(*args, **kwargs)

    def __str__(self):
        subject_name = get_localized_json_value(self.subject.name) if self.subject else "General"
        return f"{self.date} | {self.grade} | {subject_name} | {self.title}"


class ExerciseCompletion(models.Model):
    """A student marked a daily exercise as done."""

    exercise = models.ForeignKey(
        DailyExercise,
        verbose_name=_("Exercise"),
        on_delete=models.CASCADE,
        related_name="completions",
    )
    student = models.ForeignKey(
        User,
        verbose_name=_("Student"),
        on_delete=models.CASCADE,
        related_name="exercise_completions",
    )
    completed_at = models.DateTimeField(_("Completed at"), auto_now_add=True)

    class Meta:
        verbose_name = _("Exercise completion")
        verbose_name_plural = _("Exercise completions")
        constraints = [
            models.UniqueConstraint(fields=["exercise", "student"], name="unique_exercise_completion")
        ]

    def __str__(self):
        return f"{self.student.email} ✓ {self.exercise.title}"


class Mark(models.Model):
    """A gradebook entry: a teacher's mark for a student in one subject."""

    student = models.ForeignKey(
        User,
        verbose_name=_("Student"),
        on_delete=models.CASCADE,
        related_name="marks",
        limit_choices_to={"role": User.Role.STUDENT},
    )
    subject = models.ForeignKey(
        Subject,
        verbose_name=_("Subject"),
        on_delete=models.CASCADE,
        related_name="marks",
    )
    teacher = models.ForeignKey(
        User,
        verbose_name=_("Teacher"),
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="given_marks",
        limit_choices_to={"role": User.Role.TEACHER},
    )
    value = models.PositiveSmallIntegerField(
        _("Mark"),
        validators=[MinValueValidator(MIN_MARK), MaxValueValidator(MAX_MARK)],
    )
    date = models.DateField(_("Date"), default=timezone.localdate)
    comment = models.CharField(_("Comment"), max_length=255, blank=True)
    created_at = models.DateTimeField(_("Created at"), auto_now_add=True)

    class Meta:
        verbose_name = _("Mark")
        verbose_name_plural = _("Marks")
        ordering = ["-date", "-created_at"]
        indexes = [models.Index(fields=["student", "subject"])]

    def __str__(self):
        return f"{self.student.email} · {get_localized_json_value(self.subject.name)} · {self.value}"


class SubjectBook(models.Model):
    subject = models.ForeignKey(
        Subject,
        verbose_name=_("Subject"),
        on_delete=models.CASCADE,
        related_name="subject_books",
        null=True,
        blank=True,
    )
    pdf_file = models.FileField(
        _("PDF file"),
        storage=BookStorage(),
        upload_to="",
        blank=True,
        null=True,
    )
    uploaded_at = models.DateTimeField(_("Uploaded at"), auto_now_add=True)

    class Meta:
        verbose_name = _("Subject book")
        verbose_name_plural = _("Subject books")

    def __str__(self):
        if not self.subject:
            return "No Subject"
        return f"{self.subject.grade.name} - {get_localized_json_value(self.subject.name)}"
