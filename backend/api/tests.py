import json
from datetime import date, time, timedelta
from io import BytesIO, StringIO
from unittest import mock

from django.core.cache import cache
from django.core.exceptions import ValidationError
from django.core.management import call_command
from django.core.management.base import CommandError
from django.db import IntegrityError, transaction
from django.test import override_settings
from django.utils import timezone, translation
from PIL import Image
from rest_framework.test import APITestCase
from rest_framework_simplejwt.tokens import RefreshToken

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
    PushDevice,
    Question,
    Subject,
    User,
    UserExamSession,
    UserSubjectPoints,
    WeeklyLesson,
)
from api.utils import normalize_image_to_square
from api.views import homework_streak


@override_settings(TELEGRAM_BOT_TOKEN="")
class BaseAPITestCase(APITestCase):
    @classmethod
    def setUpTestData(cls):
        cls.category = GradeCategory.objects.create(name={"en": "A", "ka": "ა"})
        cls.grade = Grade.objects.create(name="7", category=cls.category)
        cls.other_grade = Grade.objects.create(name="8", category=cls.category)
        cls.uncategorized_grade = Grade.objects.create(name="9")

        cls.math = Subject.objects.create(name={"en": "Math", "ka": "მათემატიკა"}, grade=cls.grade)
        cls.english = Subject.objects.create(
            name={"en": "English"},
            grade=cls.grade,
            content_mode=Subject.ContentMode.FIXED,
            fixed_language="en",
        )
        cls.other_subject = Subject.objects.create(name={"en": "History"}, grade=cls.other_grade)

        cls.student = User.objects.create_user(
            email="student@school.edu",
            first_name="Nino",
            last_name="Beridze",
            role=User.Role.STUDENT,
            grade_in=cls.grade,
            chat_id="111",
        )
        cls.other_student = User.objects.create_user(
            email="other@school.edu", role=User.Role.STUDENT, grade_in=cls.other_grade
        )
        cls.teacher = User.objects.create_user(
            email="teacher@school.edu", first_name="Giorgi", role=User.Role.TEACHER
        )
        cls.teacher.subjects_taught.add(cls.math)
        cls.parent = User.objects.create_user(
            email="parent@school.edu", role=User.Role.PARENT, chat_id="999"
        )
        ParentStudent.objects.create(parent=cls.parent, student=cls.student)

    def setUp(self):
        cache.clear()


# ---------------------------------------------------------------------------
# Auth
# ---------------------------------------------------------------------------

@mock.patch("api.views.send_login_code", return_value=True)
class OtpLoginTests(BaseAPITestCase):
    def request_otp(self, email="student@school.edu"):
        return self.client.post("/api/otp/request/", {"email": email}, format="json")

    def verify(self, otp, email="student@school.edu"):
        return self.client.post("/api/otp/verify/", {"email": email, "otp": otp}, format="json")

    def test_request_sends_six_digit_code_via_telegram(self, send_code):
        response = self.request_otp()

        self.assertEqual(response.status_code, 200)
        chat_id, otp, _language = send_code.call_args.args
        self.assertEqual(chat_id, "111")
        self.assertRegex(otp, r"^\d{6}$")

    def test_unknown_email_and_unlinked_user(self, send_code):
        self.assertEqual(self.request_otp("nobody@school.edu").status_code, 404)
        self.assertEqual(self.request_otp("teacher@school.edu").status_code, 400)
        send_code.assert_not_called()

    def test_resend_is_rate_limited(self, send_code):
        self.assertEqual(self.request_otp().status_code, 200)
        self.assertEqual(self.request_otp().status_code, 429)
        self.assertEqual(send_code.call_count, 1)

    def test_telegram_failure_returns_502_and_allows_retry(self, send_code):
        send_code.return_value = False
        self.assertEqual(self.request_otp().status_code, 502)

        send_code.return_value = True
        self.assertEqual(self.request_otp().status_code, 200)

    def test_verify_issues_tokens_once(self, send_code):
        self.request_otp()
        otp = send_code.call_args.args[1]

        response = self.verify(otp)
        self.assertEqual(response.status_code, 200)
        self.assertIn("access", response.data)
        self.assertIn("refresh", response.data)

        # The code is single-use.
        self.assertEqual(self.verify(otp).status_code, 400)

    def test_wrong_code_attempts_are_limited(self, send_code):
        self.request_otp()
        otp = send_code.call_args.args[1]
        wrong = "000000" if otp != "000000" else "111111"

        for _ in range(5):
            self.assertEqual(self.verify(wrong).status_code, 400)

        self.assertEqual(self.verify(wrong).status_code, 429)
        # After lockout even the right code no longer works.
        self.assertEqual(self.verify(otp).status_code, 400)

    def test_stale_authorization_header_does_not_block_login(self, send_code):
        self.client.credentials(HTTP_AUTHORIZATION="Bearer not-a-real-token")
        self.assertEqual(self.request_otp().status_code, 200)


class TokenTests(BaseAPITestCase):
    def test_refresh_works_without_access_token(self):
        refresh = RefreshToken.for_user(self.student)

        response = self.client.post("/api/auth/refresh/", {"refresh": str(refresh)}, format="json")

        self.assertEqual(response.status_code, 200)
        self.assertIn("access", response.data)

    def test_logout_with_invalid_token_is_a_client_error(self):
        self.client.force_authenticate(self.student)
        response = self.client.post("/api/user/logout/", {"refresh": "garbage"}, format="json")
        self.assertEqual(response.status_code, 400)

    def test_logout_blacklists_refresh_token(self):
        refresh = str(RefreshToken.for_user(self.student))
        self.client.force_authenticate(self.student)

        self.assertEqual(self.client.post("/api/user/logout/", {"refresh": refresh}, format="json").status_code, 200)

        self.client.force_authenticate(None)
        response = self.client.post("/api/auth/refresh/", {"refresh": refresh}, format="json")
        self.assertEqual(response.status_code, 401)


class SpectatorTests(BaseAPITestCase):
    def setUp(self):
        super().setUp()
        self.spectator = User.objects.create_user(email="spectator@school.edu", role=User.Role.SPECTATOR)
        self.spectator.spectator_views.add(self.student, self.teacher, self.parent)

    def login(self, role=None):
        self.client.credentials()
        response = self.client.post("/api/spectator/login/", {"role": role} if role else {}, format="json")
        if response.status_code == 200:
            self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {response.data['access']}")
        return response

    def test_views_the_site_as_the_linked_student_by_default(self):
        self.assertEqual(self.login().status_code, 200)

        me = self.client.get("/api/user/me/").data
        self.assertEqual(me["id"], self.student.id)
        self.assertEqual(me["spectator"], {"viewing_as": "student", "roles": ["student", "teacher", "parent"]})
        self.assertEqual(self.client.get("/api/home/").data["me"]["id"], self.student.id)

    def test_switching_to_another_role(self):
        self.assertEqual(self.login("teacher").status_code, 200)
        self.assertEqual(self.client.get("/api/home/").data["me"]["role"], "teacher")

        self.assertEqual(self.login("parent").status_code, 200)
        self.assertEqual(self.client.get("/api/user/me/").data["id"], self.parent.id)

    def test_changes_are_refused(self):
        self.login()
        attempts = [
            ("post", "/api/exams/1/start_or_resume/", {}),
            ("post", "/api/comments/create/", {"announcement": 1, "text": "hi"}),
            ("patch", "/api/update/profile/", {"first_name": "Hacked"}),
            ("post", "/api/aisupport/", {"message": "hi"}),
            ("post", "/api/push/register/", {"token": "ExponentPushToken[x]", "platform": "ios"}),
        ]
        for method, url, payload in attempts:
            with self.subTest(url=url):
                response = getattr(self.client, method)(url, payload, format="json")
                self.assertEqual(response.status_code, 403)
                self.assertEqual(response.data["code"], "spectator_read_only")

        self.student.refresh_from_db()
        self.assertEqual(self.student.first_name, "Nino")
        self.assertFalse(PushDevice.objects.exists())

    def test_refresh_keeps_the_view_and_logout_works(self):
        refresh = self.login("teacher").data["refresh"]

        response = self.client.post("/api/auth/refresh/", {"refresh": refresh}, format="json")
        self.assertEqual(response.status_code, 200)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {response.data['access']}")
        self.assertEqual(self.client.get("/api/user/me/").data["id"], self.teacher.id)

        rotated = response.data["refresh"]
        self.assertEqual(self.client.post("/api/user/logout/", {"refresh": rotated}, format="json").status_code, 200)
        self.client.credentials()
        self.assertEqual(self.client.post("/api/auth/refresh/", {"refresh": rotated}, format="json").status_code, 401)

    def test_only_linked_roles_are_offered(self):
        self.spectator.spectator_views.remove(self.parent)

        self.assertEqual(self.login("parent").status_code, 400)
        self.login()
        self.assertEqual(self.client.get("/api/user/me/").data["spectator"]["roles"], ["student", "teacher"])

    def test_turning_spectator_mode_off(self):
        self.login()
        self.spectator.spectator_views.remove(self.student)
        self.assertEqual(self.client.get("/api/user/me/").status_code, 401)

        self.spectator.is_active = False
        self.spectator.save()
        self.assertEqual(self.login().status_code, 404)

    def test_not_set_up(self):
        self.spectator.spectator_views.clear()
        self.assertEqual(self.login().status_code, 404)

    def test_view_as_claim_is_ignored_for_normal_accounts(self):
        refresh = RefreshToken.for_user(self.student)
        refresh["view_as"] = self.teacher.id
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {refresh.access_token}")

        me = self.client.get("/api/user/me/").data
        self.assertEqual(me["id"], self.student.id)
        self.assertNotIn("spectator", me)

    def test_there_is_only_one_spectator_account(self):
        second = User(email="spectator2@school.edu", role=User.Role.SPECTATOR)
        # What the admin form runs, so it shows a message instead of crashing.
        with translation.override("en"), self.assertRaisesMessage(ValidationError, "only be one spectator account"):
            second.validate_constraints()

        with self.assertRaises(IntegrityError), transaction.atomic():
            User.objects.create_user(email="spectator2@school.edu", role=User.Role.SPECTATOR)

    def test_setup_command(self):
        self.spectator.delete()
        out = StringIO()

        call_command("setup_spectator", student=self.student.email, parent=self.parent.email, stdout=out)

        spectator = User.objects.get(role=User.Role.SPECTATOR)
        self.assertEqual(set(spectator.spectator_views.all()), {self.student, self.parent})
        self.assertIn("Created the spectator account", out.getvalue())

        call_command("setup_spectator", student=self.other_student.email, stdout=StringIO())
        self.assertEqual(set(spectator.spectator_views.all()), {self.other_student, self.parent})

        with self.assertRaises(CommandError):
            call_command("setup_spectator", teacher=self.student.email, stdout=StringIO())


