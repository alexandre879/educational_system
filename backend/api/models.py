from django.contrib.auth.models import AbstractUser
from django.db import models
from api.managers import UserManager




class GradeCategory(models.Model):
    name = models.CharField(max_length=50)

    def __str__(self):
        return self.name






class Grade(models.Model):
    name = models.CharField(max_length=50)
    category = models.ForeignKey(GradeCategory, on_delete=models.CASCADE, blank=True, null=True)

    def __str__(self):
        return f"{self.name} ({self.category.name})"







class Subject(models.Model):
    name = models.CharField(max_length=255)
    grade = models.ForeignKey(Grade, on_delete=models.CASCADE, related_name='subjects')
    
    
    def __str__(self):
        return f"{self.name} ({self.grade.name}-{self.grade.category.name})"
    





class User(AbstractUser):
    
    class Role(models.TextChoices):
        STUDENT = "student", "Student"
        TEACHER = "teacher", "Teacher"
        ADMIN = "admin", "Admin"
        PARENT = "parent", "Parent"
    
    
    email = models.CharField(max_length=255, unique=True)
    password = models.CharField(max_length=255, default=None, null=True)
    chat_id = models.CharField(max_length=255,default=None, null=True)
    role = models.CharField(max_length=255, choices=Role.choices, null=True, blank=True)
    grade_in = models.ForeignKey(Grade, on_delete=models.SET_NULL, related_name='users', null=True, blank=True)
    points = models.IntegerField(null=True, default=None)
    subjects_taught = models.ManyToManyField(Subject, related_name='teachers', blank=True, null=True)
    
    
    
    username = None  
    USERNAME_FIELD = 'email'
    
    REQUIRED_FIELDS = []
    
    objects = UserManager()
    
    def __str__(self,):
        return f"{self.first_name} {self.last_name}: {'student' if self.grade_in and self.grade_in.category else 'teacher'}"
    
    






class Exam(models.Model):
    title  = models.CharField(max_length=255)
    subject = models.ForeignKey(Subject, on_delete=models.CASCADE, related_name='exams')
    grade = models.ForeignKey(Grade, on_delete=models.CASCADE, related_name="exams")
    duration = models.PositiveIntegerField(help_text="Duration in minutes")
    
    def __str__(self):
        return f"{self.title} - {self.subject.grade}"
    
    
    
    
    
    
    
class Question(models.Model):

    exam = models.ForeignKey(Exam, on_delete=models.CASCADE, related_name="questions")
    question_category = models.CharField(max_length=255, blank=True, null=True)
    text = models.TextField()
    points = models.PositiveIntegerField(default=1)

    def __str__(self):
        return f"Q{self.pk} - {self.exam.title}"







class Option(models.Model):
    question = models.ForeignKey(Question, on_delete=models.CASCADE, related_name="options")
    title = models.CharField(max_length=255)
    is_correct = models.BooleanField(default=False)

    def __str__(self):
        return f"Option for Q{self.question.pk}: {self.title}"
    
    
    
    
    
    

class UserExamSession(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="exam_sessions")
    exam = models.ForeignKey(Exam, on_delete=models.CASCADE, related_name="sessions")
    current_question_index = models.PositiveIntegerField(default=0)
    score_so_far = models.IntegerField(default=0)
    started = models.BooleanField(null=True, blank=True)
    finished = models.BooleanField(null=True, blank=True)

    def __str__(self):
        return f"{self.user.username} - {self.exam.title}"







class UserAnswer(models.Model):
    session = models.ForeignKey(UserExamSession, on_delete=models.SET_NULL, related_name="answers", null=True)
    question = models.ForeignKey(Question, on_delete=models.SET_NULL, related_name="user_answers", null=True)
    answer_option = models.ForeignKey(
        Option, on_delete=models.SET_NULL, null=True, blank=True, related_name="user_answers"
    )
    is_correct = models.BooleanField(default=False)

    def __str__(self):
        return f"{self.session.user.username} - Q{self.question.pk} ({'Correct' if self.is_correct else 'Wrong'})"
    



class Announcement(models.Model):
    
    title = models.CharField(max_length=255)
    content = models.TextField()
    grade = models.ForeignKey(Grade, on_delete=models.CASCADE, related_name='announcements')
    subject = models.ForeignKey(Subject, on_delete=models.CASCADE, related_name='announcements', null=True, blank=True)
    created_by = models.ForeignKey(User, on_delete=models.CASCADE, related_name='announcements')
    created_at = models.DateTimeField(auto_now_add=True)
    
    
    def __str__(self):
        if self.subject:
            return f"{self.title} {self.grade.name} {self.subject.name}"
        return f"{self.title} {self.grade.name} - Global"
        
    
    


class Comment(models.Model):
    content = models.TextField()
    announcement = models.ForeignKey(Announcement, on_delete=models.CASCADE, related_name='comments', null=True, blank=True)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='comments')
    created_at = models.DateTimeField(auto_now_add=True, null=True, blank=True)
    
    def __str__(self):
        return f"comment of: {self.user.email}"

    
