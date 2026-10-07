"""
Fill a development database with realistic school data so every screen has something to show.

    python manage.py seed_demo

It works on the classes that already have students (creating a demo class only when there
are none) and uses the existing teacher accounts, so the accounts you sign in with see
the data. Running it again only adds what is missing. Development databases only.
"""

import random
from datetime import date, datetime, time, timedelta

from django.conf import settings
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.utils import timezone

from api.models import (
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
    Question,
    Subject,
    User,
    UserAnswer,
    UserExamSession,
    WeeklyLesson,
)


SUBJECTS = [
    {"en": "Mathematics", "ka": "მათემატიკა", "ru": "Математика"},
    {"en": "Georgian", "ka": "ქართული", "ru": "Грузинский"},
    {"en": "English", "ka": "ინგლისური", "ru": "Английский"},
    {"en": "History", "ka": "ისტორია", "ru": "История"},
    {"en": "Biology", "ka": "ბიოლოგია", "ru": "Биология"},
    {"en": "Physics", "ka": "ფიზიკა", "ru": "Физика"},
]

LESSON_SLOTS = [
    (time(9, 0), time(9, 45)),
    (time(9, 55), time(10, 40)),
    (time(10, 50), time(11, 35)),
    (time(11, 55), time(12, 40)),
    (time(12, 50), time(13, 35)),
]

EXERCISES = [
    "Page {page}, exercises 1–5",
    "Read pages {page}–{page2} and answer the questions",
    "Worksheet #{n}",
    "Prepare a short presentation",
    "Learn the new vocabulary list",
    "Solve problems {n}–{n2} on page {page}",
]

ANNOUNCEMENTS = [
    ("Test next week", "We'll have a short test on the last two chapters next Thursday. Revise your notes!"),
    ("Bring your workbooks", "Please bring your workbooks to every lesson this week."),
    ("Great results!", "Well done on the last exam — the class average went up again."),
    ("Project deadline", "Group projects are due on Friday. Send me your topic by Wednesday."),
]

COMMENTS = ["Thank you!", "Will it include chapter 3?", "Got it 👍", "Can we submit on Monday?"]


def demo_questions(rng: random.Random, subject_en: str) -> list[tuple[str, list[tuple[str, bool]]]]:
    """Five multiple-choice questions; arithmetic reads the same in every language."""
    questions = []
    for _ in range(5):
        a, b = rng.randint(3, 12), rng.randint(3, 12)
        answer = a * b
        wrong = {answer + d for d in (-a, a, b, -1, 1, 10) if answer + d > 0 and d} - {answer}
        options = [(str(answer), True)] + [(str(w), False) for w in rng.sample(sorted(wrong), 3)]
        rng.shuffle(options)
        questions.append((f"{a} × {b} = ?", options))
    return questions