class PermissionTests(BaseAPITestCase):
    def test_private_endpoints_require_authentication(self):
        for url in (
            "/api/comments/?announcement=1",
            "/api/my_subjects/",
            f"/api/leader-board/list/{self.math.pk}/{self.grade.pk}/{self.category.pk}/",
            "/api/exams/",
            "/api/home/",
        ):
            with self.subTest(url=url):
                self.assertEqual(self.client.get(url).status_code, 401)

    def test_bulk_exam_create_is_admin_only(self):
        payload = {
            "title": {"en": "Quiz"},
            "duration": 10,
            "subject": self.math.pk,
            "grade": self.grade.pk,
            "questions": [],
        }

        self.assertEqual(self.client.post("/api/exams/create/", payload, format="json").status_code, 401)

        self.client.force_authenticate(self.teacher)
        self.assertEqual(self.client.post("/api/exams/create/", payload, format="json").status_code, 403)

        admin = User.objects.create_superuser("admin@school.edu", "pass12345")
        self.client.force_authenticate(admin)
        self.assertEqual(self.client.post("/api/exams/create/", payload, format="json").status_code, 201)


# ---------------------------------------------------------------------------
# Exams
# ---------------------------------------------------------------------------

class ExamFlowTests(BaseAPITestCase):
    @classmethod
    def setUpTestData(cls):
        super().setUpTestData()
        cls.exam = Exam.objects.create(title={"en": "Quiz"}, subject=cls.english, grade=cls.grade, duration=30)
        cls.questions = []
        cls.correct = []
        cls.wrong = []
        for i, points in enumerate((2, 3)):
            q = Question.objects.create(exam=cls.exam, text={"en": f"Q{i}"}, points=points)
            cls.questions.append(q)
            cls.correct.append(Option.objects.create(question=q, title={"en": "yes"}, is_correct=True))
            cls.wrong.append(Option.objects.create(question=q, title={"en": "no"}, is_correct=False))

    def setUp(self):
        super().setUp()
        self.client.force_authenticate(self.student)

    def start(self):
        return self.client.post(f"/api/exams/{self.exam.pk}/start_or_resume/", HTTP_ACCEPT_LANGUAGE="ka")

    def answer(self, session_id, question, option):
        return self.client.post(
            f"/api/sessions/{session_id}/answer/",
            {"question_id": question.pk, "option_id": option.pk},
            format="json",
            HTTP_ACCEPT_LANGUAGE="ka",
        )

    def test_complete_exam_credits_points_once(self):
        start = self.start()
        self.assertEqual(start.status_code, 200)
        self.assertEqual(start.data["exam_language"], "en")
        session_id = start.data["session_id"]

        step = self.answer(session_id, self.questions[0], self.correct[0])
        self.assertEqual(step.status_code, 200)
        self.assertEqual(step.data["current_index"], 1)
        # A fixed-language subject keeps its language after the first answer.
        self.assertEqual(step.data["exam_language"], "en")

        result = self.answer(session_id, self.questions[1], self.wrong[1])
        self.assertEqual(result.status_code, 200)
        self.assertEqual(result.data["final_score"], 2)
        self.assertEqual(result.data["subject_points"], 2)
        self.assertEqual(result.data["global_points"], 2)
        self.assertFalse(result.data["timed_out"])

        # Finished exams can't be re-entered or re-scored.
        self.assertEqual(self.start().status_code, 400)
        self.assertEqual(self.answer(session_id, self.questions[1], self.correct[1]).status_code, 400)

        self.student.refresh_from_db()
        self.assertEqual(self.student.points, 2)
        self.assertEqual(UserSubjectPoints.objects.get(user=self.student, subject=self.english).points, 2)

        self.assertEqual(self.client.get("/api/exams/").data, [])

    def test_repeated_start_reuses_one_session(self):
        first = self.start().data["session_id"]
        second = self.start().data["session_id"]
        self.assertEqual(first, second)
        self.assertEqual(UserExamSession.objects.filter(user=self.student, exam=self.exam).count(), 1)

    def test_stale_question_is_rejected_without_scoring(self):
        session_id = self.start().data["session_id"]
        self.answer(session_id, self.questions[0], self.correct[0])

        # A duplicate submit for the already-answered question.
        response = self.answer(session_id, self.questions[0], self.correct[0])

        self.assertEqual(response.status_code, 409)
        self.assertEqual(UserExamSession.objects.get(pk=session_id).score_so_far, 2)

    def test_option_from_another_question_is_rejected(self):
        session_id = self.start().data["session_id"]
        response = self.answer(session_id, self.questions[0], self.correct[1])
        self.assertEqual(response.status_code, 400)

    def test_timeout_finishes_session_and_keeps_earned_points(self):
        session_id = self.start().data["session_id"]
        self.answer(session_id, self.questions[0], self.correct[0])
        UserExamSession.objects.filter(pk=session_id).update(ends_at=timezone.now() - timedelta(seconds=1))

        result = self.start()

        self.assertEqual(result.status_code, 200)
        self.assertTrue(result.data["timed_out"])
        self.assertEqual(result.data["final_score"], 2)

        session = UserExamSession.objects.get(pk=session_id)
        self.assertTrue(session.finished)
        self.assertTrue(session.expired)
        self.assertFalse(session.is_active)

        self.student.refresh_from_db()
        self.assertEqual(self.student.points, 2)

    def test_finish_is_idempotent(self):
        session_id = self.start().data["session_id"]
        session = UserExamSession.objects.get(pk=session_id)
        session.score_so_far = 5
        session.finish()
        session.finish()

        self.student.refresh_from_db()
        self.assertEqual(self.student.points, 5)

    def test_exam_without_questions_does_not_start_a_session(self):
        empty = Exam.objects.create(title={"en": "Empty"}, subject=self.math, grade=self.grade, duration=5)

        response = self.client.post(f"/api/exams/{empty.pk}/start_or_resume/")

        self.assertEqual(response.status_code, 400)
        self.assertFalse(UserExamSession.objects.filter(exam=empty).exists())
        self.assertNotIn(empty.pk, [exam["id"] for exam in self.client.get("/api/exams/").data])

    def test_exam_for_other_grade_is_forbidden(self):
        self.client.force_authenticate(self.other_student)
        self.assertEqual(self.start().status_code, 403)


# ---------------------------------------------------------------------------
# Announcements & comments
# ---------------------------------------------------------------------------

