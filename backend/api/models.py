# from django.contrib.auth.models import AbstractUser
# from django.db import models
# from api.managers import UserManager
# from .storage import BookStorage, ProfilePicStorage
# from PIL import Image
# from io import BytesIO
# from django.core.files.base import ContentFile
# from django.utils import timezone
# from django.core.exceptions import ValidationError




# class GradeCategory(models.Model):
#     name = models.CharField(max_length=50)

#     def __str__(self):
#         return self.name





# class Grade(models.Model):
#     name = models.CharField(max_length=50)
#     category = models.ForeignKey(GradeCategory, on_delete=models.CASCADE, blank=True, null=True)

#     def __str__(self):
#         return f"{self.name} ({self.category.name})"







# class Subject(models.Model):
#     name = models.CharField(max_length=255)
#     grade = models.ForeignKey(Grade, on_delete=models.CASCADE, related_name='subjects')
    
    
#     def __str__(self):
#         return f"{self.name} ({self.grade.name}-{self.grade.category.name})"
    
    





# class User(AbstractUser):
    
#     class Role(models.TextChoices):
#         STUDENT = "student", "Student"
#         TEACHER = "teacher", "Teacher"
#         ADMIN = "admin", "Admin"
#         PARENT = "parent", "Parent"
    
    
#     email = models.CharField(max_length=255, unique=True)
#     password = models.CharField(max_length=255, default=None, null=True)
#     chat_id = models.CharField(max_length=255,default=None, null=True)
#     role = models.CharField(max_length=255, choices=Role.choices, null=True, blank=True)
#     grade_in = models.ForeignKey(Grade, on_delete=models.SET_NULL, related_name='users', null=True, blank=True)
#     points = models.IntegerField(null=True, default=None)
#     subjects_taught = models.ManyToManyField(Subject, related_name='teachers', blank=True)
#     profilePic = models.ImageField(storage=ProfilePicStorage(), blank=True, null=True )
    
    
    
#     username = None  
#     USERNAME_FIELD = 'email'
    
#     REQUIRED_FIELDS = []
    
#     objects = UserManager()
    
#     def __str__(self,):
#         if self.role == self.Role.STUDENT:
#             return f"{self.email} ({self.role}, {self.grade_in.name if self.grade_in else 'No Grade'})"
#         elif self.role == self.Role.TEACHER:
#             subjects = ", ".join([s.name for s in self.subjects_taught.all()])
#             return f"{self.email} ({self.role}, teaches: {subjects})"
#         else:
#             return f"{self.email} ({self.role})"
    
    
            
            
#     def save(self, *args, **kwargs):
#         update_fields = kwargs.get("update_fields")

#         if update_fields is not None and "profilePic" not in update_fields:
#             return super().save(*args, **kwargs)

#         super().save(*args, **kwargs)

#         if not self.profilePic:
#             return

#         try:
#             self.profilePic.open("rb")
#             img = Image.open(self.profilePic)
#             img.load()
#         finally:
#             try:
#                 self.profilePic.close()
#             except Exception:
#                 pass

#         img = img.convert("RGB")
#         img = img.resize((200, 200), Image.Resampling.LANCZOS)

#         buffer = BytesIO()
#         img.save(buffer, format="JPEG", quality=90)
#         buffer.seek(0)

#         base_name = self.profilePic.name.rsplit(".", 1)[0]
#         new_name = base_name + ".jpg"

#         self.profilePic.save(new_name, ContentFile(buffer.read()), save=False)

#         super().save(update_fields=["profilePic"])
    
    





    
# class ParentStudent(models.Model):
#     parent = models.ForeignKey(
#         User,
#         on_delete=models.CASCADE,
#         related_name="children_links",
#         limit_choices_to={"role": User.Role.PARENT},
#     )
#     student = models.ForeignKey(
#         User,
#         on_delete=models.CASCADE,
#         related_name="parent_links",
#         limit_choices_to={"role": User.Role.STUDENT},
#     )

#     class Meta:
#         constraints = [
#             models.UniqueConstraint(fields=["parent", "student"], name="unique_parent_student")
#         ]