class Command(BaseCommand):
    help = "Fill the development database with demo lessons, homework, exams, marks and attendance."

    def add_arguments(self, parser):
        parser.add_argument("--days", type=int, default=30, help="How many past days of history to create.")
        parser.add_argument("--force", action="store_true", help="Run even when DEBUG is off.")

    def handle(self, *args, days: int, force: bool, **options):
        if not settings.DEBUG and not force:
            raise CommandError("seed_demo is for development databases. Pass --force to run it anyway.")

        self.rng = random.Random(42)
        self.today = timezone.localdate()
        self.days = days
        self.counts: dict[str, int] = {}

        with transaction.atomic():
            grades = self.target_grades()
            teachers = self.teachers()
            for grade in grades:
                self.seed_grade(grade, teachers)

        summary = ", ".join(f"{n} {name}" for name, n in self.counts.items() if n)
        self.stdout.write(self.style.SUCCESS(f"Seeded {len(grades)} class(es): {summary or 'nothing new'}."))

    # -- setup -----------------------------------------------------------------------

    def bump(self, name: str, n: int = 1):
        self.counts[name] = self.counts.get(name, 0) + n

    def target_grades(self) -> list[Grade]:
        grades = list(Grade.objects.filter(users__role=User.Role.STUDENT).distinct().order_by("id"))
        if grades:
            return grades

        category, _ = GradeCategory.objects.get_or_create(name={"en": "A", "ka": "ა", "ru": "А"})
        grade, _ = Grade.objects.get_or_create(name="7", category=category)
        for i, (first, last) in enumerate(
            [("Nino", "Beridze"), ("Luka", "Kapanadze"), ("Mariam", "Lomidze"), ("Saba", "Gelashvili")]
        ):
            User.objects.get_or_create(
                email=f"demo.student{i + 1}@blueapp.demo",
                defaults={"first_name": first, "last_name": last, "role": User.Role.STUDENT, "grade_in": grade},
            )
        self.bump("students", 4)
        return [grade]

    def teachers(self) -> list[User]:
        teachers = list(User.objects.filter(role=User.Role.TEACHER).order_by("id"))
        if not teachers:
            teacher, _ = User.objects.get_or_create(
                email="demo.teacher@blueapp.demo",
                defaults={"first_name": "Tamar", "last_name": "Kvaratskhelia", "role": User.Role.TEACHER},
            )
            teachers = [teacher]
            self.bump("teachers")
        return teachers

    def school_days(self, start: date, end: date) -> list[date]:
        days, day = [], start
        while day <= end:
            if day.isoweekday() <= 5:
                days.append(day)
            day += timedelta(days=1)
        return days

    # -- per class -----------------------------------------------------------------------

    def seed_grade(self, grade: Grade, teachers: list[User]):
        subjects = self.subjects_for(grade)
        teacher_of = {s.pk: teachers[i % len(teachers)] for i, s in enumerate(subjects)}
        for subject in subjects:
            teacher_of[subject.pk].subjects_taught.add(subject)

        students = list(User.objects.filter(role=User.Role.STUDENT, grade_in=grade).order_by("id"))
        lessons = self.lessons_for(grade, subjects, teacher_of)
        past = self.school_days(self.today - timedelta(days=self.days), self.today)

        self.exercises_for(grade, subjects, teacher_of, students, past)
        self.attendance_for(lessons, students, past)
        self.marks_for(subjects, teacher_of, students, past)
        self.exams_for(grade, subjects, teacher_of, students)
        self.announcements_for(grade, subjects, teacher_of, students)

    def subjects_for(self, grade: Grade) -> list[Subject]:
        existing = list(grade.subjects.order_by("id"))

        def stem(subject_name) -> str:
            name = subject_name.get("en", "") if isinstance(subject_name, dict) else str(subject_name)
            return name.strip().casefold()[:4]

        stems = {stem(s.name) for s in existing}
        for names in SUBJECTS:
            if stem(names) not in stems:
                existing.append(Subject.objects.create(name=names, grade=grade))
                stems.add(stem(names))
                self.bump("subjects")
        return existing[:6]

    def lessons_for(self, grade: Grade, subjects: list[Subject], teacher_of) -> list[WeeklyLesson]:
        for weekday in range(1, 6):
            if WeeklyLesson.objects.filter(grade=grade, weekday=weekday).exists():
                continue
            for slot, (start, end) in enumerate(LESSON_SLOTS):
                subject = subjects[(weekday + slot) % len(subjects)]
                WeeklyLesson.objects.create(
                    grade=grade,
                    subject=subject,
                    teacher=teacher_of[subject.pk],
                    weekday=weekday,
                    start_time=start,
                    end_time=end,
                    room=str(100 * (1 + slot % 3) + self.rng.randint(1, 20)),
                )
                self.bump("lessons")
        return list(WeeklyLesson.objects.filter(grade=grade))

    def exercises_for(self, grade, subjects, teacher_of, students, past):
        upcoming = self.school_days(self.today + timedelta(days=1), self.today + timedelta(days=7))
        for day in past + upcoming:
            for subject in self.rng.sample(subjects, 2):
                template = self.rng.choice(EXERCISES)
                page = self.rng.randint(10, 180)
                title = template.format(page=page, page2=page + 6, n=self.rng.randint(1, 30), n2=self.rng.randint(31, 40))
                exercise, created = DailyExercise.objects.get_or_create(
                    grade=grade,
                    subject=subject,
                    date=day,
                    title=title,
                    defaults={
                        "teacher": teacher_of[subject.pk],
                        "due_date": day + timedelta(days=self.rng.choice([1, 1, 2, 3])),
                        "description": "Show your working. Ask in the comments if something is unclear.",
                    },
                )
                if not created:
                    continue
                self.bump("exercises")

                if day >= self.today:
                    continue
                # Most homework gets done; the first student keeps a clean streak.
                for index, student in enumerate(students):
                    if index == 0 or self.rng.random() < 0.7:
                        completion = ExerciseCompletion.objects.create(exercise=exercise, student=student)
                        done_at = timezone.make_aware(datetime.combine(day, time(18, self.rng.randint(0, 59))))
                        ExerciseCompletion.objects.filter(pk=completion.pk).update(completed_at=done_at)
                        self.bump("completed homework")

    def attendance_for(self, lessons, students, past):
        by_weekday: dict[int, list[WeeklyLesson]] = {}
        for lesson in lessons:
            by_weekday.setdefault(lesson.weekday, []).append(lesson)

        records = [
            LessonAttendance(
                lesson=lesson,
                date=day,
                student=student,
                is_present=self.rng.random() > 0.08,
                marked_by=lesson.teacher,
            )
            for day in past
            if day < self.today
            for lesson in by_weekday.get(day.isoweekday(), [])
            for student in students
        ]
        created = LessonAttendance.objects.bulk_create(records, ignore_conflicts=True)
        self.bump("attendance records", len(created))

    def marks_for(self, subjects, teacher_of, students, past):
        comments = ["", "", "", "Excellent work", "Good effort", "Needs more practice"]
        for student in students:
            for subject in subjects:
                if Mark.objects.filter(student=student, subject=subject).exists():
                    continue
                level = self.rng.randint(6, 9)
                for day in sorted(self.rng.sample(past, min(4, len(past)))):
                    Mark.objects.create(
                        student=student,
                        subject=subject,
                        teacher=teacher_of[subject.pk],
                        value=max(1, min(10, level + self.rng.choice([-2, -1, 0, 0, 1, 1]))),
                        date=day,
                        comment=self.rng.choice(comments),
                    )
                    self.bump("marks")

    def exams_for(self, grade, subjects, teacher_of, students):
        for index, subject in enumerate(subjects[:4]):
            names = subject.name if isinstance(subject.name, dict) else {"en": str(subject.name)}
            subject_en = names.get("en") or next(iter(names.values()), "Subject")
            title = {
                "en": f"{subject_en} quiz",
                "ka": f"{names.get('ka', subject_en)} — ქვიზი",
                "ru": f"{names.get('ru', subject_en)} — тест",
            }
            if Exam.objects.filter(subject=subject, title__en=title["en"]).exists():
                continue

            # Two quizzes are already done, the others are planned for the coming days.
            finished = index < 2
            exam = Exam.objects.create(
                title=title,
                subject=subject,
                grade=grade,
                duration=20,
                scheduled_for=None if finished else self.today + timedelta(days=2 + 3 * index),
                created_by=teacher_of[subject.pk],
            )
            self.bump("exams")

            questions = []
            for text, options in demo_questions(self.rng, subject_en):
                question = Question.objects.create(exam=exam, text={"en": text}, points=2)
                created = Option.objects.bulk_create(
                    Option(question=question, title={"en": label}, is_correct=correct) for label, correct in options
                )
                questions.append((question, created))

            if not finished:
                continue

            for student in students:
                session = UserExamSession.objects.create(
                    user=student, exam=exam, started=True, finished=False, is_active=True
                )
                session.start()
                for question, options in questions:
                    correct = self.rng.random() < 0.75
                    option = next(o for o in options if o.is_correct == correct)
                    UserAnswer.objects.create(
                        session=session, question=question, answer_option=option, is_correct=option.is_correct
                    )
                    if option.is_correct:
                        session.score_so_far += question.points
                session.current_question_index = len(questions)
                session.finish()
                self.bump("finished exams")

    def announcements_for(self, grade, subjects, teacher_of, students):
        for index, (title, content) in enumerate(ANNOUNCEMENTS[:3]):
            subject = subjects[index % len(subjects)]
            announcement, created = Announcement.objects.get_or_create(
                title=title,
                grade=grade,
                subject=subject,
                defaults={"content": content, "created_by": teacher_of[subject.pk]},
            )
            if not created:
                continue
            self.bump("announcements")
            for student in students[:2]:
                Comment.objects.create(announcement=announcement, user=student, content=self.rng.choice(COMMENTS))
                self.bump("comments")

        # Parents can only see things for linked children; make sure the demo class has one.
        if not ParentStudent.objects.filter(student__grade_in=grade).exists() and students:
            parent, _ = User.objects.get_or_create(
                email="demo.parent@blueapp.demo",
                defaults={"first_name": "Ana", "last_name": "Beridze", "role": User.Role.PARENT},
            )
            ParentStudent.objects.get_or_create(parent=parent, student=students[0])