class AnnouncementTests(BaseAPITestCase):
    @classmethod
    def setUpTestData(cls):
        super().setUpTestData()
        cls.announcement = Announcement.objects.create(
            title="Trip", content="Friday", grade=cls.grade, subject=cls.math, created_by=cls.teacher
        )
        cls.other_announcement = Announcement.objects.create(
            title="Other", content="...", grade=cls.other_grade, created_by=cls.teacher
        )
        Announcement.objects.create(
            title="No category", content="...", grade=cls.uncategorized_grade, created_by=cls.teacher
        )

    def test_comments_have_ids(self):
        self.client.force_authenticate(self.student)

        created = self.client.post(
            "/api/comments/create/", {"comment": "Great", "announcement": self.announcement.pk}, format="json"
        )
        self.assertEqual(created.status_code, 201)
        self.assertIn("id", created.data)

        listed = self.client.get(f"/api/comments/?announcement={self.announcement.pk}")
        self.assertEqual(listed.status_code, 200)
        self.assertEqual([c["id"] for c in listed.data], [created.data["id"]])

    def test_students_only_see_their_grade(self):
        self.client.force_authenticate(self.student)

        listed = self.client.get("/api/announcements/list/")
        self.assertEqual([a["id"] for a in listed.data["announcements"]], [self.announcement.pk])

        response = self.client.post(
            "/api/comments/create/", {"comment": "hi", "announcement": self.other_announcement.pk}, format="json"
        )
        self.assertEqual(response.status_code, 404)
        self.assertFalse(Comment.objects.filter(announcement=self.other_announcement).exists())

    def test_list_handles_grades_without_category(self):
        self.client.force_authenticate(self.teacher)
        response = self.client.get("/api/announcements/list/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data["announcements"]), 3)

    def test_teacher_can_only_post_for_taught_subjects(self):
        self.client.force_authenticate(self.teacher)
        base = {"title": "T", "content": "C", "grade_id": self.grade.pk, "category_id": self.category.pk}

        ok = self.client.post("/api/announcements/create/", {**base, "subject_id": self.math.pk}, format="json")
        self.assertEqual(ok.status_code, 201)
        self.assertEqual(ok.data["len_comments"], 0)

        denied = self.client.post("/api/announcements/create/", {**base, "subject_id": self.english.pk}, format="json")
        self.assertEqual(denied.status_code, 400)

        mismatched = self.client.post(
            "/api/announcements/create/", {**base, "subject_id": self.other_subject.pk}, format="json"
        )
        self.assertEqual(mismatched.status_code, 400)


class CommentThreadTests(BaseAPITestCase):
    @classmethod
    def setUpTestData(cls):
        super().setUpTestData()
        cls.announcement = Announcement.objects.create(
            title="Trip", content="Friday", grade=cls.grade, subject=cls.math, created_by=cls.teacher
        )
        cls.classmate = User.objects.create_user(
            email="classmate@school.edu", first_name="Luka", role=User.Role.STUDENT, grade_in=cls.grade
        )

    def post(self, text, **extra):
        return self.client.post(
            "/api/comments/create/", {"comment": text, "announcement": self.announcement.pk, **extra}, format="json"
        )

    def listed(self):
        return {c["id"]: c for c in self.client.get(f"/api/comments/?announcement={self.announcement.pk}").data}

    def test_reply_quotes_the_original(self):
        self.client.force_authenticate(self.student)
        original = self.post("When do we leave?").data

        self.client.force_authenticate(self.teacher)
        reply = self.post("At 9", reply_to=original["id"])
        self.assertEqual(reply.status_code, 201)
        self.assertEqual(
            reply.data["reply_to"],
            {"id": original["id"], "author": "Nino Beridze", "comment": "When do we leave?", "deleted": False},
        )
        self.assertEqual(reply.data["author"]["name"], "Giorgi")
        self.assertEqual(self.listed()[reply.data["id"]]["reply_to"]["id"], original["id"])

    def test_reply_must_be_in_the_same_thread(self):
        other = Announcement.objects.create(title="Other", content="...", grade=self.grade, created_by=self.teacher)
        elsewhere = Comment.objects.create(announcement=other, user=self.teacher, content="Hi")

        self.client.force_authenticate(self.student)
        self.assertEqual(self.post("Re", reply_to=elsewhere.pk).status_code, 400)
        self.assertEqual(self.post("Re", reply_to=999999).status_code, 400)

    def test_edit_own_comment_only(self):
        self.client.force_authenticate(self.student)
        comment = self.post("Helo").data
        self.assertTrue(comment["can_edit"])
        self.assertIsNone(comment["edited_at"])

        edited = self.client.patch(f"/api/comments/{comment['id']}/", {"comment": "Hello"}, format="json")
        self.assertEqual(edited.status_code, 200)
        self.assertEqual(edited.data["comment"], "Hello")
        self.assertIsNotNone(edited.data["edited_at"])

        self.client.force_authenticate(self.classmate)
        self.assertFalse(self.listed()[comment["id"]]["can_edit"])
        denied = self.client.patch(f"/api/comments/{comment['id']}/", {"comment": "Hacked"}, format="json")
        self.assertEqual(denied.status_code, 403)
        self.assertEqual(Comment.objects.get(pk=comment["id"]).content, "Hello")

    def test_delete_leaves_a_placeholder(self):
        self.client.force_authenticate(self.student)
        original = self.post("Secret").data
        self.client.force_authenticate(self.classmate)
        reply = self.post("Nice", reply_to=original["id"]).data

        self.assertEqual(self.client.delete(f"/api/comments/{original['id']}/").status_code, 403)

        self.client.force_authenticate(self.student)
        deleted = self.client.delete(f"/api/comments/{original['id']}/")
        self.assertEqual(deleted.status_code, 200)
        self.assertTrue(deleted.data["deleted"])
        self.assertEqual(deleted.data["comment"], "")

        listed = self.listed()
        self.assertTrue(listed[original["id"]]["deleted"])
        self.assertEqual(listed[reply["id"]]["reply_to"], {"id": original["id"], "author": "Nino Beridze", "comment": "", "deleted": True})
        # Deleted comments don't count, can't be edited again, and can't be replied to.
        self.assertEqual(self.client.get(f"/api/announcements/{self.announcement.pk}/").data["len_comments"], 1)
        self.assertEqual(self.client.patch(f"/api/comments/{original['id']}/", {"comment": "x"}, format="json").status_code, 404)
        self.assertEqual(self.post("Re", reply_to=original["id"]).status_code, 400)

    def test_announcement_author_can_delete_any_comment(self):
        self.client.force_authenticate(self.student)
        comment = self.post("Spam").data
        self.assertTrue(comment["can_delete"])

        self.client.force_authenticate(self.teacher)
        self.assertTrue(self.listed()[comment["id"]]["can_delete"])
        self.assertEqual(self.client.delete(f"/api/comments/{comment['id']}/").status_code, 200)

    def test_reactions_toggle_and_replace(self):
        self.client.force_authenticate(self.teacher)
        comment = self.post("Bring lunch").data

        def react(emoji):
            return self.client.post(f"/api/comments/{comment['id']}/react/", {"emoji": emoji}, format="json")

        self.client.force_authenticate(self.student)
        self.assertEqual(react("👍").data["reactions"], [{"emoji": "👍", "count": 1, "mine": True}])
        self.client.force_authenticate(self.classmate)
        self.assertEqual(react("👍").data["reactions"], [{"emoji": "👍", "count": 2, "mine": True}])

        # Another emoji replaces the classmate's reaction; the same one again removes it.
        self.assertEqual(
            react("❤️").data["reactions"],
            [{"emoji": "👍", "count": 1, "mine": False}, {"emoji": "❤️", "count": 1, "mine": True}],
        )
        self.assertEqual(react("❤️").data["reactions"], [{"emoji": "👍", "count": 1, "mine": False}])

        self.assertEqual(react("💩").status_code, 400)

    def test_comments_of_other_grades_are_hidden(self):
        self.client.force_authenticate(self.teacher)
        comment = self.post("Hi").data

        self.client.force_authenticate(self.other_student)
        self.assertEqual(
            self.client.post(f"/api/comments/{comment['id']}/react/", {"emoji": "👍"}, format="json").status_code, 404
        )
        self.assertEqual(self.client.delete(f"/api/comments/{comment['id']}/").status_code, 404)


# ---------------------------------------------------------------------------
# Profile
# ---------------------------------------------------------------------------

class ProfileTests(BaseAPITestCase):
    def test_update_returns_full_profile(self):
        self.client.force_authenticate(self.student)

        response = self.client.patch("/api/update/profile/", {"first_name": "Ana"}, format="multipart")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["first_name"], "Ana")
        self.assertEqual(response.data["email"], "student@school.edu")
        self.assertEqual(response.data["role"], "student")
        self.assertIn("profilePic", response.data)

    def test_normalize_image_crops_to_square(self):
        buffer = BytesIO()
        Image.new("RGBA", (300, 120), (255, 0, 0, 128)).save(buffer, format="PNG")
        buffer.seek(0)
        buffer.name = "avatar.png"

        result = normalize_image_to_square(buffer, size=64)

        image = Image.open(result)
        self.assertEqual(image.size, (64, 64))
        self.assertEqual(image.format, "JPEG")
        self.assertEqual(result.name, "avatar_64x64.jpg")


# ---------------------------------------------------------------------------
# Exercises, schedule, attendance
# ---------------------------------------------------------------------------

class DailyExerciseTests(BaseAPITestCase):
    def test_teacher_gets_role_subjects_and_own_exercises(self):
        self.client.force_authenticate(self.teacher)

        created = self.client.post(
            "/api/exercises/daily/create/",
            {"grade_id": self.grade.pk, "subject_id": self.math.pk, "title": "Page 12"},
            format="json",
        )
        self.assertEqual(created.status_code, 201)

        duplicate = self.client.post(
            "/api/exercises/daily/create/",
            {"grade_id": self.grade.pk, "subject_id": self.math.pk, "title": "Page 12"},
            format="json",
        )
        self.assertEqual(duplicate.status_code, 400)

        response = self.client.get("/api/exercises/daily/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["role"], "teacher")
        self.assertEqual([s["id"] for s in response.data["subjects"]], [self.math.pk])
        self.assertEqual([i["title"] for i in response.data["items"]], ["Page 12"])

    def test_teacher_cannot_assign_to_untaught_grade(self):
        self.client.force_authenticate(self.teacher)
        response = self.client.post(
            "/api/exercises/daily/create/", {"grade_id": self.other_grade.pk, "title": "X"}, format="json"
        )
        self.assertEqual(response.status_code, 403)

    def test_student_sees_grade_exercises(self):
        DailyExercise.objects.create(grade=self.grade, subject=self.math, date=timezone.localdate(), title="Read")
        self.client.force_authenticate(self.student)

        response = self.client.get("/api/exercises/daily/")

        self.assertEqual(response.data["role"], "student")
        self.assertEqual([i["title"] for i in response.data["items"]], ["Read"])
        self.assertEqual(response.data["items"][0]["grade"]["category_name"], self.category.name)


class ScheduleTests(BaseAPITestCase):
    @classmethod
    def setUpTestData(cls):
        super().setUpTestData()
        cls.lesson = WeeklyLesson.objects.create(
            grade=cls.grade, subject=cls.math, teacher=cls.teacher,
            weekday=1, start_time=time(9, 0), end_time=time(9, 45),
        )

    def test_parent_sees_childs_grade(self):
        self.client.force_authenticate(self.parent)

        response = self.client.get("/api/schedule/grade-weekday/?weekday=1")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["grade"]["id"], self.grade.pk)

        other = self.client.get(f"/api/schedule/grade-weekday/?weekday=1&grade_id={self.other_grade.pk}")
        self.assertEqual(other.status_code, 403)

    def test_teacher_is_forbidden(self):
        self.client.force_authenticate(self.teacher)
        self.assertEqual(self.client.get("/api/schedule/grade-weekday/?weekday=1").status_code, 403)