#     def __str__(self):
#         return f"{self.parent.email} -> {self.student.email}"
    
    
    
    
    
    
# class UserSubjectPoints(models.Model):
#     user = models.ForeignKey(User, on_delete=models.CASCADE)
#     subject = models.ForeignKey(Subject, on_delete=models.CASCADE)
#     points = models.IntegerField(default=0)

#     class Meta:
#         unique_together = ("user", "subject")
        
    
#     def __str__(self):
#         return f"{self.user.email} - {self.subject.name} ({self.points} points)"        
    







# class Exam(models.Model):
#     title  = models.CharField(max_length=255)
#     subject = models.ForeignKey(Subject, on_delete=models.CASCADE, related_name='exams')
#     grade = models.ForeignKey(Grade, on_delete=models.CASCADE, related_name="exams")
#     duration = models.PositiveIntegerField(help_text="Duration in minutes")
    
#     def __str__(self):
#         return f"{self.title} - {self.subject.grade}"
    
    
    
    
    
    
    
# class Question(models.Model):

#     exam = models.ForeignKey(Exam, on_delete=models.CASCADE, related_name="questions")
#     question_category = models.CharField(max_length=255, blank=True, null=True)
#     text = models.TextField()
#     points = models.PositiveIntegerField(default=1)

#     def __str__(self):
#         return f"{self.text} - {self.exam.title}"







# class Option(models.Model):
#     question = models.ForeignKey(Question, on_delete=models.CASCADE, related_name="options")
#     title = models.CharField(max_length=255)
#     is_correct = models.BooleanField(default=False)

#     def __str__(self):
#         return f"{self.title}"
    
    
    
    
    



# class UserExamSession(models.Model):
#     user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="exam_sessions")
#     exam = models.ForeignKey(Exam, on_delete=models.CASCADE, related_name="sessions")
#     current_question_index = models.PositiveIntegerField(default=0)
#     score_so_far = models.IntegerField(default=0)
#     started = models.BooleanField(null=True, blank=True)
#     finished = models.BooleanField(null=True, blank=True)

#     started_at = models.DateTimeField(auto_now_add=True, null=True, blank=True)
#     ends_at = models.DateTimeField(null=True, blank=True)

#     submitted_at = models.DateTimeField(null=True, blank=True)
#     is_active = models.BooleanField(default=True)
    
#     expired = models.BooleanField(default=False)

#     def start(self):
#         if not self.started_at:
#             self.started_at = timezone.now()

#         if not self.ends_at:
#             self.ends_at = self.started_at + timezone.timedelta(minutes=self.exam.duration)

#         self.started = True
#         self.is_active = True
#         self.save(update_fields=["started_at", "ends_at", "started", "is_active"])

#     @property
#     def is_expired(self) -> bool:
#         return self.ends_at is not None and timezone.now() >= self.ends_at

#     def terminate(self):
#         self.is_active = False
#         self.expired = True
#         self.finished = True
#         if not self.submitted_at:
#             self.submitted_at = timezone.now()
#         self.save(update_fields=["is_active", "finished", "submitted_at"])
        
        
#     def __str__(self):
#         return f"{self.user.email} - {self.exam.title}"






# class UserAnswer(models.Model):
#     session = models.ForeignKey(UserExamSession, on_delete=models.CASCADE, related_name="answers", null=True)
#     question = models.ForeignKey(Question, on_delete=models.CASCADE, related_name="user_answers", null=True)
#     answer_option = models.ForeignKey(Option, on_delete=models.CASCADE, null=True, blank=True, related_name="user_answers")
#     is_correct = models.BooleanField(default=False)

#     def __str__(self):
#         return f"{self.session.user.email if self.session else 'Unknown User'} - Q{self.question.pk if self.question else 'Unknown'} ({'Correct' if self.is_correct else 'Wrong'})"





# class Announcement(models.Model):
    