class AttendanceTests(BaseAPITestCase):
    def test_marking_attendance_records_it(self):
        today = timezone.localdate()
        lesson = WeeklyLesson.objects.create(
            grade=self.grade, subject=self.math, teacher=self.teacher,
            weekday=today.isoweekday(), start_time=time(10, 0), end_time=time(10, 45),
        )
        self.client.force_authenticate(self.teacher)

        with self.captureOnCommitCallbacks(execute=True):
            response = self.client.post(
                "/api/teacher/attendance/mark/",
                {
                    "lesson_id": lesson.pk,
                    "date": str(today),
                    "attendance": [
                        {"student_id": self.student.pk, "is_present": "false"},
                        {"student_id": self.other_student.pk, "is_present": True},  # not in this grade
                    ],
                },
                format="json",
            )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["absent_count"], 1)
        self.assertEqual(response.data["present_count"], 0)
        self.assertFalse(LessonAttendance.objects.get(student=self.student).is_present)

    def test_attendance_must_be_a_list(self):
        self.client.force_authenticate(self.teacher)
        response = self.client.post(
            "/api/teacher/attendance/mark/",
            {"lesson_id": 1, "date": str(timezone.localdate()), "attendance": "nope"},
            format="json",
        )
        self.assertEqual(response.status_code, 400)


# ---------------------------------------------------------------------------
# AI support & admin
# ---------------------------------------------------------------------------

class AISupportTests(BaseAPITestCase):
    def setUp(self):
        super().setUp()
        self.client.force_authenticate(self.student)

    @override_settings(DEEPSEEK_API_KEY="")
    def test_missing_key_is_reported(self):
        response = self.client.post("/api/aisupport/", {"message": "hi"}, format="json")
        self.assertEqual(response.status_code, 503)

    @mock.patch("api.views.requests.post")
    def test_history_is_forwarded(self, post):
        post.return_value = mock.Mock(ok=True, json=lambda: {"choices": [{"message": {"content": " Sure "}}]})

        response = self.client.post(
            "/api/aisupport/",
            {
                "message": "And tomorrow?",
                "history": [
                    {"role": "user", "content": "When is the exam?"},
                    {"role": "assistant", "content": "Monday."},
                ],
            },
            format="json",
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["reply"], "Sure")
        messages = post.call_args.kwargs["json"]["messages"]
        self.assertEqual([m["role"] for m in messages], ["system", "user", "assistant", "user"])


class AdminTests(BaseAPITestCase):
    def test_subject_search_works(self):
        admin = User.objects.create_superuser("admin@school.edu", "pass12345")
        self.client.force_login(admin)

        response = self.client.get("/en/admin/api/subject/", {"q": "Math"})

        self.assertEqual(response.status_code, 200)

    def make_school_data(self):
        today = timezone.localdate()
        exam = Exam.objects.create(title={"en": "Quiz"}, subject=self.math, grade=self.grade, duration=10)
        question = Question.objects.create(exam=exam, text={"en": "2 + 2"}, points=2)
        Option.objects.create(question=question, title={"en": "4"}, is_correct=True)
        UserExamSession.objects.create(user=self.student, exam=exam, finished=True, score_so_far=2, submitted_at=timezone.now())
        announcement = Announcement.objects.create(
            title="Trip", content="Friday", grade=self.grade, subject=self.math, created_by=self.teacher
        )
        Comment.objects.create(announcement=announcement, user=self.student, content="Thanks!")
        Mark.objects.create(student=self.student, subject=self.math, teacher=self.teacher, value=9, date=today)
        lesson = WeeklyLesson.objects.create(
            grade=self.grade, subject=self.math, teacher=self.teacher,
            weekday=today.isoweekday(), start_time=time(9, 0), end_time=time(9, 45),
        )
        LessonAttendance.objects.create(lesson=lesson, date=today, student=self.student, is_present=True)
        exercise = DailyExercise.objects.create(grade=self.grade, subject=self.math, date=today, title="Read")
        ExerciseCompletion.objects.create(exercise=exercise, student=self.student)

    def test_dashboard_shows_the_school_overview(self):
        self.make_school_data()
        self.client.force_login(User.objects.create_superuser("admin@school.edu", "pass12345"))

        response = self.client.get("/en/admin/")

        self.assertEqual(response.status_code, 200)
        week = {str(stat["title"]): stat for stat in response.context["this_week"]}
        self.assertEqual(week["Marks given"]["value"], 1)
        self.assertEqual(week["Attendance"]["value"], "100%")
        self.assertEqual(week["Homework done"]["value"], "100%")  # 1 student in the class, 1 tick
        self.assertEqual(week["Exam results"]["value"], "100%")
        self.assertContains(response, "Trip")

        # Charts use the badge colours: a fully attended day is green, and so is a 9.
        attendance = json.loads(response.context["attendance_chart"])["datasets"][0]
        self.assertEqual(attendance["backgroundColor"], ["#22c55e"])
        marks = json.loads(response.context["marks_chart"])["datasets"][0]
        self.assertEqual(marks["backgroundColor"][9 - 1], "#22c55e")
        self.assertEqual(marks["backgroundColor"][3 - 1], "#ef4444")

    def test_every_admin_page_renders(self):
        """The list, add form and an existing object's form of every registered model."""
        from django.contrib import admin
        from django.test import RequestFactory
        from django.urls import reverse

        self.make_school_data()
        superuser = User.objects.create_superuser("admin@school.edu", "pass12345")
        self.client.force_login(superuser)
        request = RequestFactory().get("/")
        request.user = superuser

        for model, model_admin in admin.site._registry.items():
            opts = model._meta
            with self.subTest(model=opts.label):
                prefix = f"admin:{opts.app_label}_{opts.model_name}"
                self.assertEqual(self.client.get(reverse(f"{prefix}_changelist")).status_code, 200)
                if model_admin.has_add_permission(request):
                    self.assertEqual(self.client.get(reverse(f"{prefix}_add")).status_code, 200)
                obj = model._default_manager.first()
                if obj is not None:
                    self.assertEqual(self.client.get(reverse(f"{prefix}_change", args=[obj.pk])).status_code, 200)


# ---------------------------------------------------------------------------
# Mobile: push notifications, parents, token rotation
# ---------------------------------------------------------------------------

def expo_ok(*args, **kwargs):
    messages = kwargs["json"]
    return mock.Mock(ok=True, json=lambda: {"data": [{"status": "ok", "id": str(i)} for i in range(len(messages))]})


class PushDeviceTests(BaseAPITestCase):
    TOKEN = "ExponentPushToken[abc123]"

    def register(self, user, token=TOKEN, **extra):
        self.client.force_authenticate(user)
        return self.client.post("/api/push/register/", {"token": token, **extra}, format="json")

    def test_register_and_move_between_users(self):
        self.assertEqual(self.register(self.student, platform="ios", language="en").status_code, 200)
        device = PushDevice.objects.get(token=self.TOKEN)
        self.assertEqual((device.user, device.platform, device.language), (self.student, "ios", "en"))

        # Another account logs in on the same phone: the token follows the new user.
        self.assertEqual(self.register(self.teacher).status_code, 200)
        self.assertEqual(PushDevice.objects.get(token=self.TOKEN).user, self.teacher)
        self.assertEqual(PushDevice.objects.count(), 1)

    def test_invalid_token_rejected(self):
        self.assertEqual(self.register(self.student, token="not-a-token").status_code, 400)

    def test_unregister_only_own_device(self):
        self.register(self.student)

        self.client.force_authenticate(self.teacher)
        self.client.post("/api/push/unregister/", {"token": self.TOKEN}, format="json")
        self.assertTrue(PushDevice.objects.filter(token=self.TOKEN).exists())

        self.client.force_authenticate(self.student)
        self.client.post("/api/push/unregister/", {"token": self.TOKEN}, format="json")
        self.assertFalse(PushDevice.objects.filter(token=self.TOKEN).exists())


@mock.patch("api.push.requests.post", side_effect=expo_ok)
class PushTriggerTests(BaseAPITestCase):
    @classmethod
    def setUpTestData(cls):
        super().setUpTestData()
        PushDevice.objects.create(user=cls.student, token="ExponentPushToken[student]", language="en")
        PushDevice.objects.create(user=cls.parent, token="ExponentPushToken[parent]", language="ka")
        PushDevice.objects.create(user=cls.teacher, token="ExponentPushToken[teacher]", language="ru")
        PushDevice.objects.create(user=cls.other_student, token="ExponentPushToken[other]", language="en")

    def sent_messages(self, post):
        return [m for call in post.call_args_list for m in call.kwargs["json"]]

    def test_announcement_notifies_grade_students_and_parents(self, post):
        self.client.force_authenticate(self.teacher)
        with self.captureOnCommitCallbacks(execute=True):
            response = self.client.post(
                "/api/announcements/create/",
                {"title": "Trip", "content": "Friday", "subject_id": self.math.pk,
                 "grade_id": self.grade.pk, "category_id": self.category.pk},
                format="json",
            )
        self.assertEqual(response.status_code, 201)

        messages = {m["to"]: m for m in self.sent_messages(post)}
        self.assertEqual(set(messages), {"ExponentPushToken[student]", "ExponentPushToken[parent]"})
        self.assertEqual(messages["ExponentPushToken[student]"]["title"], "New announcement: Trip")
        self.assertEqual(messages["ExponentPushToken[parent]"]["title"], "ახალი განცხადება: Trip")
        self.assertEqual(messages["ExponentPushToken[student]"]["data"], {"type": "announcement", "id": response.data["id"]})

    def test_comment_notifies_author_only(self, post):
        announcement = Announcement.objects.create(
            title="Trip", content="Friday", grade=self.grade, subject=self.math, created_by=self.teacher
        )
        self.client.force_authenticate(self.student)
        with self.captureOnCommitCallbacks(execute=True):
            self.client.post("/api/comments/create/", {"comment": "Yay", "announcement": announcement.pk}, format="json")

        messages = self.sent_messages(post)
        self.assertEqual([m["to"] for m in messages], ["ExponentPushToken[teacher]"])
        self.assertIn("Nino Beridze: Yay", messages[0]["body"])

    def test_reply_notifies_the_person_replied_to(self, post):
        announcement = Announcement.objects.create(
            title="Trip", content="Friday", grade=self.grade, subject=self.math, created_by=self.teacher
        )
        question = Comment.objects.create(announcement=announcement, user=self.parent, content="Which bus?")

        self.client.force_authenticate(self.student)
        with self.captureOnCommitCallbacks(execute=True):
            response = self.client.post(
                "/api/comments/create/",
                {"comment": "The blue one", "announcement": announcement.pk, "reply_to": question.pk},
                format="json",
            )

        messages = {m["to"]: m for m in self.sent_messages(post)}
        self.assertEqual(set(messages), {"ExponentPushToken[parent]", "ExponentPushToken[teacher]"})
        self.assertEqual(messages["ExponentPushToken[parent]"]["title"], "ახალი პასუხი: Trip")
        self.assertEqual(messages["ExponentPushToken[teacher]"]["title"], "Новый комментарий: Trip")
        self.assertEqual(
            messages["ExponentPushToken[parent]"]["data"],
            {"type": "announcement", "id": announcement.pk, "comment": response.data["id"]},
        )

    def test_reply_to_the_author_notifies_them_once(self, post):
        announcement = Announcement.objects.create(
            title="Trip", content="Friday", grade=self.grade, subject=self.math, created_by=self.teacher
        )
        note = Comment.objects.create(announcement=announcement, user=self.teacher, content="Bring water")

        self.client.force_authenticate(self.student)
        with self.captureOnCommitCallbacks(execute=True):
            self.client.post(
                "/api/comments/create/",
                {"comment": "OK", "announcement": announcement.pk, "reply_to": note.pk},
                format="json",
            )

        messages = self.sent_messages(post)
        self.assertEqual([m["to"] for m in messages], ["ExponentPushToken[teacher]"])
        self.assertEqual(messages[0]["title"], "Новый ответ: Trip")

    def test_exercise_notifies_grade(self, post):
        self.client.force_authenticate(self.teacher)
        with self.captureOnCommitCallbacks(execute=True):
            self.client.post(
                "/api/exercises/daily/create/",
                {"grade_id": self.grade.pk, "subject_id": self.math.pk, "title": "Page 12"},
                format="json",
            )

        messages = {m["to"]: m for m in self.sent_messages(post)}
        self.assertEqual(set(messages), {"ExponentPushToken[student]", "ExponentPushToken[parent]"})
        self.assertEqual(messages["ExponentPushToken[student]"]["title"], "New exercise · Math")
        self.assertEqual(messages["ExponentPushToken[parent]"]["title"], "ახალი დავალება · მათემატიკა")

    def test_attendance_notifies_parents_in_one_request(self, post):
        today = timezone.localdate()
        lesson = WeeklyLesson.objects.create(
            grade=self.grade, subject=self.math, teacher=self.teacher,
            weekday=today.isoweekday(), start_time=time(10, 0), end_time=time(10, 45),
        )
        self.client.force_authenticate(self.teacher)
        with self.captureOnCommitCallbacks(execute=True):
            self.client.post(
                "/api/teacher/attendance/mark/",
                {"lesson_id": lesson.pk, "date": str(today),
                 "attendance": [{"student_id": self.student.pk, "is_present": False}]},
                format="json",
            )

        self.assertEqual(post.call_count, 1)
        [message] = self.sent_messages(post)
        self.assertEqual(message["to"], "ExponentPushToken[parent]")
        self.assertEqual(message["title"], "Nino Beridze · მათემატიკა")
        self.assertIn("არ გამოცხადდა", message["body"])

    def test_unregistered_devices_are_removed(self, post):
        post.side_effect = lambda *a, **kw: mock.Mock(
            ok=True,
            json=lambda: {"data": [
                {"status": "error", "message": "gone", "details": {"error": "DeviceNotRegistered"}}
                for _ in kw["json"]
            ]},
        )
        from api import push
        push.notify_users([self.student.pk], lambda lang: ("t", "b"))
        self.assertFalse(PushDevice.objects.filter(user=self.student).exists())

    def test_network_errors_are_swallowed(self, post):
        import requests
        post.side_effect = requests.ConnectionError()
        from api import push
        push.notify_users([self.student.pk], lambda lang: ("t", "b"))  # must not raise

    @override_settings(PUSH_NOTIFICATIONS_ENABLED=False)
    def test_can_be_disabled(self, post):
        from api import push
        push.notify_users([self.student.pk], lambda lang: ("t", "b"))
        post.assert_not_called()


class ParentTests(BaseAPITestCase):
    def setUp(self):
        super().setUp()
        self.client.force_authenticate(self.parent)

    def test_home_lists_children_with_todays_attendance(self):
        today = timezone.localdate()
        lesson = WeeklyLesson.objects.create(
            grade=self.grade, subject=self.math, teacher=self.teacher,
            weekday=today.isoweekday(), start_time=time(8, 0), end_time=time(8, 45),
        )
        LessonAttendance.objects.create(lesson=lesson, date=today, student=self.student, is_present=False)

        response = self.client.get("/api/home/")

        self.assertEqual(response.status_code, 200)
        [child] = response.data["children"]
        self.assertEqual(child["id"], self.student.pk)
        self.assertEqual(child["grade"]["id"], self.grade.pk)
        self.assertEqual(child["attendance_today"][0]["is_present"], False)

    def test_sees_childrens_exercises_and_books(self):
        DailyExercise.objects.create(grade=self.grade, date=timezone.localdate(), title="Read")
        DailyExercise.objects.create(grade=self.other_grade, date=timezone.localdate(), title="Other")

        exercises = self.client.get("/api/exercises/daily/")
        self.assertEqual(exercises.status_code, 200)
        self.assertEqual([i["title"] for i in exercises.data["items"]], ["Read"])

        subjects = self.client.get("/api/my_subjects/")
        self.assertEqual({s["pk"] for s in subjects.data}, {self.math.pk, self.english.pk})

    def test_announcement_detail_respects_visibility(self):
        mine = Announcement.objects.create(title="A", content="c", grade=self.grade, created_by=self.teacher)
        other = Announcement.objects.create(title="B", content="c", grade=self.other_grade, created_by=self.teacher)

        self.assertEqual(self.client.get(f"/api/announcements/{mine.pk}/").status_code, 200)
        self.assertEqual(self.client.get(f"/api/announcements/{other.pk}/").status_code, 404)


class TokenRotationTests(BaseAPITestCase):
    def test_refresh_rotates_and_blacklists_old_token(self):
        old = str(RefreshToken.for_user(self.student))

        response = self.client.post("/api/auth/refresh/", {"refresh": old}, format="json")
        self.assertEqual(response.status_code, 200)
        self.assertIn("refresh", response.data)

        reused = self.client.post("/api/auth/refresh/", {"refresh": old}, format="json")
        self.assertEqual(reused.status_code, 401)


# ---------------------------------------------------------------------------
# Exam history, review and the teacher's exam builder
# ---------------------------------------------------------------------------