#     title = models.CharField(max_length=255)
#     content = models.TextField()
#     grade = models.ForeignKey(Grade, on_delete=models.CASCADE, related_name='announcements')
#     subject = models.ForeignKey(Subject, on_delete=models.CASCADE, related_name='announcements', null=True, blank=True)
#     created_by = models.ForeignKey(User, on_delete=models.CASCADE, related_name='announcements')
#     created_at = models.DateTimeField(auto_now_add=True)
    
    
#     def __str__(self):
#         if self.subject:
#             return f"{self.title} {self.grade.name} {self.subject.name}"
#         return f"{self.title} {self.grade.name} - Global"
        
    
    
    
    


# class Comment(models.Model):
#     content = models.TextField()
#     announcement = models.ForeignKey(Announcement, on_delete=models.CASCADE, related_name='comments', null=True, blank=True)
#     user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='comments')
#     created_at = models.DateTimeField(auto_now_add=True, null=True, blank=True)
    
#     def __str__(self):
#         return f"comment of: {self.user.email}"
    
    





# class WeeklyLesson(models.Model):
    
#     class WeekDay(models.IntegerChoices):
#         MON = 1, "Mon"
#         TUE = 2, "Tue"
#         WED = 3, "Wed"
#         THU = 4, "Thu"
#         FRI = 5, "Fri"
#         SAT = 6, "Sat"
#         SUN = 7, "Sun"
    
    
#     grade = models.ForeignKey(Grade, on_delete=models.CASCADE, related_name="weekly_lessons")
#     subject = models.ForeignKey(Subject, on_delete=models.CASCADE, related_name="weekly_lessons")

#     teacher = models.ForeignKey(
#         User,
#         related_name="weekly_lessons",
#         on_delete=models.SET_NULL,
#         null=True,
#         blank=True,
#         limit_choices_to={"role": "teacher"},
#     )

#     weekday = models.IntegerField(choices=WeekDay.choices)
#     start_time = models.TimeField()
#     end_time = models.TimeField()

#     room = models.CharField(max_length=50, null=True, blank=True)

#     class Meta:
#         ordering = ["weekday", "start_time"]
#         constraints = [
#             models.UniqueConstraint(
#                 fields=["grade", "weekday", "start_time"],
#                 name="unique_grade_weekday_start",
#             ),
#         ]

#     def clean(self):
#         # basic sanity
#         if self.end_time <= self.start_time:
#             raise ValidationError({"end_time": "end_time must be after start_time."})

#         # make sure subject belongs to that grade
#         if self.subject_id and self.grade_id and self.subject.grade_id != self.grade_id:
#             raise ValidationError({"subject": "Subject must belong to the selected grade."})

#         # OPTIONAL (recommended): prevent overlaps for same grade+weekday
#         qs = WeeklyLesson.objects.filter(grade=self.grade, weekday=self.weekday)
#         if self.pk:
#             qs = qs.exclude(pk=self.pk)

#         # overlap rule: start < other_end AND end > other_start
#         if qs.filter(start_time__lt=self.end_time, end_time__gt=self.start_time).exists():
#             raise ValidationError("This time overlaps an existing lesson for this grade/day.")

#     def save(self, *args, **kwargs):
#         self.full_clean()  # ensures clean() runs even from admin
#         return super().save(*args, **kwargs)

#     def __str__(self):
#         return f"{self.grade} {self.get_weekday_display()} {self.start_time}-{self.end_time} {self.subject.name}"

    






# class LessonAttendance(models.Model):
#     lesson = models.ForeignKey(WeeklyLesson, on_delete=models.CASCADE, related_name="attendance")
#     date = models.DateField()

#     student = models.ForeignKey(User, on_delete=models.CASCADE, related_name="lesson_attendance")

#     is_present = models.BooleanField(default=True)
#     marked_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name="marked_attendance")
#     marked_at = models.DateTimeField(auto_now=True)

#     class Meta:
#         constraints = [
#             models.UniqueConstraint(fields=["lesson", "date", "student"], name="unique_attendance_per_lesson_day_student")
#         ]

#     def __str__(self):
#         return f"{self.date} {self.lesson} {self.student.email} {'P' if self.is_present else 'A'}"
    
    
    
    
    
    
    
    
    