class ExamReviewTests(BaseAPITestCase):
    @classmethod
    def setUpTestData(cls):
        super().setUpTestData()
        cls.exam = Exam.objects.create(title={"en": "Quiz"}, subject=cls.math, grade=cls.grade, duration=30)
        cls.q1 = Question.objects.create(exam=cls.exam, text={"en": "2+2"}, points=2)
        cls.q1_right = Option.objects.create(question=cls.q1, title={"en": "4"}, is_correct=True)
        cls.q1_wrong = Option.objects.create(question=cls.q1, title={"en": "5"})
        cls.q2 = Question.objects.create(exam=cls.exam, text={"en": "3+3"}, points=3)
        cls.q2_right = Option.objects.create(question=cls.q2, title={"en": "6"}, is_correct=True)
        cls.q2_wrong = Option.objects.create(question=cls.q2, title={"en": "7"})

    def take_exam(self):
        self.client.force_authenticate(self.student)
        session_id = self.client.post(f"/api/exams/{self.exam.pk}/start_or_resume/").data["session_id"]
        self.client.post(
            f"/api/sessions/{session_id}/answer/",
            {"question_id": self.q1.pk, "option_id": self.q1_right.pk},
            format="json",
        )
        result = self.client.post(
            f"/api/sessions/{session_id}/answer/",
            {"question_id": self.q2.pk, "option_id": self.q2_wrong.pk},
            format="json",
        )
        return session_id, result

    def test_result_links_to_review_with_answers(self):
        session_id, result = self.take_exam()
        self.assertEqual(result.data["session_id"], session_id)
        self.assertEqual(result.data["max_score"], 5)

        review = self.client.get(f"/api/sessions/{session_id}/review/")
        self.assertEqual(review.status_code, 200)
        self.assertEqual((review.data["score"], review.data["max_score"]), (2, 5))
        first, second = review.data["questions"]
        self.assertTrue(first["is_correct"])
        self.assertEqual(second["chosen_option_id"], self.q2_wrong.pk)
        self.assertFalse(second["is_correct"])
        self.assertEqual([o["is_correct"] for o in second["options"]], [True, False])

    def test_review_is_private_and_only_after_finishing(self):
        self.client.force_authenticate(self.student)
        session_id = self.client.post(f"/api/exams/{self.exam.pk}/start_or_resume/").data["session_id"]
        self.assertEqual(self.client.get(f"/api/sessions/{session_id}/review/").status_code, 400)

        self.client.force_authenticate(self.other_student)
        self.assertEqual(self.client.get(f"/api/sessions/{session_id}/review/").status_code, 404)

    def test_history_for_student_and_parent(self):
        session_id, _ = self.take_exam()

        history = self.client.get("/api/exams/history/")
        [item] = history.data["items"]
        self.assertEqual((item["session_id"], item["score"], item["max_score"]), (session_id, 2, 5))
        self.assertEqual((item["correct"], item["total_questions"]), (1, 2))

        self.client.force_authenticate(self.parent)
        self.assertEqual(len(self.client.get("/api/exams/history/").data["items"]), 1)
        self.assertEqual(self.client.get(f"/api/sessions/{session_id}/review/").status_code, 200)
        self.assertEqual(
            self.client.get(f"/api/exams/history/?student_id={self.other_student.pk}").status_code, 403
        )


@mock.patch("api.push.requests.post", side_effect=expo_ok)
class TeacherExamTests(BaseAPITestCase):
    def payload(self, **overrides):
        data = {
            "subject_id": self.math.pk,
            "title": "Fractions",
            "duration": 20,
            "scheduled_for": str(timezone.localdate() + timedelta(days=3)),
            "questions": [
                {"text": "1/2 + 1/2", "points": 2, "options": [
                    {"title": "1", "is_correct": True}, {"title": "2"},
                ]},
            ],
        }
        data.update(overrides)
        return data

    def test_teacher_creates_exam_and_class_is_notified(self, post):
        PushDevice.objects.create(user=self.student, token="ExponentPushToken[s]", language="en")
        PushDevice.objects.create(user=self.other_student, token="ExponentPushToken[o]", language="en")
        self.client.force_authenticate(self.teacher)

        with self.captureOnCommitCallbacks(execute=True):
            response = self.client.post("/api/teacher/exams/", self.payload(), format="json", HTTP_ACCEPT_LANGUAGE="ka")

        self.assertEqual(response.status_code, 201)
        exam = Exam.objects.get(pk=response.data["id"])
        self.assertEqual(exam.title, {"ka": "Fractions"})
        self.assertEqual((exam.grade, exam.created_by), (self.grade, self.teacher))
        self.assertEqual(exam.questions.get().options.filter(is_correct=True).count(), 1)

        [message] = [m for call in post.call_args_list for m in call.kwargs["json"]]
        self.assertEqual(message["to"], "ExponentPushToken[s]")
        self.assertEqual(message["title"], "New exam · Math")
        self.assertEqual(message["data"], {"type": "exam", "id": exam.pk})

        listing = self.client.get("/api/teacher/exams/").data["items"]
        self.assertEqual([(e["id"], e["questions_count"], e["max_score"]) for e in listing], [(exam.pk, 1, 2)])

    def test_validation(self, post):
        self.client.force_authenticate(self.teacher)
        no_correct = self.payload(questions=[{"text": "?", "options": [{"title": "a"}, {"title": "b"}]}])
        self.assertEqual(self.client.post("/api/teacher/exams/", no_correct, format="json").status_code, 400)
        one_option = self.payload(questions=[{"text": "?", "options": [{"title": "a", "is_correct": True}]}])
        self.assertEqual(self.client.post("/api/teacher/exams/", one_option, format="json").status_code, 400)

        untaught = self.payload(subject_id=self.english.pk)
        self.assertEqual(self.client.post("/api/teacher/exams/", untaught, format="json").status_code, 403)

        self.client.force_authenticate(self.student)
        self.assertEqual(self.client.post("/api/teacher/exams/", self.payload(), format="json").status_code, 403)
        self.assertFalse(Exam.objects.exists())


# ---------------------------------------------------------------------------
# Homework completion
# ---------------------------------------------------------------------------

class ExerciseCompletionTests(BaseAPITestCase):
    def setUp(self):
        super().setUp()
        self.today = timezone.localdate()
        self.exercise = DailyExercise.objects.create(
            grade=self.grade, subject=self.math, teacher=self.teacher, date=self.today, title="Page 1"
        )

    def test_student_ticks_off_and_everyone_sees_it(self):
        self.client.force_authenticate(self.student)
        before = self.client.get("/api/exercises/daily/").data["items"][0]
        self.assertFalse(before["completed"])

        done = self.client.post(f"/api/exercises/{self.exercise.pk}/complete/", {"done": True}, format="json")
        self.assertEqual(done.status_code, 200)
        self.assertEqual(done.data["streak"], 1)
        self.assertTrue(self.client.get("/api/exercises/daily/").data["items"][0]["completed"])

        self.client.force_authenticate(self.parent)
        self.assertTrue(self.client.get("/api/exercises/daily/").data["items"][0]["completed"])

        self.client.force_authenticate(self.teacher)
        item = self.client.get("/api/exercises/daily/").data["items"][0]
        self.assertEqual(item["completion"], {"done": 1, "total": 1})

        self.client.force_authenticate(self.student)
        self.client.post(f"/api/exercises/{self.exercise.pk}/complete/", {"done": False}, format="json")
        self.assertFalse(ExerciseCompletion.objects.exists())

    def test_only_own_class_and_students(self):
        self.client.force_authenticate(self.other_student)
        self.assertEqual(self.client.post(f"/api/exercises/{self.exercise.pk}/complete/").status_code, 404)
        self.client.force_authenticate(self.teacher)
        self.assertEqual(self.client.post(f"/api/exercises/{self.exercise.pk}/complete/").status_code, 403)

    def test_dashboard_counts_pending_homework(self):
        self.client.force_authenticate(self.student)
        self.assertEqual(self.client.get("/api/home/").data["pending_homework"], 1)
        self.client.post(f"/api/exercises/{self.exercise.pk}/complete/")
        self.assertEqual(self.client.get("/api/home/").data["pending_homework"], 0)

    def test_streak_skips_weekends_and_today(self):
        friday = date(2026, 10, 2)
        monday = date(2026, 10, 5)

        def done_on(day, title):
            exercise = DailyExercise.objects.create(grade=self.grade, date=day, title=title)
            completion = ExerciseCompletion.objects.create(exercise=exercise, student=self.student)
            moment = timezone.make_aware(timezone.datetime.combine(day, time(18, 0)))
            ExerciseCompletion.objects.filter(pk=completion.pk).update(completed_at=moment)

        done_on(friday - timedelta(days=1), "thu")
        done_on(friday, "fri")
        # Nothing over the weekend and nothing yet on Monday: still a 2-day streak.
        self.assertEqual(homework_streak(self.student, today=monday), 2)
        done_on(monday, "mon")
        self.assertEqual(homework_streak(self.student, today=monday), 3)
        # A school day without homework done breaks it.
        self.assertEqual(homework_streak(self.student, today=monday + timedelta(days=2)), 0)


# ---------------------------------------------------------------------------
# Gradebook
# ---------------------------------------------------------------------------

@mock.patch("api.push.requests.post", side_effect=expo_ok)
class MarkTests(BaseAPITestCase):
    def give(self, **data):
        payload = {"student_id": self.student.pk, "subject_id": self.math.pk, "value": 9}
        payload.update(data)
        return self.client.post("/api/teacher/marks/", payload, format="json")

    def test_teacher_gives_marks_student_and_parent_see_them(self, post):
        PushDevice.objects.create(user=self.student, token="ExponentPushToken[s]", language="en")
        PushDevice.objects.create(user=self.parent, token="ExponentPushToken[p]", language="ka")
        self.client.force_authenticate(self.teacher)

        with self.captureOnCommitCallbacks(execute=True):
            self.assertEqual(self.give(value=9, comment="Great").status_code, 201)
        self.assertEqual(self.give(value=6).status_code, 201)

        messages = {m["to"]: m for call in post.call_args_list for m in call.kwargs["json"]}
        self.assertEqual(messages["ExponentPushToken[s]"]["title"], "New mark · Math")
        self.assertEqual(messages["ExponentPushToken[s]"]["body"], "9/10 · Great")
        self.assertEqual(messages["ExponentPushToken[p]"]["title"], "ახალი ნიშანი · მათემატიკა")

        gradebook = self.client.get(f"/api/teacher/marks/?subject_id={self.math.pk}").data
        [row] = gradebook["students"]
        self.assertEqual((row["id"], row["average"], len(row["marks"])), (self.student.pk, 7.5, 2))

        self.client.force_authenticate(self.student)
        marks = self.client.get("/api/marks/").data
        self.assertEqual(marks["average"], 7.5)
        math = next(s for s in marks["subjects"] if s["subject_id"] == self.math.pk)
        self.assertEqual([m["value"] for m in math["marks"]], [6, 9])
        english = next(s for s in marks["subjects"] if s["subject_id"] == self.english.pk)
        self.assertIsNone(english["average"])

        self.client.force_authenticate(self.parent)
        self.assertEqual(self.client.get(f"/api/marks/?student_id={self.student.pk}").data["average"], 7.5)

        self.client.force_authenticate(self.student)
        self.assertEqual(self.client.get("/api/home/").data["average_mark"], 7.5)

    def test_rules(self, post):
        self.client.force_authenticate(self.teacher)
        self.assertEqual(self.give(value=11).status_code, 400)
        self.assertEqual(self.give(date=str(timezone.localdate() + timedelta(days=1))).status_code, 400)
        self.assertEqual(self.give(subject_id=self.english.pk).status_code, 403)
        self.assertEqual(self.give(student_id=self.other_student.pk).status_code, 400)
        self.assertEqual(self.client.get(f"/api/teacher/marks/?subject_id={self.english.pk}").status_code, 404)

        self.client.force_authenticate(self.student)
        self.assertEqual(self.give().status_code, 403)
        self.assertEqual(self.client.get(f"/api/marks/?student_id={self.other_student.pk}").status_code, 403)
        self.assertFalse(Mark.objects.exists())

    def test_teacher_deletes_only_own_marks(self, post):
        mark = Mark.objects.create(student=self.student, subject=self.math, teacher=self.teacher, value=5)
        other_teacher = User.objects.create_user(email="t2@school.edu", role=User.Role.TEACHER)

        self.client.force_authenticate(other_teacher)
        self.assertEqual(self.client.delete(f"/api/teacher/marks/{mark.pk}/").status_code, 404)
        self.client.force_authenticate(self.teacher)
        self.assertEqual(self.client.delete(f"/api/teacher/marks/{mark.pk}/").status_code, 204)
        self.assertFalse(Mark.objects.exists())


# ---------------------------------------------------------------------------
# Attendance history, calendar, search
# ---------------------------------------------------------------------------

class HistoryAndCalendarTests(BaseAPITestCase):
    @classmethod
    def setUpTestData(cls):
        super().setUpTestData()
        cls.lesson = WeeklyLesson.objects.create(
            grade=cls.grade, subject=cls.math, teacher=cls.teacher,
            weekday=1, start_time=time(9, 0), end_time=time(9, 45), room="12",
        )

    def test_attendance_history_by_month(self):
        LessonAttendance.objects.create(lesson=self.lesson, date=date(2026, 9, 7), student=self.student)
        LessonAttendance.objects.create(lesson=self.lesson, date=date(2026, 9, 14), student=self.student, is_present=False)
        LessonAttendance.objects.create(lesson=self.lesson, date=date(2026, 10, 5), student=self.student)

        self.client.force_authenticate(self.parent)
        response = self.client.get("/api/attendance/history/?month=2026-09")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["summary"], {"present": 1, "absent": 1, "rate": 50})
        self.assertEqual([r["date"] for r in response.data["records"]], ["2026-09-07", "2026-09-14"])
        self.assertEqual(self.client.get("/api/attendance/history/?month=nope").status_code, 400)

    def test_calendar_combines_lessons_homework_and_exams(self):
        homework = DailyExercise.objects.create(
            grade=self.grade, subject=self.math, date=date(2026, 10, 5), due_date=date(2026, 10, 7), title="Ex"
        )
        ExerciseCompletion.objects.create(exercise=homework, student=self.student)
        Exam.objects.create(
            title={"en": "Test"}, subject=self.math, grade=self.grade, duration=10, scheduled_for=date(2026, 10, 9)
        )
        Exam.objects.create(title={"en": "Unscheduled"}, subject=self.math, grade=self.grade, duration=10)

        self.client.force_authenticate(self.student)
        data = self.client.get("/api/calendar/?start=2026-10-01&end=2026-10-31").data
        self.assertEqual([lesson["id"] for lesson in data["lessons"]], [self.lesson.pk])
        self.assertEqual([(h["id"], h["completed"]) for h in data["homework"]], [(homework.pk, True)])
        self.assertEqual([e["scheduled_for"] for e in data["exams"]], ["2026-10-09"])

        self.client.force_authenticate(self.teacher)
        teacher = self.client.get("/api/calendar/?start=2026-10-01&end=2026-10-31").data
        self.assertEqual(len(teacher["lessons"]), 1)
        # The homework above has no teacher, so it isn't theirs.
        self.assertEqual(teacher["homework"], [])

        self.assertEqual(self.client.get("/api/calendar/?start=2026-10-01&end=2027-10-01").status_code, 400)
        self.assertEqual(self.client.get("/api/calendar/").status_code, 400)

    def test_parent_search_covers_childs_class(self):
        Announcement.objects.create(title="Museum trip", content="c", grade=self.grade, created_by=self.teacher)
        Announcement.objects.create(title="Museum day", content="c", grade=self.other_grade, created_by=self.teacher)

        self.client.force_authenticate(self.parent)
        response = self.client.get("/api/search/?q=museum")
        self.assertEqual([a["title"] for a in response.data["announcements"]], ["Museum trip"])


class SeedDemoTests(BaseAPITestCase):
    @override_settings(DEBUG=True)
    def test_seed_fills_existing_classes_once(self):
        call_command("seed_demo", days=10, stdout=StringIO())

        self.assertTrue(WeeklyLesson.objects.filter(grade=self.grade).exists())
        self.assertTrue(Mark.objects.filter(student=self.student).exists())
        self.assertTrue(UserExamSession.objects.filter(user=self.student, finished=True).exists())
        self.assertTrue(self.teacher.subjects_taught.filter(grade=self.grade).exists())

        exams = Exam.objects.count()
        marks = Mark.objects.count()
        call_command("seed_demo", days=10, stdout=StringIO())
        self.assertEqual((Exam.objects.count(), Mark.objects.count()), (exams, marks))

    @override_settings(DEBUG=False)
    def test_refuses_production(self):
        with self.assertRaises(CommandError):
            call_command("seed_demo")


# ---------------------------------------------------------------------------
# Telegram: login codes, forwarded notifications and the bot's screens
# ---------------------------------------------------------------------------

PREMIUM = {"🔐": "1001", "⏳": "1002", "🔑": "1003", "📣": "1004", "🌐": "1005", "👋": "1006"}


def telegram_ok(*args, **kwargs):
    return mock.Mock(ok=True, status_code=200, json=lambda: {"ok": True})


@override_settings(TELEGRAM_BOT_TOKEN="test-token", PUSH_NOTIFICATIONS_ENABLED=False, WEBSITE_URL="https://school.example")
@mock.patch("api.telegram.run_in_background", side_effect=lambda job: job())
@mock.patch("api.telegram.premium_ids", return_value=PREMIUM)
@mock.patch("api.telegram.requests.post", side_effect=telegram_ok)
class TelegramDeliveryTests(BaseAPITestCase):
    def sent(self, post):
        return [call.kwargs["json"] for call in post.call_args_list]

    def test_login_code_has_premium_emoji_and_a_copy_button(self, post, *_):
        from api.telegram import send_login_code

        self.assertTrue(send_login_code("42", "123456", "en"))
        [message] = self.sent(post)
        self.assertEqual(message["chat_id"], "42")
        self.assertEqual(message["parse_mode"], "HTML")
        self.assertIn("<code>123456</code>", message["text"])
        self.assertIn('<tg-emoji emoji-id="1001">🔐</tg-emoji>', message["text"])
        self.assertIn("Your login code", message["text"])
        self.assertEqual(
            message["reply_markup"]["inline_keyboard"],
            [[{"text": "Copy code", "icon_custom_emoji_id": "1003", "style": "primary", "copy_text": {"text": "123456"}}]],
        )

    def test_refused_premium_emoji_are_sent_plain(self, post, *_):
        from api.telegram import send_login_code

        post.side_effect = [
            mock.Mock(ok=False, status_code=400, text="Bad Request"),
            mock.Mock(ok=True, status_code=200),
        ]
        self.assertTrue(send_login_code("42", "123456", "ka"))
        plain = self.sent(post)[1]
        self.assertNotIn("tg-emoji", plain["text"])
        self.assertIn("🔐", plain["text"])
        self.assertEqual(plain["reply_markup"]["inline_keyboard"][0][0]["text"], "🔑 კოდის კოპირება")

    def test_notifications_reach_connected_people_in_their_language(self, post, *_):
        User.objects.filter(pk=self.parent.pk).update(telegram_language="en")
        self.client.force_authenticate(self.teacher)
        with self.captureOnCommitCallbacks(execute=True):
            self.client.post(
                "/api/announcements/create/",
                {"title": "Trip <3", "content": "Friday", "subject_id": self.math.pk,
                 "grade_id": self.grade.pk, "category_id": self.category.pk},
                format="json",
            )

        messages = {m["chat_id"]: m for m in self.sent(post)}
        self.assertEqual(set(messages), {"111", "999"})
        self.assertIn("ახალი განცხადება: Trip &lt;3", messages["111"]["text"])
        self.assertIn("New announcement: Trip &lt;3", messages["999"]["text"])
        self.assertIn('<tg-emoji emoji-id="1004">📣</tg-emoji>', messages["999"]["text"])
        button = messages["999"]["reply_markup"]["inline_keyboard"][0][0]
        self.assertEqual(button["url"], "https://school.example/en/announcement")

    def test_turned_off_notifications_are_not_forwarded(self, post, *_):
        User.objects.filter(pk=self.parent.pk).update(telegram_notifications=False)
        from api import push

        push.notify_users([self.student.pk, self.parent.pk, self.teacher.pk], lambda lang: ("Hi", "There"))
        self.assertEqual([m["chat_id"] for m in self.sent(post)], ["111"])

    def test_attendance_reaches_parents(self, post, *_):
        today = timezone.localdate()
        lesson = WeeklyLesson.objects.create(
            grade=self.grade, subject=self.math, teacher=self.teacher,
            weekday=today.isoweekday(), start_time=time(10, 0), end_time=time(10, 45),
        )
        self.client.force_authenticate(self.teacher)
        with self.captureOnCommitCallbacks(execute=True):
            self.client.post(
                "/api/teacher/attendance/mark/",
                {"lesson_id": lesson.pk, "date": str(today),
                 "attendance": [{"student_id": self.student.pk, "is_present": False}]},
                format="json",
            )

        [message] = self.sent(post)
        self.assertEqual(message["chat_id"], "999")
        self.assertIn("🚨", message["text"])
        self.assertIn("Nino Beridze · მათემატიკა", message["text"])
        self.assertIn("არ გამოცხადდა", message["text"])

    def test_otp_request_sends_the_code_in_the_bots_language(self, post, *_):
        User.objects.filter(pk=self.student.pk).update(telegram_language="ru")
        response = self.client.post("/api/otp/request/", {"email": "student@school.edu"}, format="json")

        self.assertEqual(response.status_code, 200)
        [message] = self.sent(post)
        self.assertIn("Ваш код для входа", message["text"])