# class DailyExercise(models.Model):
#     grade = models.ForeignKey(Grade, on_delete=models.CASCADE, related_name="daily_exercises")
#     subject = models.ForeignKey(Subject, on_delete=models.CASCADE, related_name="daily_exercises", null=True, blank=True)

#     teacher = models.ForeignKey(
#         User,
#         on_delete=models.SET_NULL,
#         null=True,
#         blank=True,
#         related_name="assigned_exercises",
#         limit_choices_to={"role": User.Role.TEACHER},
#     )

#     date = models.DateField()  
#     title = models.CharField(max_length=255)
#     description = models.TextField(blank=True, null=True)

#     due_date = models.DateField(null=True, blank=True) 
#     created_at = models.DateTimeField(auto_now_add=True)

#     class Meta:
#         ordering = ["-date", "-created_at"]
#         constraints = [
#             models.UniqueConstraint(
#                 fields=["grade", "subject", "date", "title"],
#                 name="unique_grade_subject_date_title_exercise"
#             )
#         ]

#     def clean(self):
#         if self.subject_id and self.grade_id and self.subject.grade_id != self.grade_id:
#             raise ValidationError({"subject": "Subject must belong to the selected grade."})

#     def save(self, *args, **kwargs):
#         self.full_clean()
#         return super().save(*args, **kwargs)

#     def __str__(self):
#         return f"{self.date} | {self.grade} | {self.subject.name if self.subject else 'General'} | {self.title}"
    
    
    
    
    
    
    
# class SubjectBook(models.Model):
#     subject = models.ForeignKey(Subject, on_delete=models.CASCADE, related_name="subject_books", null=True, blank=True)
#     pdf_file = models.FileField(storage=BookStorage(), upload_to="", blank=True, null=True)
#     uploaded_at = models.DateTimeField(auto_now_add=True)
    
#     def __str__(self):
#         return f"{self.subject.grade.name} - {self.subject.name if self.subject else 'No Subject'}"




from django.contrib.auth.models import AbstractUser
from django.db import models
from api.managers import UserManager
from .storage import BookStorage, ProfilePicStorage
from PIL import Image
from io import BytesIO
from django.core.files.base import ContentFile
from django.utils import timezone
from django.core.exceptions import ValidationError
from django.utils.translation import gettext_lazy as _


class GradeCategory(models.Model):
    name = models.CharField(_("Name"), max_length=50)

    class Meta:
        verbose_name = _("Grade category")
        verbose_name_plural = _("Grade categories")

    def __str__(self):
        return self.name


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
        return f"{self.name} ({self.category.name})"


class Subject(models.Model):
    name = models.CharField(_("Name"), max_length=255)
    grade = models.ForeignKey(
        Grade,
        verbose_name=_("Grade"),
        on_delete=models.CASCADE,
        related_name="subjects",
    )

    class Meta:
        verbose_name = _("Subject")
        verbose_name_plural = _("Subjects")

    def __str__(self):
        return f"{self.name} ({self.grade.name}-{self.grade.category.name})"


class User(AbstractUser):
    class Role(models.TextChoices):
        STUDENT = "student", _("Student")
        TEACHER = "teacher", _("Teacher")
        ADMIN = "admin", _("Admin")
        PARENT = "parent", _("Parent")

    email = models.CharField(_("Email"), max_length=255, unique=True)
    password = models.CharField(_("Password"), max_length=255, default=None, null=True)
    chat_id = models.CharField(_("Chat ID"), max_length=255, default=None, null=True)
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

    username = None
    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = []

    objects = UserManager()

    class Meta:
        verbose_name = _("User")
        verbose_name_plural = _("Users")

    def __str__(self):
        if self.role == self.Role.STUDENT:
            return f"{self.email} ({self.role}, {self.grade_in.name if self.grade_in else 'No Grade'})"
        elif self.role == self.Role.TEACHER:
            subjects = ", ".join([s.name for s in self.subjects_taught.all()])
            return f"{self.email} ({self.role}, teaches: {subjects})"
        else:
            return f"{self.email} ({self.role})"

    def save(self, *args, **kwargs):
        update_fields = kwargs.get("update_fields")

        if update_fields is not None and "profilePic" not in update_fields:
            return super().save(*args, **kwargs)

        super().save(*args, **kwargs)

        if not self.profilePic:
            return

        try:
            self.profilePic.open("rb")
            img = Image.open(self.profilePic)
            img.load()
        finally:
            try:
                self.profilePic.close()
            except Exception:
                pass

        img = img.convert("RGB")
        img = img.resize((200, 200), Image.Resampling.LANCZOS)

        buffer = BytesIO()
        img.save(buffer, format="JPEG", quality=90)
        buffer.seek(0)

        base_name = self.profilePic.name.rsplit(".", 1)[0]
        new_name = base_name + ".jpg"

        self.profilePic.save(new_name, ContentFile(buffer.read()), save=False)

        super().save(update_fields=["profilePic"])


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
        return f"{self.user.email} - {self.subject.name} ({self.points} points)"


class Exam(models.Model):
    title = models.CharField(_("Title"), max_length=255)
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
    duration = models.PositiveIntegerField(_("Duration in minutes"), help_text=_("Duration in minutes"))

    class Meta:
        verbose_name = _("Exam")
        verbose_name_plural = _("Exams")

    def __str__(self):
        return f"{self.title} - {self.subject.grade}"


class Question(models.Model):
    exam = models.ForeignKey(
        Exam,
        verbose_name=_("Exam"),
        on_delete=models.CASCADE,
        related_name="questions",
    )
    question_category = models.CharField(_("Question category"), max_length=255, blank=True, null=True)
    text = models.TextField(_("Text"))
    points = models.PositiveIntegerField(_("Points"), default=1)

    class Meta:
        verbose_name = _("Question")
        verbose_name_plural = _("Questions")

    def __str__(self):
        return f"{self.text} - {self.exam.title}"


class Option(models.Model):
    question = models.ForeignKey(
        Question,
        verbose_name=_("Question"),
        on_delete=models.CASCADE,
        related_name="options",
    )
    title = models.CharField(_("Title"), max_length=255)
    is_correct = models.BooleanField(_("Is correct"), default=False)

    class Meta:
        verbose_name = _("Option")
        verbose_name_plural = _("Options")

    def __str__(self):
        return f"{self.title}"


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

    def start(self):
        if not self.started_at:
            self.started_at = timezone.now()

        if not self.ends_at:
            self.ends_at = self.started_at + timezone.timedelta(minutes=self.exam.duration)

        self.started = True
        self.is_active = True
        self.save(update_fields=["started_at", "ends_at", "started", "is_active"])

    @property
    def is_expired(self) -> bool:
        return self.ends_at is not None and timezone.now() >= self.ends_at

    def terminate(self):
        self.is_active = False
        self.expired = True
        self.finished = True
        if not self.submitted_at:
            self.submitted_at = timezone.now()
        self.save(update_fields=["is_active", "finished", "submitted_at"])

    def __str__(self):
        return f"{self.user.email} - {self.exam.title}"


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
        return f"{self.session.user.email if self.session else 'Unknown User'} - Q{self.question.pk if self.question else 'Unknown'} ({'Correct' if self.is_correct else 'Wrong'})"


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
            return f"{self.title} {self.grade.name} {self.subject.name}"
        return f"{self.title} {self.grade.name} - Global"


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
    created_at = models.DateTimeField(_("Created at"), auto_now_add=True, null=True, blank=True)

    class Meta:
        verbose_name = _("Comment")
        verbose_name_plural = _("Comments")

    def __str__(self):
        return f"comment of: {self.user.email}"


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
        return f"{self.grade} {self.get_weekday_display()} {self.start_time}-{self.end_time} {self.subject.name}"


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
        return f"{self.date} | {self.grade} | {self.subject.name if self.subject else 'General'} | {self.title}"


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
        return f"{self.subject.grade.name} - {self.subject.name if self.subject else 'No Subject'}"