class BotScreenTests(BaseAPITestCase):
    def ctx(self, lang="en", ids=None, child_id=None):
        from api.bot.screens import Ctx

        return Ctx(lang, ids or {}, child_id)

    def callbacks(self, screen):
        return [button.get("callback_data") for row in screen.buttons for button in row]

    def test_premium_emoji_and_buttons(self):
        from api.bot.emoji import strip_premium

        ctx = self.ctx(ids={"👋": "77"})
        self.assertEqual(ctx.e("👋"), '<tg-emoji emoji-id="77">👋</tg-emoji>')
        self.assertEqual(ctx.e("🎓"), "🎓")
        self.assertEqual(strip_premium(f"{ctx.e('👋')} Hi"), "👋 Hi")
        self.assertEqual(
            ctx.button("Hello", emoji="👋", data="home", style="primary"),
            {"text": "Hello", "icon_custom_emoji_id": "77", "style": "primary", "callback_data": "home"},
        )
        self.assertEqual(ctx.button("Week", emoji="📈", data="week"), {"text": "📈 Week", "callback_data": "week"})

    def test_linking_by_email(self):
        from api.bot.screens import link_account

        self.assertEqual(link_account(555, "not an email", "en").status, "invalid")
        self.assertEqual(link_account(555, "nobody@school.edu", "en").status, "unknown")
        self.assertEqual(link_account(555, "student@school.edu", "en").status, "taken")

        outcome = link_account(555, " Teacher@School.edu ", "ru")
        self.assertEqual(outcome.status, "linked")
        self.teacher.refresh_from_db()
        self.assertEqual((self.teacher.chat_id, self.teacher.telegram_language), ("555", "ru"))
        self.assertEqual(link_account(555, "teacher@school.edu", "en").status, "already")

    def test_link_screens(self):
        from api.bot.screens import LinkOutcome, link_result

        retry = link_result(self.ctx(), LinkOutcome("unknown"))
        self.assertIn("couldn't find this email", retry.text)
        self.assertEqual(self.callbacks(retry), ["cancel"])

        done = link_result(self.ctx(), LinkOutcome("linked", self.student))
        self.assertIn("Nino Beridze", done.text)
        self.assertEqual(done.effect, "5046509860389126442")

    def test_student_home_and_menu(self):
        from api.bot.screens import home

        Mark.objects.create(student=self.student, subject=self.math, teacher=self.teacher, value=9)
        screen = home(self.ctx(), self.student)
        self.assertIn("Nino!", screen.text)
        self.assertIn("Student · 7 A", screen.text)
        self.assertIn("Average mark: <b>9.0</b>", screen.text)
        self.assertIn("day:0", self.callbacks(screen))
        self.assertIn("marks", self.callbacks(screen))

    def test_teacher_menu_has_no_marks_or_attendance(self):
        from api.bot.screens import home, marks

        callbacks = self.callbacks(home(self.ctx(), self.teacher))
        self.assertNotIn("marks", callbacks)
        self.assertNotIn("att", callbacks)
        self.assertIn("isn't available", marks(self.ctx(), self.teacher).text)

    def test_day_shows_lessons_homework_and_exams(self):
        from api.bot.screens import day

        tomorrow = timezone.localdate() + timedelta(days=1)
        WeeklyLesson.objects.create(
            grade=self.grade, subject=self.math, teacher=self.teacher, weekday=tomorrow.isoweekday(),
            start_time=time(9, 0), end_time=time(9, 45), room="12",
        )
        DailyExercise.objects.create(
            grade=self.grade, subject=self.math, teacher=self.teacher, date=timezone.localdate(),
            due_date=tomorrow, title="Page <12>",
        )
        Exam.objects.create(title={"en": "Quiz"}, subject=self.math, grade=self.grade, duration=30, scheduled_for=tomorrow)

        screen = day(self.ctx(), self.student, 1)
        self.assertIn("Tomorrow", screen.text)
        self.assertIn("<code>09:00</code> Math", screen.text)
        self.assertIn("room 12", screen.text)
        self.assertIn("Page &lt;12&gt;", screen.text)
        self.assertIn("Quiz · Math · ⏳ 30 min", screen.text)
        self.assertEqual(self.callbacks(screen)[:3], ["day:0", "day:0", "day:2"])

    def test_homework_can_be_ticked_off(self):
        from api.bot.screens import complete_homework, homework

        task = DailyExercise.objects.create(
            grade=self.grade, subject=self.math, teacher=self.teacher, date=timezone.localdate(),
            due_date=timezone.localdate() + timedelta(days=2), title="Essay",
        )
        before = homework(self.ctx(), self.student)
        self.assertIn(f"hw:{task.pk}", self.callbacks(before))
        self.assertIn("0 of 1 done", before.text)

        self.assertEqual(complete_homework(self.student, task.pk, "en"), "✅ Done! Nice work.")
        self.assertTrue(ExerciseCompletion.objects.filter(exercise=task, student=self.student).exists())

        after = homework(self.ctx(), self.student)
        self.assertIn("<s>Essay</s>", after.text)
        self.assertNotIn(f"hw:{task.pk}", self.callbacks(after))
        self.assertEqual(complete_homework(self.parent, task.pk, "en"), "This isn't available for your account.")

    def test_parent_sees_the_childs_marks_and_attendance(self):
        from api.bot.screens import attendance, home, marks

        Mark.objects.create(student=self.student, subject=self.math, teacher=self.teacher, value=4, comment="Try again")
        lesson = WeeklyLesson.objects.create(
            grade=self.grade, subject=self.math, teacher=self.teacher,
            weekday=timezone.localdate().isoweekday(), start_time=time(10, 0), end_time=time(10, 45),
        )
        LessonAttendance.objects.create(lesson=lesson, student=self.student, date=timezone.localdate(), is_present=False)

        self.assertIn("Nino Beridze", home(self.ctx(), self.parent).text)

        marks_screen = marks(self.ctx(), self.parent)
        self.assertIn("Marks</b> · Nino", marks_screen.text)
        self.assertIn("🔴 <b>4</b> · Math", marks_screen.text)
        self.assertIn("Try again", marks_screen.text)

        attendance_screen = attendance(self.ctx(lang="ka"), self.parent)
        self.assertIn("გააცდინა: <b>1</b>", attendance_screen.text)
        self.assertIn("მათემატიკა", attendance_screen.text)

    def test_news_escapes_html(self):
        from api.bot.screens import news

        Announcement.objects.create(title="<b>Trip</b>", content="Bring & share", grade=self.grade, created_by=self.teacher)
        screen = news(self.ctx(), self.student)
        self.assertIn("&lt;b&gt;Trip&lt;/b&gt;", screen.text)
        self.assertIn("Bring &amp; share", screen.text)

    def test_accounts_in_one_chat(self):
        from api.bot.screens import active_account, accounts_for_chat, profile

        User.objects.filter(pk=self.parent.pk).update(chat_id="111")
        accounts = accounts_for_chat("111")
        self.assertEqual([a.pk for a in accounts], [self.parent.pk, self.student.pk])
        self.assertEqual(active_account("111", None).pk, self.parent.pk)
        self.assertEqual(active_account("111", self.student.pk).pk, self.student.pk)
        self.assertIn(f"account:{self.student.pk}", self.callbacks(profile(self.ctx(), self.parent, accounts)))

    def test_language_comes_first(self):
        from api.bot.screens import language_picker, welcome

        picker = language_picker(self.ctx())
        for prompt in ("აირჩიეთ ენა", "Choose your language", "Выберите язык"):
            self.assertIn(prompt, picker.text)
        self.assertEqual(self.callbacks(picker), ["lang:ka:start", "lang:en:start", "lang:ru:start"])
        self.assertIn("language", self.callbacks(welcome(self.ctx())))

    def test_every_language_is_complete(self):
        from api.bot.texts import COMMANDS, TEXTS

        english = set(TEXTS["en"])
        for language, texts in TEXTS.items():
            self.assertEqual(set(texts), english, language)
            for command in COMMANDS:
                self.assertTrue(texts[f"cmd_{command}"], f"{language}: /{command}")
