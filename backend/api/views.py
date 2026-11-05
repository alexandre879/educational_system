import logging
import secrets
from collections import defaultdict
from datetime import date, timedelta
from typing import Any

import requests
from django.conf import settings
from django.contrib.auth.models import update_last_login
from django.core.cache import cache
from django.core.exceptions import ValidationError as DjangoValidationError
from django.db import transaction
from django.db.models import Avg, Count, IntegerField, Q, QuerySet, Sum
from django.db.models.functions import Cast
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.utils.crypto import constant_time_compare
from rest_framework import status
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.permissions import AllowAny
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.tokens import RefreshToken

from api import push
from api.telegram import send_login_code

from .models import (
    MAX_MARK,
    Announcement,
    Comment,
    CommentReaction,
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
    SubjectBook,
    User,
    UserAnswer,
    UserExamSession,
    UserSubjectPoints,
    WeeklyLesson,
    visible_comment_count,
)
from .serializers import (
    AISupportSerializer,
    AnnouncementSerializer,
    AnnouncementValidatorSerializer,
    CommentEditSerializer,
    CommentReactionSerializer,
    CommentsCreateSerializer,
    LeaderBoardSerializer,
    MarkCreateSerializer,
    MeSerializer,
    PushDeviceSerializer,
    QuestionSerializer,
    RequestOtpSerializer,
    SearchQuerySerializer,
    SessionMiniSerializer,
    SubjectSerializer,
    TeacherExamCreateSerializer,
    UpdateProfileSerializer,
    UserAnswerSerializer,
    UserSerializer,
    UserSubjectPointsSerializer,
    VerifyOtpSerializer,
)
from .translation import get_localized_json_value
from .utils import parse_iso_date


logger = logging.getLogger(__name__)


AI_SYSTEM_PROMPT = (
    "You are an AI support agent inside an educational platform. "
    "Be concise, helpful, and practical. Ask one clarifying question if needed."
)


# ---------------------------------------------------------------------------
# Shared helpers
# ---------------------------------------------------------------------------

def parse_bool(value) -> bool | None:
    if isinstance(value, bool):
        return value
    if isinstance(value, int) and value in (0, 1):
        return bool(value)
    if isinstance(value, str):
        normalized = value.strip().lower()
        if normalized in {"true", "1", "yes"}:
            return True
        if normalized in {"false", "0", "no"}:
            return False
    return None


def display_name(user: User) -> str:
    return f"{user.first_name} {user.last_name}".strip() or user.email


def average(values) -> float | None:
    values = list(values)
    return round(sum(values) / len(values), 1) if values else None


def resolve_student(request: Request) -> tuple[User | None, Response | None]:
    """
    The student whose records are requested: students get their own, parents one of
    their linked children (``?student_id=``, defaulting to the first). Returns
    ``(student, None)`` or ``(None, error_response)``.
    """
    user: User = request.user
    raw = request.query_params.get("student_id")

    if user.role == User.Role.STUDENT:
        if raw and raw != str(user.pk):
            return None, Response({"error": "You can only see your own records."}, status=status.HTTP_403_FORBIDDEN)
        return user, None

    if user.role == User.Role.PARENT:
        children = (
            User.objects
            .filter(parent_links__parent=user, role=User.Role.STUDENT)
            .select_related("grade_in")
            .order_by("first_name", "last_name", "id")
        )
        if not raw:
            child = children.first()
            if child is None:
                return None, Response({"error": "No linked student."}, status=status.HTTP_404_NOT_FOUND)
            return child, None
        if not raw.isdigit():
            return None, Response({"error": "student_id must be an integer."}, status=status.HTTP_400_BAD_REQUEST)
        child = children.filter(pk=int(raw)).first()
        if child is None:
            return None, Response(
                {"error": "This student isn't linked to your account."},
                status=status.HTTP_403_FORBIDDEN,
            )
        return child, None

    return None, Response(
        {"error": "Only students and parents can access this."},
        status=status.HTTP_403_FORBIDDEN,
    )


def parse_date_range(request: Request, max_days: int) -> tuple[date | None, date | None, Response | None]:
    start = parse_iso_date(request.query_params.get("start"))
    end = parse_iso_date(request.query_params.get("end"))
    if start is None or end is None:
        return None, None, Response(
            {"error": "start and end are required (YYYY-MM-DD)."},
            status=status.HTTP_400_BAD_REQUEST,
        )
    if end < start or (end - start).days > max_days:
        return None, None, Response(
            {"error": f"end must be after start and at most {max_days} days later."},
            status=status.HTTP_400_BAD_REQUEST,
        )
    return start, end, None


def children_grade_ids(parent: User) -> list[int]:
    return list(
        User.objects
        .filter(parent_links__parent=parent, grade_in__isnull=False)
        .values_list("grade_in_id", flat=True)
        .distinct()
    )


def grade_audience_ids(grade_ids) -> set[int]:
    """Students in the given grades plus their linked parents."""
    student_ids = set(
        User.objects.filter(role=User.Role.STUDENT, grade_in_id__in=grade_ids).values_list("id", flat=True)
    )
    parent_ids = set(
        ParentStudent.objects.filter(student_id__in=student_ids).values_list("parent_id", flat=True)
    )
    return student_ids | parent_ids


def visible_announcements(user: User) -> QuerySet[Announcement]:
    """Announcements a user may read: students and parents only see their own grade(s)."""
    qs = Announcement.objects.all()

    if user.role == User.Role.STUDENT:
        return qs.filter(grade_id=user.grade_in_id) if user.grade_in_id else qs.none()

    if user.role == User.Role.PARENT:
        return qs.filter(grade_id__in=children_grade_ids(user))

    return qs


def visible_comments(user: User) -> QuerySet[Comment]:
    return (
        Comment.objects
        .filter(announcement__in=visible_announcements(user))
        .select_related("user", "reply_to__user", "announcement")
    )


def can_moderate(user: User, announcement: Announcement) -> bool:
    """The announcement's author and admins may remove anyone's comment under it."""
    return announcement.created_by_id == user.id or user.role == User.Role.ADMIN or user.is_staff


def comment_reactions(comment_ids) -> dict[int, list[tuple[str, int]]]:
    """(emoji, user id) pairs per comment."""
    grouped: dict[int, list[tuple[str, int]]] = defaultdict(list)
    for comment_id, emoji, user_id in CommentReaction.objects.filter(comment_id__in=comment_ids).values_list(
        "comment_id", "emoji", "user_id"
    ):
        grouped[comment_id].append((emoji, user_id))
    return grouped


def comment_payload(comment: Comment, request: Request, reactions=()) -> dict[str, Any]:
    """A comment as the apps show it. Deleted comments keep their place but lose their text."""
    viewer: User = request.user
    mine = comment.user_id == viewer.id
    reply = comment.reply_to
    photo = comment.user.profilePic

    reacted: dict[str, list[int]] = defaultdict(list)
    for emoji, user_id in reactions:
        reacted[emoji].append(user_id)

    return {
        "id": comment.pk,
        # Kept for app versions that tell their own comments apart by email.
        "user": comment.user.email,
        "author": {
            "id": comment.user_id,
            "name": display_name(comment.user),
            "role": comment.user.role,
            "photo": request.build_absolute_uri(photo.url) if photo else None,
        },
        "comment": "" if comment.is_deleted else comment.content,
        "created_at": comment.created_at,
        "edited_at": comment.edited_at,
        "deleted": comment.is_deleted,
        "reply_to": (
            {
                "id": reply.pk,
                "author": display_name(reply.user),
                "comment": "" if reply.is_deleted else reply.content[:200],
                "deleted": reply.is_deleted,
            }
            if reply
            else None
        ),
        # In a fixed order, so chips don't jump around as counts change.
        "reactions": [
            {"emoji": emoji, "count": len(reacted[emoji]), "mine": viewer.id in reacted[emoji]}
            for emoji in CommentReaction.EMOJIS
            if reacted.get(emoji)
        ],
        "can_edit": mine and not comment.is_deleted,
        "can_delete": not comment.is_deleted and (mine or can_moderate(viewer, comment.announcement)),
    }


def single_comment_payload(comment: Comment, request: Request) -> dict[str, Any]:
    return comment_payload(comment, request, comment_reactions([comment.pk])[comment.pk])


def exercise_payload(
    exercise: DailyExercise,
    *,
    completed: bool | None = None,
    completion: dict[str, int] | None = None,
) -> dict[str, Any]:
    """``completed`` is set for students and parents; ``completion`` (done/total) for teachers."""
    category = exercise.grade.category
    return {
        "id": exercise.pk,
        "date": str(exercise.date),
        "due_date": str(exercise.due_date) if exercise.due_date else None,
        "title": exercise.title,
        "description": exercise.description,
        "grade": {
            "id": exercise.grade_id,
            "name": exercise.grade.name,
            "category_name": category.name if category else None,
        },
        "subject": (
            {"id": exercise.subject_id, "name": exercise.subject.name}
            if exercise.subject
            else None
        ),
        "teacher": {
            "id": exercise.teacher_id,
            "name": exercise.teacher.get_full_name() if exercise.teacher else None,
        },
        "created_at": exercise.created_at.isoformat() if exercise.created_at else None,
        "completed": completed,
        "completion": completion,
    }


def exercise_completion(user: User, exercises: list[DailyExercise]) -> tuple[dict[int, bool], dict[int, dict[str, int]]]:
    """
    Per-exercise "done" flags for a student (their own) or parent (all their children in
    that grade are done), and done/total counts for a teacher.
    """
    ids = [exercise.pk for exercise in exercises]
    if not ids:
        return {}, {}

    if user.role == User.Role.STUDENT:
        done_ids = set(
            ExerciseCompletion.objects
            .filter(student=user, exercise_id__in=ids)
            .values_list("exercise_id", flat=True)
        )
        return {pk: pk in done_ids for pk in ids}, {}

    if user.role == User.Role.PARENT:
        children_by_grade: dict[int, set[int]] = defaultdict(set)
        for child_id, grade_id in (
            User.objects
            .filter(parent_links__parent=user, grade_in__isnull=False)
            .values_list("id", "grade_in_id")
        ):
            children_by_grade[grade_id].add(child_id)
        child_ids = set().union(*children_by_grade.values()) if children_by_grade else set()
        done_pairs = set(
            ExerciseCompletion.objects
            .filter(exercise_id__in=ids, student_id__in=child_ids)
            .values_list("exercise_id", "student_id")
        )
        flags = {}
        for exercise in exercises:
            kids = children_by_grade.get(exercise.grade_id, set())
            flags[exercise.pk] = bool(kids) and all((exercise.pk, kid) in done_pairs for kid in kids)
        return flags, {}

    if user.role == User.Role.TEACHER:
        class_sizes = dict(
            User.objects
            .filter(role=User.Role.STUDENT, grade_in_id__in={e.grade_id for e in exercises})
            .order_by()
            .values("grade_in_id")
            .annotate(n=Count("id"))
            .values_list("grade_in_id", "n")
        )
        done_counts = dict(
            ExerciseCompletion.objects
            .filter(exercise_id__in=ids)
            .order_by()
            .values("exercise_id")
            .annotate(n=Count("id"))
            .values_list("exercise_id", "n")
        )
        return {}, {
            e.pk: {"done": done_counts.get(e.pk, 0), "total": class_sizes.get(e.grade_id, 0)}
            for e in exercises
        }

    return {}, {}


def exercise_payloads(user: User, exercises) -> list[dict[str, Any]]:
    exercises = list(exercises)
    flags, counts = exercise_completion(user, exercises)
    return [
        exercise_payload(e, completed=flags.get(e.pk), completion=counts.get(e.pk))
        for e in exercises
    ]


def homework_streak(student: User, today: date | None = None) -> int:
    """
    Days in a row on which the student ticked off homework. Today and weekends only
    count when something was done, so neither breaks a streak.
    """
    today = today or timezone.localdate()
    since = today - timedelta(days=366)
    done_days = {
        timezone.localdate(moment)
        for moment in ExerciseCompletion.objects
        .filter(student=student, completed_at__date__gte=since)
        .values_list("completed_at", flat=True)
    }

    streak = 0
    day = today
    while day >= since:
        if day in done_days:
            streak += 1
        elif day != today and day.isoweekday() < 6:
            break
        day -= timedelta(days=1)
    return streak


def pending_homework_count(student: User) -> int:
    """Exercises still open for the student: due today or later (or set today without a due date)."""
    if not student.grade_in_id:
        return 0
    today = timezone.localdate()
    return (
        DailyExercise.objects
        .filter(grade_id=student.grade_in_id)
        .filter(Q(due_date__gte=today) | Q(due_date__isnull=True, date=today))
        .exclude(completions__student=student)
        .count()
    )


def mark_payload(mark: Mark) -> dict[str, Any]:
    return {
        "id": mark.pk,
        "value": mark.value,
        "date": str(mark.date),
        "comment": mark.comment,
        "subject_id": mark.subject_id,
        "teacher": display_name(mark.teacher) if mark.teacher else None,
    }


# ---------------------------------------------------------------------------
# Auth
# ---------------------------------------------------------------------------

def _otp_key(email: str) -> str:
    return f"otp:{email}"


def _otp_attempts_key(email: str) -> str:
    return f"otp-attempts:{email}"


def _otp_cooldown_key(email: str) -> str:
    return f"otp-cooldown:{email}"


class RequestOtpView(APIView):
    permission_classes = [AllowAny]
    # A stale Authorization header must not block login.
    authentication_classes = []

    def post(self, request: Request) -> Response:
        serializer = RequestOtpSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        email = serializer.validated_data["email"].lower()

        user = User.objects.filter(email__iexact=email, is_active=True).first()
        if user is None:
            return Response(
                {"error": "Email couldn't be found in the school system."},
                status=status.HTTP_404_NOT_FOUND,
            )

        if not user.chat_id:
            return Response(
                {"error": "You are not integrated with a school bot."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not cache.add(_otp_cooldown_key(email), True, timeout=settings.OTP_RESEND_COOLDOWN_SECONDS):
            return Response(
                {"error": "Please wait a moment before requesting another code."},
                status=status.HTTP_429_TOO_MANY_REQUESTS,
            )

        otp = f"{secrets.randbelow(1_000_000):06d}"

        # In the bot's language for this person, else the one the app is in.
        if not send_login_code(user.chat_id, otp, user.telegram_language or request.LANGUAGE_CODE):
            cache.delete(_otp_cooldown_key(email))
            return Response(
                {"error": "Couldn't deliver the code via Telegram. Please try again."},
                status=status.HTTP_502_BAD_GATEWAY,
            )

        cache.set(_otp_key(email), otp, timeout=settings.OTP_TTL_SECONDS)
        cache.delete(_otp_attempts_key(email))

        return Response({"message": "OTP sent via Telegram"}, status=status.HTTP_200_OK)


class VerifyOtpView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request: Request) -> Response:
        serializer = VerifyOtpSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        email = serializer.validated_data["email"].lower()
        otp = serializer.validated_data["otp"]

        cached_otp = cache.get(_otp_key(email))
        if cached_otp is None:
            return Response(
                {"error": "OTP expired or not requested"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Bound guesses per issued code so it can't be brute-forced within its lifetime.
        attempts_key = _otp_attempts_key(email)
        cache.add(attempts_key, 0, timeout=settings.OTP_TTL_SECONDS)
        attempts = cache.incr(attempts_key)
        if attempts > settings.OTP_MAX_ATTEMPTS:
            cache.delete_many([_otp_key(email), attempts_key])
            return Response(
                {"error": "Too many attempts. Please request a new code."},
                status=status.HTTP_429_TOO_MANY_REQUESTS,
            )

        if not constant_time_compare(otp, cached_otp):
            return Response({"error": "Invalid OTP"}, status=status.HTTP_400_BAD_REQUEST)

        user = User.objects.filter(email__iexact=email, is_active=True).first()
        if user is None:
            return Response({"error": "Invalid OTP"}, status=status.HTTP_400_BAD_REQUEST)

        cache.delete_many([_otp_key(email), attempts_key])
        update_last_login(None, user)

        refresh = RefreshToken.for_user(user)
        return Response(
            {"access": str(refresh.access_token), "refresh": str(refresh)},
            status=status.HTTP_200_OK,
        )


class LogoutView(APIView):
    def post(self, request: Request) -> Response:
        refresh_token = request.data.get("refresh")

        if not refresh_token:
            return Response({"error": "Refresh token is required"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            RefreshToken(refresh_token).blacklist()
        except TokenError:
            return Response({"error": "Invalid or expired refresh token"}, status=status.HTTP_400_BAD_REQUEST)

        return Response({"message": "Logout successful"}, status=status.HTTP_200_OK)


class PushDeviceRegisterView(APIView):
    """Called by the mobile app after login and whenever its push token or language changes."""

    def post(self, request: Request) -> Response:
        serializer = PushDeviceSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        # A token belongs to one phone; if someone else logs in on it, it moves to them.
        PushDevice.objects.update_or_create(
            token=data["token"],
            defaults={
                "user": request.user,
                "platform": data.get("platform", ""),
                "language": data.get("language", "ka"),
            },
        )
        return Response({"ok": True}, status=status.HTTP_200_OK)


class PushDeviceUnregisterView(APIView):
    """Called by the mobile app on logout so the phone stops receiving this user's notifications."""

    def post(self, request: Request) -> Response:
        token = request.data.get("token")
        if not token:
            return Response({"error": "token is required"}, status=status.HTTP_400_BAD_REQUEST)

        PushDevice.objects.filter(token=token, user=request.user).delete()
        return Response({"ok": True}, status=status.HTTP_200_OK)


# ---------------------------------------------------------------------------
# Profile
# ---------------------------------------------------------------------------

class UserMeView(APIView):
    def get(self, request: Request) -> Response:
        return Response(UserSerializer(request.user).data)


class UpdateProfileView(APIView):
    parser_classes = [MultiPartParser, FormParser]

    def patch(self, request: Request) -> Response:
        user: User = request.user
        serializer = UpdateProfileSerializer(user, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        # Same shape as /user/me/ so the client can replace its cached profile.
        return Response(UserSerializer(user).data, status=status.HTTP_200_OK)


# ---------------------------------------------------------------------------
# Exams
# ---------------------------------------------------------------------------

def _exam_questions(exam: Exam) -> list[Question]:
    return list(exam.questions.prefetch_related("options").order_by("id"))


def _question_payload(
    session: UserExamSession,
    questions: list[Question],
    index: int,
    exam_language: str,
) -> dict[str, Any]:
    exam = session.exam
    return {
        "subject": exam.subject.name,
        "title": exam.title,
        "exam_id": exam.pk,
        "session_id": session.pk,
        "current_index": index,
        "current_question": QuestionSerializer(questions[index]).data,
        "len_questions": len(questions),
        "ends_at": session.ends_at,
        "exam_language": exam_language,
    }


def _result_payload(session: UserExamSession, total_questions: int) -> dict[str, Any]:
    subject_points = (
        UserSubjectPoints.objects
        .filter(user_id=session.user_id, subject_id=session.exam.subject_id)
        .values_list("points", flat=True)
        .first()
    )
    global_points = User.objects.filter(pk=session.user_id).values_list("points", flat=True).first()

    max_score = Question.objects.filter(exam_id=session.exam_id).aggregate(total=Sum("points"))["total"]

    return {
        "message": "Time is up." if session.expired else "Exam completed successfully!",
        "session_id": session.pk,
        "final_score": session.score_so_far,
        "max_score": max_score or 0,
        "total_questions": total_questions,
        "subject_points": subject_points or 0,
        "global_points": global_points or 0,
        "ends_at": session.ends_at,
        "timed_out": session.expired,
    }


class AvailableExamsView(APIView):
    def get(self, request: Request) -> Response:
        user: User = request.user
        locale = request.LANGUAGE_CODE

        blocked_exam_ids = (
            UserExamSession.objects
            .filter(user=user)
            .filter(Q(finished=True) | Q(expired=True) | Q(ends_at__lte=timezone.now()))
            .values("exam_id")
        )

        available_exams = (
            Exam.objects
            .filter(grade_id=user.grade_in_id)
            .exclude(pk__in=blocked_exam_ids)
            .select_related("subject")
            .annotate(questions_count=Count("questions"))
            # An exam without questions can't be started, so don't offer it.
            .filter(questions_count__gt=0)
            .order_by("id")
        )

        response_data = []
        for exam in available_exams:
            exam_language = exam.subject.get_exam_language(locale)
            response_data.append(
                {
                    "id": exam.pk,
                    "title": get_localized_json_value(exam.title, exam_language),
                    "subject_id": exam.subject_id,
                    "subject": get_localized_json_value(exam.subject.name, locale),
                    "duration": exam.duration,
                    "questions_count": exam.questions_count,
                    "exam_language": exam_language,
                }
            )

        return Response(response_data, status=status.HTTP_200_OK)


class StartOrResumeOrFinishExamSessionView(APIView):
    def post(self, request: Request, exam_id: int) -> Response:
        exam = get_object_or_404(Exam.objects.select_related("subject", "grade"), pk=exam_id)

        user: User = request.user
        locale = request.LANGUAGE_CODE
        exam_language = exam.subject.get_exam_language(locale)

        if exam.grade_id != user.grade_in_id:
            return Response(
                {"error": "This exam is not for your grade."},
                status=status.HTTP_403_FORBIDDEN,
            )

        questions = _exam_questions(exam)

        with transaction.atomic():
            # Serialize this user's start requests so a double click can't create two sessions.
            User.objects.select_for_update().filter(pk=user.pk).first()

            session = (
                UserExamSession.objects
                .select_for_update()
                .filter(user=user, exam=exam)
                .order_by("pk")
                .first()
            )

            if session and session.finished:
                return Response(
                    {"error": "You already completed this exam."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            if not questions:
                return Response(
                    {"error": "Exam has no questions."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            if session is None:
                session = UserExamSession.objects.create(
                    user=user,
                    exam=exam,
                    current_question_index=0,
                    score_so_far=0,
                    started=False,
                    finished=False,
                    is_active=True,
                )

            if not session.started or not session.ends_at:
                session.start()

            if session.is_expired:
                session.finish(timed_out=True)
                return Response(_result_payload(session, len(questions)))

            idx = session.current_question_index
            if idx >= len(questions):
                session.finish()
                return Response(_result_payload(session, len(questions)))

        payload = _question_payload(session, questions, idx, exam_language)
        payload.update(
            {
                "score_so_far": session.score_so_far,
                "locale": locale,
            }
        )
        return Response(payload)


class SubmitAnswerView(APIView):
    def post(self, request: Request, session_id: int) -> Response:
        serializer = UserAnswerSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        question_id = serializer.validated_data["question_id"]
        option_id = serializer.validated_data["option_id"]

        with transaction.atomic():
            # The row lock makes double-submits run one after another, so the score
            # and the question index can't be advanced twice for one answer.
            session = get_object_or_404(
                UserExamSession.objects.select_for_update().select_related("exam__subject"),
                pk=session_id,
                user=request.user,
            )

            if session.finished:
                return Response(
                    {"error": "This exam session has already been completed."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            if not session.is_active:
                return Response(
                    {"error": "This exam session is not active."},
                    status=status.HTTP_403_FORBIDDEN,
                )

            questions = _exam_questions(session.exam)

            if session.is_expired:
                session.finish(timed_out=True)
                return Response(_result_payload(session, len(questions)))

            current_index = session.current_question_index
            if current_index >= len(questions):
                session.finish()
                return Response(_result_payload(session, len(questions)))

            current_question = questions[current_index]

            if question_id != current_question.pk:
                return Response(
                    {
                        "error": "This question is no longer the current one.",
                        "current_question_id": current_question.pk,
                    },
                    status=status.HTTP_409_CONFLICT,
                )

            answer_option = next(
                (o for o in current_question.options.all() if o.pk == option_id),
                None,
            )
            if answer_option is None:
                return Response(
                    {"error": "This option does not belong to the current question."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            existing = UserAnswer.objects.filter(session=session, question=current_question).first()
            previously_correct = bool(existing and existing.is_correct)

            UserAnswer.objects.update_or_create(
                session=session,
                question=current_question,
                defaults={"answer_option": answer_option, "is_correct": answer_option.is_correct},
            )

            if answer_option.is_correct and not previously_correct:
                session.score_so_far += current_question.points

            next_index = current_index + 1
            session.current_question_index = next_index

            if next_index >= len(questions):
                session.finish()
                return Response(_result_payload(session, len(questions)))

            session.save(update_fields=["current_question_index", "score_so_far"])

        exam_language = session.exam.subject.get_exam_language(request.LANGUAGE_CODE)
        return Response(_question_payload(session, questions, next_index, exam_language))


# ---------------------------------------------------------------------------
# Announcements & comments
# ---------------------------------------------------------------------------

class AnnouncementCreateView(APIView):
    def post(self, request: Request) -> Response:
        user: User = request.user

        if user.role != User.Role.TEACHER:
            return Response(
                {"detail": "Only teachers are allowed to post announcements"},
                status=status.HTTP_403_FORBIDDEN,
            )

        serializer = AnnouncementValidatorSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        new_announcement = serializer.save()

        recipients = grade_audience_ids([new_announcement.grade_id]) - {user.id}
        transaction.on_commit(
            lambda: push.notify_users(
                recipients,
                lambda lang: (
                    f"{push.text('announcement', lang)}: {new_announcement.title}",
                    new_announcement.content[:200],
                ),
                {"type": "announcement", "id": new_announcement.pk},
            )
        )

        announcement = (
            Announcement.objects
            .select_related("grade__category", "subject", "created_by")
            .annotate(comments_count=visible_comment_count())
            .get(pk=new_announcement.pk)
        )

        return Response(AnnouncementSerializer(announcement).data, status=status.HTTP_201_CREATED)


class AnnouncementListView(APIView):
    def get(self, request: Request) -> Response:
        user: User = request.user
        subject_id = request.query_params.get("subject")

        qs = (
            visible_announcements(user)
            .select_related("grade__category", "subject", "created_by")
            .annotate(comments_count=visible_comment_count())
            .order_by("-created_at")
        )

        if subject_id:
            qs = qs.filter(subject__pk=subject_id)

        if user.role == User.Role.STUDENT and user.grade_in_id:
            subjects_qs = Subject.objects.filter(grade_id=user.grade_in_id)
        elif user.role == User.Role.TEACHER:
            subjects_qs = user.subjects_taught.all()
        else:
            subjects_qs = Subject.objects.none()

        subjects_data = [
            {
                "id": s.pk,
                "name": s.name,
                "grade": {
                    "grade_id": s.grade.pk,
                    "grade_name": s.grade.name,
                    "grade_category_id": s.grade.category.pk if s.grade.category else None,
                    "grade_category_name": s.grade.category.name if s.grade.category else None,
                },
            }
            for s in subjects_qs.select_related("grade__category").order_by("id")
        ]

        grades_qs = (
            Grade.objects
            .select_related("category")
            .annotate(num=Cast("name", IntegerField()))
            .order_by("num", "id")
        )

        grades_data = [
            {
                "id": g.pk,
                "name": g.name,
                "category_id": g.category.pk if g.category else None,
                "category_name": g.category.name if g.category else None,
            }
            for g in grades_qs
        ]

        return Response(
            {
                "announcements": AnnouncementSerializer(qs, many=True).data,
                "subjects": subjects_data,
                "grades": grades_data,
                "role": user.role,
                "categories": list(GradeCategory.objects.values("id", "name")),
            },
            status=status.HTTP_200_OK,
        )


class AnnouncementDetailView(APIView):
    def get(self, request: Request, announcement_id: int) -> Response:
        announcement = get_object_or_404(
            visible_announcements(request.user)
            .select_related("grade__category", "subject", "created_by")
            .annotate(comments_count=visible_comment_count()),
            pk=announcement_id,
        )
        return Response(AnnouncementSerializer(announcement).data, status=status.HTTP_200_OK)


class CreateCommentView(APIView):
    def post(self, request: Request) -> Response:
        serializer = CommentsCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        announcement = get_object_or_404(
            visible_announcements(request.user),
            pk=serializer.validated_data["announcement"],
        )

        reply_to = None
        reply_to_id = serializer.validated_data.get("reply_to")
        if reply_to_id is not None:
            reply_to = (
                announcement.comments.select_related("user")
                .filter(pk=reply_to_id, deleted_at__isnull=True)
                .first()
            )
            if reply_to is None:
                return Response(
                    {"detail": "The comment you're replying to isn't available."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        comment = Comment.objects.create(
            content=serializer.validated_data["comment"],
            announcement=announcement,
            user=request.user,
            reply_to=reply_to,
        )

        # The person replied to hears about it as a reply; the announcement's author as a comment
        # (unless they're the one replied to). Nobody is notified about their own message.
        commenter = display_name(request.user)
        data = {"type": "announcement", "id": announcement.pk, "comment": comment.pk}

        def build(key: str):
            return lambda lang: (
                f"{push.text(key, lang)}: {announcement.title}",
                f"{commenter}: {comment.content[:200]}",
            )

        notifications = []
        replied_id = reply_to.user_id if reply_to and reply_to.user_id != request.user.id else None
        if replied_id:
            notifications.append(push.Notification([replied_id], build("reply"), data))
        if announcement.created_by_id not in (request.user.id, replied_id):
            notifications.append(push.Notification([announcement.created_by_id], build("comment"), data))
        if notifications:
            transaction.on_commit(lambda: push.send(notifications))

        return Response(comment_payload(comment, request), status=status.HTTP_201_CREATED)


class ListCommentsView(APIView):
    def get(self, request: Request) -> Response:
        announcement_id = request.query_params.get("announcement")
        if not announcement_id or not announcement_id.isdigit():
            return Response({"detail": "announcement ID is required"}, status=status.HTTP_400_BAD_REQUEST)

        announcement = get_object_or_404(visible_announcements(request.user), pk=int(announcement_id))

        comments = list(announcement.comments.select_related("user", "reply_to__user").order_by("created_at", "id"))
        reactions = comment_reactions([c.pk for c in comments])
        return Response(
            [comment_payload(c, request, reactions.get(c.pk, ())) for c in comments],
            status=status.HTTP_200_OK,
        )


class CommentDetailView(APIView):
    """
    PATCH /comments/<id>/ — edit your own comment.
    DELETE /comments/<id>/ — delete it; the announcement's author and admins can delete any comment.
    Both return the updated comment.
    """

    def get_comment(self, request: Request, comment_id: int) -> Comment:
        return get_object_or_404(visible_comments(request.user), pk=comment_id, deleted_at__isnull=True)

    def patch(self, request: Request, comment_id: int) -> Response:
        comment = self.get_comment(request, comment_id)
        if comment.user_id != request.user.id:
            return Response({"detail": "You can only edit your own comments."}, status=status.HTTP_403_FORBIDDEN)

        serializer = CommentEditSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        text = serializer.validated_data["comment"]
        if text != comment.content:
            comment.content = text
            comment.edited_at = timezone.now()
            comment.save(update_fields=["content", "edited_at"])

        return Response(single_comment_payload(comment, request), status=status.HTTP_200_OK)

    def delete(self, request: Request, comment_id: int) -> Response:
        comment = self.get_comment(request, comment_id)
        if comment.user_id != request.user.id and not can_moderate(request.user, comment.announcement):
            return Response({"detail": "You can't delete this comment."}, status=status.HTTP_403_FORBIDDEN)

        with transaction.atomic():
            comment.content = ""
            comment.deleted_at = timezone.now()
            comment.save(update_fields=["content", "deleted_at"])
            comment.reactions.all().delete()

        return Response(single_comment_payload(comment, request), status=status.HTTP_200_OK)


class CommentReactView(APIView):
    """POST /comments/<id>/react/ {emoji} — react; the same emoji again takes the reaction back."""

    def post(self, request: Request, comment_id: int) -> Response:
        comment = get_object_or_404(visible_comments(request.user), pk=comment_id, deleted_at__isnull=True)

        serializer = CommentReactionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        emoji = serializer.validated_data["emoji"]

        existing = CommentReaction.objects.filter(comment=comment, user=request.user).first()
        if existing and existing.emoji == emoji:
            existing.delete()
        else:
            CommentReaction.objects.update_or_create(comment=comment, user=request.user, defaults={"emoji": emoji})

        return Response(single_comment_payload(comment, request), status=status.HTTP_200_OK)


# ---------------------------------------------------------------------------
# Subjects, leaderboard, search
# ---------------------------------------------------------------------------

class MySubjectsListView(APIView):
    def get(self, request: Request) -> Response:
        user: User = request.user

        if user.role == User.Role.STUDENT and user.grade_in:
            subjects = user.grade_in.subjects.all()
        elif user.role == User.Role.TEACHER:
            subjects = user.subjects_taught.all()
        elif user.role == User.Role.PARENT:
            subjects = Subject.objects.filter(grade_id__in=children_grade_ids(user))
        else:
            return Response([], status=status.HTTP_200_OK)

        subject_list = subjects.values(
            "pk", "name", "grade__pk", "grade__name", "grade__category__pk", "grade__category__name"
        ).order_by("pk")

        return Response(list(subject_list), status=status.HTTP_200_OK)


class LeaderBoardListView(APIView):
    def get(self, request: Request, subject_pk, grade_pk, category_pk) -> Response:
        queryset = (
            UserSubjectPoints.objects
            .filter(
                subject__pk=subject_pk,
                subject__grade__pk=grade_pk,
                subject__grade__category__pk=category_pk,
            )
            .select_related("user", "subject")
            .order_by("-points")
        )
        return Response(LeaderBoardSerializer(queryset, many=True).data)


class SearchAnythingView(APIView):
    RESULT_LIMIT = 20

    @staticmethod
    def json_text_q(field: str, query: str) -> Q:
        return (
            Q(**{f"{field}__en__icontains": query})
            | Q(**{f"{field}__ka__icontains": query})
            | Q(**{f"{field}__ru__icontains": query})
        )

    @staticmethod
    def text_q(query: str, *fields: str) -> Q:
        q = Q()
        for field in fields:
            q |= Q(**{f"{field}__icontains": query})
        return q

    def get(self, request: Request) -> Response:
        serializer = SearchQuerySerializer(data=request.query_params)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        user: User = request.user
        query = serializer.validated_data["q"].strip()
        limit = self.RESULT_LIMIT

        empty = {"subjects": [], "exams": [], "announcements": [], "exercises": []}
        if not query:
            return Response(empty, status=status.HTTP_200_OK)

        exercise_fields = (
            "id", "title", "description", "date", "due_date",
            "grade__id", "grade__name", "grade__category__name",
            "subject__id", "subject__name",
        )

        if user.role in (User.Role.STUDENT, User.Role.PARENT):
            if user.role == User.Role.STUDENT:
                grade_ids = [user.grade_in_id] if user.grade_in_id else []
            else:
                grade_ids = children_grade_ids(user)
            if not grade_ids:
                return Response(empty, status=status.HTTP_200_OK)

            subjects = (
                Subject.objects
                .filter(self.json_text_q("name", query), grade_id__in=grade_ids)
                .values("pk", "name", "grade__pk", "grade__name", "grade__category__name")
                .order_by("pk")[:limit]
            )
            exams = (
                Exam.objects
                .filter(self.json_text_q("title", query), grade_id__in=grade_ids)
                .values(
                    "pk", "title",
                    "grade__pk", "grade__name", "grade__category__name",
                    "subject__pk", "subject__name",
                )
                .order_by("pk")[:limit]
            )
            announcements = (
                Announcement.objects
                .filter(self.text_q(query, "title", "content"), grade_id__in=grade_ids)
                .values(
                    "pk", "title", "content",
                    "grade__pk", "grade__name", "grade__category__name",
                    "subject__pk", "subject__name",
                )
                .order_by("-created_at")[:limit]
            )
            exercises = (
                DailyExercise.objects
                .filter(self.text_q(query, "title", "description"), grade_id__in=grade_ids)
                .values(*exercise_fields)
                .order_by("-created_at")[:limit]
            )
        else:
            taught_subjects = user.subjects_taught.all()
            taught_grade_ids = taught_subjects.values("grade_id")

            subjects = (
                taught_subjects
                .filter(self.json_text_q("name", query))
                .values("pk", "name", "grade__pk", "grade__name", "grade__category__name")
                .order_by("pk")[:limit]
            )
            exams = (
                Exam.objects
                .filter(self.json_text_q("title", query), subject__in=taught_subjects)
                .values(
                    "pk", "title",
                    "subject__pk", "subject__name",
                    "subject__grade__pk", "subject__grade__name", "subject__grade__category__name",
                )
                .order_by("pk")[:limit]
            )
            announcements = (
                Announcement.objects
                .filter(self.text_q(query, "title", "content"), subject__in=taught_subjects)
                .values(
                    "pk", "title", "content",
                    "subject__pk", "subject__name",
                    "subject__grade__pk", "subject__grade__name", "subject__grade__category__name",
                )
                .order_by("-created_at")[:limit]
            )
            exercises = (
                DailyExercise.objects
                .filter(self.text_q(query, "title", "description"), grade_id__in=taught_grade_ids)
                .values(*exercise_fields)
                .order_by("-created_at")[:limit]
            )

        return Response(
            {
                "subjects": list(subjects),
                "exams": list(exams),
                "announcements": list(announcements),
                "exercises": list(exercises),
            },
            status=status.HTTP_200_OK,
        )


# ---------------------------------------------------------------------------
# Schedule & attendance
# ---------------------------------------------------------------------------

class GradeWeekdayScheduleView(APIView):
    def get(self, request: Request) -> Response:
        user: User = request.user

        if user.role not in (User.Role.STUDENT, User.Role.PARENT):
            return Response(
                {"error": "Schedule is available only for students and parents."},
                status=status.HTTP_403_FORBIDDEN,
            )

        try:
            weekday = int(request.query_params.get("weekday"))
        except (TypeError, ValueError):
            return Response(
                {"error": "weekday is required and must be an integer 1..7"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if not 1 <= weekday <= 7:
            return Response({"error": "weekday must be 1..7"}, status=status.HTTP_400_BAD_REQUEST)

        if user.role == User.Role.STUDENT:
            if not user.grade_in_id:
                return Response({"error": "Student has no grade_in"}, status=status.HTTP_400_BAD_REQUEST)
            grade = user.grade_in
        else:
            allowed_grade_ids = children_grade_ids(user)
            if not allowed_grade_ids:
                return Response(
                    {"error": "No linked student with a grade."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            requested = request.query_params.get("grade_id")
            if requested:
                if not requested.isdigit() or int(requested) not in allowed_grade_ids:
                    return Response(
                        {"error": "You don't have access to this grade schedule"},
                        status=status.HTTP_403_FORBIDDEN,
                    )
                grade_id = int(requested)
            else:
                grade_id = allowed_grade_ids[0]

            grade = get_object_or_404(Grade, pk=grade_id)

        lessons_qs = (
            WeeklyLesson.objects
            .filter(grade=grade, weekday=weekday)
            .select_related("subject", "teacher", "grade")
            .order_by("start_time")
        )

        lessons = [
            {
                "id": x.pk,
                "weekday": x.weekday,
                "start_time": x.start_time.strftime("%H:%M"),
                "end_time": x.end_time.strftime("%H:%M"),
                "room": x.room,
                "grade": {"id": x.grade_id, "name": x.grade.name},
                "subject": {"id": x.subject_id, "name": x.subject.name},
                "teacher": {
                    "id": x.teacher_id,
                    "name": x.teacher.get_full_name() if x.teacher else None,
                },
            }
            for x in lessons_qs
        ]

        students_qs = (
            User.objects
            .filter(role=User.Role.STUDENT, grade_in=grade)
            .only("id", "first_name", "last_name", "email", "profilePic")
            .order_by("first_name", "last_name")
        )

        students = [
            {
                "id": s.id,
                "first_name": s.first_name,
                "last_name": s.last_name,
                "email": s.email,
                "profilePic": s.profilePic.url if s.profilePic else None,
            }
            for s in students_qs
        ]

        return Response(
            {
                "grade": {"id": grade.id, "name": grade.name},
                "weekday": weekday,
                "lessons": lessons,
                "students": students,
            },
            status=status.HTTP_200_OK,
        )


class TeacherTodayLessonsAttendanceView(APIView):
    def get(self, request: Request) -> Response:
        user: User = request.user
        if user.role not in [User.Role.TEACHER, User.Role.ADMIN]:
            return Response(
                {"error": "Only teachers and admins can access this."},
                status=status.HTTP_403_FORBIDDEN,
            )

        today = timezone.localdate()
        weekday = today.isoweekday()

        lessons = list(
            WeeklyLesson.objects
            .filter(teacher=user, weekday=weekday)
            .select_related("grade__category", "subject")
            .order_by("start_time")
        )

        lesson_ids = [lesson.id for lesson in lessons]
        grade_ids = {lesson.grade_id for lesson in lessons}

        students_by_grade: dict[int, list[User]] = {}
        students = (
            User.objects
            .filter(role=User.Role.STUDENT, grade_in_id__in=grade_ids)
            .only("id", "first_name", "last_name", "email", "grade_in_id")
        )
        for s in students:
            students_by_grade.setdefault(s.grade_in_id, []).append(s)

        att_map = {
            (a["lesson_id"], a["student_id"]): a["is_present"]
            for a in LessonAttendance.objects
            .filter(lesson_id__in=lesson_ids, date=today)
            .values("lesson_id", "student_id", "is_present")
        }

        payload_lessons = [
            {
                "lesson_id": lesson.id,
                "subject_id": lesson.subject_id,
                "subject_name": lesson.subject.name,
                "grade_name": lesson.grade.name,
                "grade_category_name": lesson.grade.category.name if lesson.grade.category else None,
                "room": lesson.room,
                "time": {
                    "start": lesson.start_time.strftime("%H:%M"),
                    "end": lesson.end_time.strftime("%H:%M"),
                },
                "students": [
                    {
                        "id": s.id,
                        "name": f"{s.first_name} {s.last_name}".strip() or s.email,
                        "is_present": att_map.get((lesson.id, s.id), True),
                    }
                    for s in students_by_grade.get(lesson.grade_id, [])
                ],
            }
            for lesson in lessons
        ]

        return Response(
            {"date": str(today), "weekday": weekday, "lessons": payload_lessons},
            status=status.HTTP_200_OK,
        )


class TeacherMarkAttendanceView(APIView):
    @transaction.atomic
    def post(self, request: Request) -> Response:
        user: User = request.user
        if user.role not in [User.Role.TEACHER, User.Role.ADMIN]:
            return Response(
                {"error": "Only teachers and admins can mark attendance."},
                status=status.HTTP_403_FORBIDDEN,
            )

        lesson_id = request.data.get("lesson_id")
        attendance = request.data.get("attendance", [])

        if not lesson_id or not request.data.get("date"):
            return Response({"error": "lesson_id and date are required."}, status=status.HTTP_400_BAD_REQUEST)

        if not isinstance(attendance, list):
            return Response({"error": "attendance must be a list."}, status=status.HTTP_400_BAD_REQUEST)

        day = parse_iso_date(request.data.get("date"))
        if day is None:
            return Response({"error": "date must be YYYY-MM-DD."}, status=status.HTTP_400_BAD_REQUEST)

        if day != timezone.localdate():
            return Response({"error": "You can only mark attendance for today."}, status=status.HTTP_400_BAD_REQUEST)

        lesson = (
            WeeklyLesson.objects
            .select_related("grade", "subject")
            .filter(pk=lesson_id, teacher=user)
            .first()
        )
        if not lesson:
            return Response({"error": "Lesson not found or not yours."}, status=status.HTTP_404_NOT_FOUND)

        allowed_student_ids = set(
            User.objects
            .filter(role=User.Role.STUDENT, grade_in=lesson.grade)
            .values_list("id", flat=True)
        )

        marked: dict[int, bool] = {}

        for row in attendance:
            if not isinstance(row, dict):
                continue

            is_present = parse_bool(row.get("is_present"))
            try:
                sid = int(row.get("student_id"))
            except (TypeError, ValueError):
                continue

            if is_present is None or sid not in allowed_student_ids:
                continue

            LessonAttendance.objects.update_or_create(
                lesson_id=lesson.id,
                date=day,
                student_id=sid,
                defaults={"is_present": is_present, "marked_by": user},
            )
            marked[sid] = is_present

        # Parents hear about it in the app and, if they connected it, in Telegram.
        def notify_parents():
            if not marked:
                return

            lesson_time = f"{lesson.start_time.strftime('%H:%M')}–{lesson.end_time.strftime('%H:%M')}"
            notifications = []
            for link in ParentStudent.objects.filter(student_id__in=marked.keys()).select_related("student"):
                student = link.student
                student_name = f"{student.first_name} {student.last_name}".strip() or student.email
                is_present = marked[student.id]
                notifications.append(
                    push.Notification(
                        [link.parent_id],
                        lambda lang, name=student_name, present=is_present: (
                            f"{name} · {get_localized_json_value(lesson.subject.name, lang)}",
                            f"{push.text('present' if present else 'absent', lang)} ({lesson_time})",
                        ),
                        {"type": "attendance", "student_id": student.id, "date": str(day), "present": is_present},
                    )
                )
            push.send(notifications)

        transaction.on_commit(notify_parents)

        present_count = sum(1 for is_present in marked.values() if is_present)
        return Response(
            {
                "ok": True,
                "absent_count": len(marked) - present_count,
                "present_count": present_count,
            },
            status=status.HTTP_200_OK,
        )


# ---------------------------------------------------------------------------
# Daily exercises
# ---------------------------------------------------------------------------

class DailyExercisesView(APIView):
    """
    GET /exercises/daily/?date=YYYY-MM-DD

    Students get their grade's exercises for the day; teachers get the ones they
    assigned that day plus the subjects they can assign exercises for.
    """

    def get(self, request: Request) -> Response:
        user: User = request.user

        date_str = request.query_params.get("date")
        day = parse_iso_date(date_str) if date_str else timezone.localdate()
        if day is None:
            return Response({"error": "date must be YYYY-MM-DD"}, status=status.HTTP_400_BAD_REQUEST)

        exercises = DailyExercise.objects.select_related("grade__category", "subject", "teacher")
        payload: dict[str, Any] = {"date": str(day), "role": user.role}

        if user.role == User.Role.STUDENT:
            if not user.grade_in_id:
                return Response(
                    {"error": "Only students with a grade can access."},
                    status=status.HTTP_403_FORBIDDEN,
                )
            exercises = exercises.filter(grade_id=user.grade_in_id, date=day)
            payload["grade"] = {"id": user.grade_in_id, "name": user.grade_in.name}

        elif user.role == User.Role.TEACHER:
            exercises = exercises.filter(teacher=user, date=day)
            payload["subjects"] = [
                {
                    "id": s.pk,
                    "name": s.name,
                    "grade": {
                        "id": s.grade_id,
                        "name": s.grade.name,
                        "category_name": s.grade.category.name if s.grade.category else None,
                    },
                }
                for s in user.subjects_taught.select_related("grade__category").order_by("id")
            ]

        elif user.role == User.Role.PARENT:
            exercises = exercises.filter(grade_id__in=children_grade_ids(user), date=day)

        else:
            return Response(
                {"error": "Only students, parents and teachers can access daily exercises."},
                status=status.HTTP_403_FORBIDDEN,
            )

        payload["items"] = exercise_payloads(user, exercises.order_by("created_at"))
        return Response(payload, status=status.HTTP_200_OK)


class TeacherDailyExerciseCreateView(APIView):
    def post(self, request: Request) -> Response:
        user: User = request.user
        if user.role != User.Role.TEACHER:
            return Response({"error": "Only teachers can create exercises."}, status=status.HTTP_403_FORBIDDEN)

        grade_id = request.data.get("grade_id")
        subject_id = request.data.get("subject_id")
        title = (request.data.get("title") or "").strip()
        description = (request.data.get("description") or "").strip()
        date_str = request.data.get("date")
        due_str = request.data.get("due_date")

        if not grade_id or not title:
            return Response({"error": "grade_id and title are required."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            grade_id = int(grade_id)
        except (TypeError, ValueError):
            return Response({"error": "grade_id must be integer."}, status=status.HTTP_400_BAD_REQUEST)

        day = parse_iso_date(date_str) if date_str else timezone.localdate()
        if day is None:
            return Response({"error": "date must be YYYY-MM-DD"}, status=status.HTTP_400_BAD_REQUEST)

        due_day = None
        if due_str:
            due_day = parse_iso_date(due_str)
            if due_day is None:
                return Response({"error": "due_date must be YYYY-MM-DD"}, status=status.HTTP_400_BAD_REQUEST)

        grade = Grade.objects.select_related("category").filter(pk=grade_id).first()
        if not grade:
            return Response({"error": "Grade not found."}, status=status.HTTP_404_NOT_FOUND)

        subject = None
        if subject_id:
            try:
                subject_id = int(subject_id)
            except (TypeError, ValueError):
                return Response({"error": "subject_id must be integer."}, status=status.HTTP_400_BAD_REQUEST)

            subject = Subject.objects.filter(pk=subject_id).first()
            if not subject:
                return Response({"error": "Subject not found."}, status=status.HTTP_404_NOT_FOUND)

            if subject.grade_id != grade.id:
                return Response(
                    {"error": "Subject must belong to the selected grade."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            if not user.subjects_taught.filter(pk=subject.id).exists():
                return Response(
                    {"error": "You can't assign exercises for a subject you don't teach."},
                    status=status.HTTP_403_FORBIDDEN,
                )
        elif not user.subjects_taught.filter(grade=grade).exists():
            return Response(
                {"error": "You can't assign exercises to a grade you don't teach."},
                status=status.HTTP_403_FORBIDDEN,
            )

        try:
            exercise = DailyExercise.objects.create(
                grade=grade,
                subject=subject,
                teacher=user,
                date=day,
                due_date=due_day,
                title=title,
                description=description or None,
            )
        except DjangoValidationError as exc:
            return Response({"error": exc.messages}, status=status.HTTP_400_BAD_REQUEST)

        recipients = grade_audience_ids([grade.id])
        transaction.on_commit(
            lambda: push.notify_users(
                recipients,
                lambda lang: (
                    push.text("exercise", lang)
                    + (f" · {get_localized_json_value(subject.name, lang)}" if subject else ""),
                    exercise.title,
                ),
                {"type": "exercise", "id": exercise.pk, "date": str(exercise.date)},
            )
        )

        return Response(exercise_payload(exercise), status=status.HTTP_201_CREATED)


class TeacherDailyExercisesListView(APIView):
    """
    Teacher sees what they assigned (filters optional)
    GET /exercises/daily/teacher/?date=YYYY-MM-DD&grade_id=8
    """

    def get(self, request: Request) -> Response:
        user: User = request.user
        if user.role != User.Role.TEACHER:
            return Response({"error": "Only teachers."}, status=status.HTTP_403_FORBIDDEN)

        date_str = request.query_params.get("date")
        grade_id = request.query_params.get("grade_id")

        qs = DailyExercise.objects.filter(teacher=user).select_related("grade__category", "subject", "teacher")

        if date_str:
            day = parse_iso_date(date_str)
            if day is None:
                return Response({"error": "date must be YYYY-MM-DD"}, status=status.HTTP_400_BAD_REQUEST)
            qs = qs.filter(date=day)

        if grade_id:
            try:
                qs = qs.filter(grade_id=int(grade_id))
            except (TypeError, ValueError):
                return Response({"error": "grade_id must be integer."}, status=status.HTTP_400_BAD_REQUEST)

        items = exercise_payloads(user, qs.order_by("-date", "-created_at"))
        return Response({"items": items}, status=status.HTTP_200_OK)


# ---------------------------------------------------------------------------
# Exam history, review and the teacher's exam builder
# ---------------------------------------------------------------------------

def _exam_totals(exam_ids) -> dict[int, dict[str, int]]:
    """Question count and maximum score per exam."""
    return {
        row["exam_id"]: {"questions": row["questions"], "max_score": row["max_score"] or 0}
        for row in (
            Question.objects
            .filter(exam_id__in=exam_ids)
            .order_by()
            .values("exam_id")
            .annotate(questions=Count("id"), max_score=Sum("points"))
        )
    }


class ExamHistoryView(APIView):
    """GET /exams/history/?student_id= — finished exams with scores (own, or a parent's child)."""

    def get(self, request: Request) -> Response:
        student, error = resolve_student(request)
        if error:
            return error

        locale = request.LANGUAGE_CODE
        sessions = list(
            UserExamSession.objects
            .filter(user=student, finished=True)
            .select_related("exam__subject")
            .annotate(correct=Count("answers", filter=Q(answers__is_correct=True)))
            .order_by("-submitted_at", "-pk")
        )
        totals = _exam_totals({s.exam_id for s in sessions})

        items = []
        for session in sessions:
            exam = session.exam
            total = totals.get(exam.pk, {"questions": 0, "max_score": 0})
            items.append(
                {
                    "session_id": session.pk,
                    "exam_id": exam.pk,
                    "title": exam.get_title(exam.subject.get_exam_language(locale)),
                    "subject_id": exam.subject_id,
                    "subject": exam.subject.name,
                    "score": session.score_so_far,
                    "max_score": total["max_score"],
                    "correct": session.correct,
                    "total_questions": total["questions"],
                    "submitted_at": session.submitted_at,
                    "timed_out": session.expired,
                }
            )
        return Response({"student_id": student.pk, "items": items}, status=status.HTTP_200_OK)


class SessionReviewView(APIView):
    """GET /sessions/<id>/review/ — every question of a finished exam with the chosen and correct answers."""

    def get(self, request: Request, session_id: int) -> Response:
        user: User = request.user
        session = get_object_or_404(
            UserExamSession.objects.select_related("exam__subject"),
            pk=session_id,
        )

        is_owner = session.user_id == user.pk
        is_parent = (
            user.role == User.Role.PARENT
            and ParentStudent.objects.filter(parent=user, student_id=session.user_id).exists()
        )
        if not (is_owner or is_parent):
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)

        if not session.finished:
            return Response(
                {"error": "Finish the exam to see the answers."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        exam = session.exam
        lang = exam.subject.get_exam_language(request.LANGUAGE_CODE)
        answers = {a.question_id: a for a in session.answers.all()}
        questions = _exam_questions(exam)

        items = []
        for question in questions:
            answer = answers.get(question.pk)
            items.append(
                {
                    "id": question.pk,
                    "text": question.get_text(lang),
                    "points": question.points,
                    "chosen_option_id": answer.answer_option_id if answer else None,
                    "is_correct": bool(answer and answer.is_correct),
                    "options": [
                        {"id": o.pk, "title": o.get_title(lang), "is_correct": o.is_correct}
                        for o in question.options.all()
                    ],
                }
            )

        return Response(
            {
                "session_id": session.pk,
                "exam_id": exam.pk,
                "title": exam.get_title(lang),
                "subject_id": exam.subject_id,
                "subject": exam.subject.name,
                "score": session.score_so_far,
                "max_score": sum(q.points for q in questions),
                "timed_out": session.expired,
                "submitted_at": session.submitted_at,
                "questions": items,
            },
            status=status.HTTP_200_OK,
        )


class TeacherExamsView(APIView):
    """
    GET  /teacher/exams/ — exams in the subjects a teacher teaches, with results so far.
    POST /teacher/exams/ — create an exam (single language) and notify the class.
    """

    def get(self, request: Request) -> Response:
        user: User = request.user
        if user.role != User.Role.TEACHER:
            return Response({"error": "Only teachers."}, status=status.HTTP_403_FORBIDDEN)

        exams = list(
            Exam.objects
            .filter(subject__in=user.subjects_taught.all())
            .select_related("subject", "grade__category")
            .order_by("-created_at", "-id")
        )
        exam_ids = [e.pk for e in exams]
        totals = _exam_totals(exam_ids)
        results = {
            row["exam_id"]: row
            for row in (
                UserExamSession.objects
                .filter(exam_id__in=exam_ids, finished=True)
                .order_by()
                .values("exam_id")
                .annotate(submissions=Count("id"), average=Avg("score_so_far"))
            )
        }

        items = []
        for exam in exams:
            total = totals.get(exam.pk, {"questions": 0, "max_score": 0})
            result = results.get(exam.pk, {})
            category = exam.grade.category
            items.append(
                {
                    "id": exam.pk,
                    "title": exam.title,
                    "subject_id": exam.subject_id,
                    "subject": exam.subject.name,
                    "grade": {
                        "id": exam.grade_id,
                        "name": exam.grade.name,
                        "category_name": category.name if category else None,
                    },
                    "duration": exam.duration,
                    "scheduled_for": str(exam.scheduled_for) if exam.scheduled_for else None,
                    "questions_count": total["questions"],
                    "max_score": total["max_score"],
                    "submissions": result.get("submissions", 0),
                    "average_score": round(result["average"], 1) if result.get("average") is not None else None,
                    "created_at": exam.created_at,
                }
            )
        return Response({"items": items}, status=status.HTTP_200_OK)

    def post(self, request: Request) -> Response:
        user: User = request.user
        if user.role != User.Role.TEACHER:
            return Response({"error": "Only teachers can create exams."}, status=status.HTTP_403_FORBIDDEN)

        serializer = TeacherExamCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        subject = user.subjects_taught.select_related("grade").filter(pk=data["subject_id"]).first()
        if subject is None:
            return Response(
                {"subject_id": ["You can only create exams for subjects you teach."]},
                status=status.HTTP_403_FORBIDDEN,
            )

        # Written in one language; get_localized_json_value falls back to it for the others.
        language = (request.LANGUAGE_CODE or "ka").split("-")[0]

        def text(value: str) -> dict[str, str]:
            return {language: value.strip()}

        with transaction.atomic():
            exam = Exam.objects.create(
                title=text(data["title"]),
                subject=subject,
                grade=subject.grade,
                duration=data["duration"],
                scheduled_for=data.get("scheduled_for"),
                created_by=user,
            )
            for question_data in data["questions"]:
                question = Question.objects.create(
                    exam=exam,
                    text=text(question_data["text"]),
                    points=question_data["points"],
                )
                Option.objects.bulk_create(
                    Option(question=question, title=text(o["title"]), is_correct=o["is_correct"])
                    for o in question_data["options"]
                )

            student_ids = set(
                User.objects
                .filter(role=User.Role.STUDENT, grade_in_id=subject.grade_id)
                .values_list("id", flat=True)
            )
            exam_title = data["title"].strip()
            transaction.on_commit(
                lambda: push.notify_users(
                    student_ids,
                    lambda lang: (
                        f"{push.text('exam', lang)} · {get_localized_json_value(subject.name, lang)}",
                        exam_title,
                    ),
                    {"type": "exam", "id": exam.pk},
                )
            )

        return Response(
            {"id": exam.pk, "questions_count": len(data["questions"])},
            status=status.HTTP_201_CREATED,
        )


# ---------------------------------------------------------------------------
# Homework completion
# ---------------------------------------------------------------------------

class ExerciseCompleteView(APIView):
    """POST /exercises/<id>/complete/ {"done": true|false} — a student ticks an exercise off."""

    def post(self, request: Request, exercise_id: int) -> Response:
        user: User = request.user
        if user.role != User.Role.STUDENT:
            return Response({"error": "Only students can complete exercises."}, status=status.HTTP_403_FORBIDDEN)

        exercise = get_object_or_404(DailyExercise, pk=exercise_id, grade_id=user.grade_in_id)

        done = parse_bool(request.data.get("done", True))
        if done is None:
            return Response({"error": "done must be true or false."}, status=status.HTTP_400_BAD_REQUEST)

        if done:
            ExerciseCompletion.objects.get_or_create(exercise=exercise, student=user)
        else:
            ExerciseCompletion.objects.filter(exercise=exercise, student=user).delete()

        return Response(
            {"id": exercise.pk, "completed": done, "streak": homework_streak(user)},
            status=status.HTTP_200_OK,
        )


# ---------------------------------------------------------------------------
# Gradebook
# ---------------------------------------------------------------------------

class StudentMarksView(APIView):
    """GET /marks/?student_id= — marks per subject with averages (own, or a parent's child)."""

    def get(self, request: Request) -> Response:
        student, error = resolve_student(request)
        if error:
            return error

        marks = list(
            Mark.objects
            .filter(student=student)
            .select_related("teacher")
            .order_by("-date", "-created_at")
        )
        by_subject: dict[int, list[Mark]] = defaultdict(list)
        for mark in marks:
            by_subject[mark.subject_id].append(mark)

        # The grade's subjects, plus any older subject the student still has marks in.
        subjects = {
            s.pk: s
            for s in Subject.objects.filter(Q(grade_id=student.grade_in_id) | Q(pk__in=by_subject.keys())).order_by("id")
        }

        return Response(
            {
                "student": {"id": student.pk, "name": display_name(student)},
                "average": average(m.value for m in marks),
                "max_mark": MAX_MARK,
                "subjects": [
                    {
                        "subject_id": subject.pk,
                        "subject": subject.name,
                        "average": average(m.value for m in by_subject[subject.pk]),
                        "marks": [mark_payload(m) for m in by_subject[subject.pk]],
                    }
                    for subject in subjects.values()
                ],
            },
            status=status.HTTP_200_OK,
        )


class TeacherMarksView(APIView):
    """
    GET  /teacher/marks/?subject_id= — the class list for a taught subject with each student's marks.
    POST /teacher/marks/ — give a mark; the student and their parents are notified.
    """

    @staticmethod
    def taught_subject(user: User, subject_id) -> Subject | None:
        try:
            subject_id = int(subject_id)
        except (TypeError, ValueError):
            return None
        return user.subjects_taught.select_related("grade__category").filter(pk=subject_id).first()

    def get(self, request: Request) -> Response:
        user: User = request.user
        if user.role != User.Role.TEACHER:
            return Response({"error": "Only teachers."}, status=status.HTTP_403_FORBIDDEN)

        subject = self.taught_subject(user, request.query_params.get("subject_id"))
        if subject is None:
            return Response({"error": "Subject not found or not yours."}, status=status.HTTP_404_NOT_FOUND)

        students = list(
            User.objects
            .filter(role=User.Role.STUDENT, grade_in_id=subject.grade_id)
            .order_by("first_name", "last_name", "email")
        )
        marks_by_student: dict[int, list[Mark]] = defaultdict(list)
        for mark in (
            Mark.objects
            .filter(subject=subject, student__in=students)
            .select_related("teacher")
            .order_by("-date", "-created_at")
        ):
            marks_by_student[mark.student_id].append(mark)

        category = subject.grade.category
        return Response(
            {
                "subject": {"id": subject.pk, "name": subject.name},
                "grade": {
                    "id": subject.grade_id,
                    "name": subject.grade.name,
                    "category_name": category.name if category else None,
                },
                "max_mark": MAX_MARK,
                "students": [
                    {
                        "id": student.pk,
                        "name": display_name(student),
                        "profilePic": student.profilePic.url if student.profilePic else None,
                        "average": average(m.value for m in marks_by_student[student.pk]),
                        "marks": [mark_payload(m) for m in marks_by_student[student.pk]],
                    }
                    for student in students
                ],
            },
            status=status.HTTP_200_OK,
        )

    def post(self, request: Request) -> Response:
        user: User = request.user
        if user.role != User.Role.TEACHER:
            return Response({"error": "Only teachers can give marks."}, status=status.HTTP_403_FORBIDDEN)

        serializer = MarkCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        subject = self.taught_subject(user, data["subject_id"])
        if subject is None:
            return Response(
                {"error": "You can only give marks in subjects you teach."},
                status=status.HTTP_403_FORBIDDEN,
            )

        student = User.objects.filter(
            pk=data["student_id"], role=User.Role.STUDENT, grade_in_id=subject.grade_id
        ).first()
        if student is None:
            return Response(
                {"error": "This student isn't in the subject's class."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        mark = Mark.objects.create(
            student=student,
            subject=subject,
            teacher=user,
            value=data["value"],
            date=data.get("date") or timezone.localdate(),
            comment=data.get("comment", "").strip(),
        )

        recipients = {student.pk} | set(
            ParentStudent.objects.filter(student=student).values_list("parent_id", flat=True)
        )
        body = f"{mark.value}/{MAX_MARK}" + (f" · {mark.comment}" if mark.comment else "")
        transaction.on_commit(
            lambda: push.notify_users(
                recipients,
                lambda lang: (
                    f"{push.text('mark', lang)} · {get_localized_json_value(subject.name, lang)}",
                    body,
                ),
                {"type": "mark", "subject_id": subject.pk, "student_id": student.pk},
            )
        )

        return Response({**mark_payload(mark), "student_id": student.pk}, status=status.HTTP_201_CREATED)


class TeacherMarkDeleteView(APIView):
    """DELETE /teacher/marks/<id>/ — a teacher removes a mark they gave (e.g. a typo)."""

    def delete(self, request: Request, mark_id: int) -> Response:
        deleted, _ = Mark.objects.filter(pk=mark_id, teacher=request.user).delete()
        if not deleted:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)
        return Response(status=status.HTTP_204_NO_CONTENT)


# ---------------------------------------------------------------------------
# Attendance history & calendar
# ---------------------------------------------------------------------------

class AttendanceHistoryView(APIView):
    """GET /attendance/history/?month=YYYY-MM&student_id= — a month of attendance (own, or a parent's child)."""

    def get(self, request: Request) -> Response:
        student, error = resolve_student(request)
        if error:
            return error

        raw_month = request.query_params.get("month")
        if raw_month:
            first = parse_iso_date(f"{raw_month}-01")
            if first is None:
                return Response({"error": "month must be YYYY-MM."}, status=status.HTTP_400_BAD_REQUEST)
        else:
            first = timezone.localdate().replace(day=1)
        next_first = (first.replace(day=28) + timedelta(days=4)).replace(day=1)

        records = list(
            LessonAttendance.objects
            .filter(student=student, date__gte=first, date__lt=next_first)
            .select_related("lesson__subject")
            .order_by("date", "lesson__start_time")
        )
        present = sum(1 for r in records if r.is_present)

        return Response(
            {
                "student_id": student.pk,
                "month": first.strftime("%Y-%m"),
                "summary": {
                    "present": present,
                    "absent": len(records) - present,
                    "rate": round(100 * present / len(records)) if records else None,
                },
                "records": [
                    {
                        "date": str(r.date),
                        "lesson_id": r.lesson_id,
                        "subject_id": r.lesson.subject_id,
                        "subject": r.lesson.subject.name,
                        "start_time": r.lesson.start_time.strftime("%H:%M"),
                        "end_time": r.lesson.end_time.strftime("%H:%M"),
                        "is_present": r.is_present,
                    }
                    for r in records
                ],
            },
            status=status.HTTP_200_OK,
        )


class CalendarView(APIView):
    """
    GET /calendar/?start=YYYY-MM-DD&end=YYYY-MM-DD[&student_id=]

    The weekly timetable plus homework due dates and scheduled exams in the range.
    Students and parents see their (child's) class; teachers see what they teach.
    """

    MAX_DAYS = 62

    def get(self, request: Request) -> Response:
        start, end, error = parse_date_range(request, self.MAX_DAYS)
        if error:
            return error

        user: User = request.user
        completed: set[int] | None = None

        if user.role == User.Role.TEACHER:
            lessons = WeeklyLesson.objects.filter(teacher=user)
            homework = DailyExercise.objects.filter(teacher=user)
            exams = Exam.objects.filter(subject__in=user.subjects_taught.all())
        else:
            student, error = resolve_student(request)
            if error:
                return error
            grade_id = student.grade_in_id
            lessons = WeeklyLesson.objects.filter(grade_id=grade_id)
            homework = DailyExercise.objects.filter(grade_id=grade_id)
            exams = Exam.objects.filter(grade_id=grade_id)

        homework = list(
            homework
            .filter(due_date__gte=start, due_date__lte=end)
            .select_related("subject")
            .order_by("due_date", "created_at")
        )
        if user.role != User.Role.TEACHER:
            completed = set(
                ExerciseCompletion.objects
                .filter(student=student, exercise__in=homework)
                .values_list("exercise_id", flat=True)
            )

        return Response(
            {
                "start": str(start),
                "end": str(end),
                "lessons": [
                    {
                        "id": lesson.pk,
                        "weekday": lesson.weekday,
                        "start_time": lesson.start_time.strftime("%H:%M"),
                        "end_time": lesson.end_time.strftime("%H:%M"),
                        "room": lesson.room,
                        "subject_id": lesson.subject_id,
                        "subject": lesson.subject.name,
                        "grade": lesson.grade.name,
                    }
                    for lesson in lessons.select_related("subject", "grade").order_by("weekday", "start_time")
                ],
                "homework": [
                    {
                        "id": e.pk,
                        "title": e.title,
                        "date": str(e.date),
                        "due_date": str(e.due_date),
                        "subject_id": e.subject_id,
                        "subject": e.subject.name if e.subject else None,
                        "completed": (e.pk in completed) if completed is not None else None,
                    }
                    for e in homework
                ],
                "exams": [
                    {
                        "id": exam.pk,
                        "title": exam.title,
                        "subject_id": exam.subject_id,
                        "subject": exam.subject.name,
                        "scheduled_for": str(exam.scheduled_for),
                        "duration": exam.duration,
                    }
                    for exam in exams
                    .filter(scheduled_for__gte=start, scheduled_for__lte=end)
                    .select_related("subject")
                    .order_by("scheduled_for", "id")
                ],
            },
            status=status.HTTP_200_OK,
        )


# ---------------------------------------------------------------------------
# Dashboard
# ---------------------------------------------------------------------------

def _children_overview(parent: User) -> list[dict[str, Any]]:
    """A parent's linked students with their points and today's attendance."""
    today = timezone.localdate()
    children = list(
        User.objects
        .filter(parent_links__parent=parent)
        .select_related("grade_in__category")
        .order_by("first_name", "last_name")
    )

    attendance_by_child: dict[int, list[dict[str, Any]]] = {}
    attendance = (
        LessonAttendance.objects
        .filter(student_id__in=[c.id for c in children], date=today)
        .select_related("lesson__subject")
        .order_by("lesson__start_time")
    )
    for record in attendance:
        attendance_by_child.setdefault(record.student_id, []).append(
            {
                "lesson_id": record.lesson_id,
                "subject_id": record.lesson.subject_id,
                "subject": record.lesson.subject.name,
                "start_time": record.lesson.start_time.strftime("%H:%M"),
                "end_time": record.lesson.end_time.strftime("%H:%M"),
                "is_present": record.is_present,
            }
        )

    child_ids = [c.id for c in children]
    marks_by_child: dict[int, list[int]] = defaultdict(list)
    for student_id, value in Mark.objects.filter(student_id__in=child_ids).values_list("student_id", "value"):
        marks_by_child[student_id].append(value)

    attendance_counts: dict[int, dict[bool, int]] = defaultdict(dict)
    for row in (
        LessonAttendance.objects
        .filter(student_id__in=child_ids, date__gt=today - timedelta(days=30), date__lte=today)
        .order_by()
        .values("student_id", "is_present")
        .annotate(n=Count("id"))
    ):
        attendance_counts[row["student_id"]][row["is_present"]] = row["n"]

    def attendance_rate(child_id: int) -> int | None:
        counts = attendance_counts.get(child_id, {})
        total = counts.get(True, 0) + counts.get(False, 0)
        return round(100 * counts.get(True, 0) / total) if total else None

    overview = []
    for child in children:
        grade = child.grade_in
        overview.append(
            {
                "id": child.id,
                "first_name": child.first_name,
                "last_name": child.last_name,
                "email": child.email,
                "profilePic": child.profilePic.url if child.profilePic else None,
                "points": child.points or 0,
                "grade": (
                    {
                        "id": grade.id,
                        "name": grade.name,
                        "category_name": grade.category.name if grade.category else None,
                    }
                    if grade
                    else None
                ),
                "attendance_today": attendance_by_child.get(child.id, []),
                "average_mark": average(marks_by_child.get(child.id, [])),
                "attendance_rate": attendance_rate(child.id),
                "pending_homework": pending_homework_count(child),
            }
        )
    return overview


class HomeDashboardView(APIView):
    def get(self, request: Request) -> Response:
        user = (
            User.objects
            .select_related("grade_in__category")
            .prefetch_related("subjects_taught")
            .get(pk=request.user.pk)
        )

        serializer_context = {"request": request, "locale": request.LANGUAGE_CODE}

        data: dict[str, Any] = {
            "me": MeSerializer(user, context=serializer_context).data,
        }

        announcements = (
            Announcement.objects
            .select_related("grade__category", "subject", "created_by")
            .annotate(comments_count=visible_comment_count())
            .order_by("-created_at")
        )

        if user.role == User.Role.STUDENT:
            if not user.grade_in_id:
                return Response(
                    {"error": "Student has no grade assigned."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            subjects = Subject.objects.filter(grade_id=user.grade_in_id)
            subject_points = UserSubjectPoints.objects.filter(user=user).select_related("subject")
            sessions = (
                UserExamSession.objects
                .filter(user=user)
                .select_related("exam__subject", "exam__grade")
                .order_by("-started_at")[:30]
            )

            data.update({
                "subjects": SubjectSerializer(subjects, many=True).data,
                "subjectPoints": UserSubjectPointsSerializer(subject_points, many=True).data,
                "announcements": AnnouncementSerializer(
                    announcements.filter(grade_id=user.grade_in_id)[:20], many=True
                ).data,
                "sessions": SessionMiniSerializer(sessions, many=True).data,
                "streak": homework_streak(user),
                "pending_homework": pending_homework_count(user),
                "average_mark": average(Mark.objects.filter(student=user).values_list("value", flat=True)),
            })

        elif user.role == User.Role.TEACHER:
            taught = user.subjects_taught.all()

            exam_count_map: dict[int, dict[str, Any]] = {}
            for exam in Exam.objects.filter(subject__in=taught).select_related("subject"):
                entry = exam_count_map.setdefault(
                    exam.subject_id,
                    {
                        "subject_id": exam.subject_id,
                        "subject": SubjectSerializer(exam.subject).data,
                        "count": 0,
                    },
                )
                entry["count"] += 1

            data.update({
                # With the class, since a teacher often has the same subject in several grades.
                "subjectsTaught": [
                    {
                        **SubjectSerializer(subject).data,
                        "grade": {
                            "id": subject.grade_id,
                            "name": subject.grade.name,
                            "category_name": subject.grade.category.name if subject.grade.category else None,
                        },
                    }
                    for subject in taught.select_related("grade__category").order_by("grade__name", "id")
                ],
                "myAnnouncements": AnnouncementSerializer(
                    announcements.filter(created_by=user)[:20], many=True
                ).data,
                "examCounts": list(exam_count_map.values()),
            })

        elif user.role == User.Role.ADMIN:
            data.update({
                "stats": {
                    "users": User.objects.count(),
                    "grades": Grade.objects.count(),
                    "subjects": Subject.objects.count(),
                    "exams": Exam.objects.count(),
                    "questions": Question.objects.count(),
                },
                "latestAnnouncements": AnnouncementSerializer(announcements[:20], many=True).data,
            })

        elif user.role == User.Role.PARENT:
            data["children"] = _children_overview(user)

        else:
            data["info"] = "Role not supported yet."

        return Response(data, status=status.HTTP_200_OK)


# ---------------------------------------------------------------------------
# AI support
# ---------------------------------------------------------------------------

class AISupportView(APIView):
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "ai_support"

    def post(self, request: Request) -> Response:
        serializer = AISupportSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        if not settings.DEEPSEEK_API_KEY:
            return Response(
                {"error": "AI support is not configured."},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        history = serializer.validated_data.get("history", [])
        messages = [
            {"role": "system", "content": AI_SYSTEM_PROMPT},
            *({"role": turn["role"], "content": turn["content"]} for turn in history),
            {"role": "user", "content": serializer.validated_data["message"]},
        ]

        try:
            response = requests.post(
                "https://api.deepseek.com/chat/completions",
                headers={"Authorization": f"Bearer {settings.DEEPSEEK_API_KEY}"},
                json={"model": settings.DEEPSEEK_MODEL, "messages": messages, "temperature": 0.5},
                timeout=30,
            )
        except requests.Timeout:
            return Response({"error": "deepseek_timeout"}, status=status.HTTP_504_GATEWAY_TIMEOUT)
        except requests.RequestException as exc:
            logger.error("DeepSeek request failed: %s", type(exc).__name__)
            return Response({"error": "deepseek_failed"}, status=status.HTTP_502_BAD_GATEWAY)

        if not response.ok:
            logger.warning("DeepSeek returned %s: %s", response.status_code, response.text[:500])
            return Response({"error": "deepseek_failed"}, status=status.HTTP_502_BAD_GATEWAY)

        try:
            reply = response.json()["choices"][0]["message"]["content"].strip()
        except (ValueError, KeyError, IndexError, TypeError, AttributeError):
            logger.warning("Unexpected DeepSeek response: %s", response.text[:500])
            return Response({"error": "deepseek_failed"}, status=status.HTTP_502_BAD_GATEWAY)

        return Response({"reply": reply or "..."}, status=status.HTTP_200_OK)


# ---------------------------------------------------------------------------
# Books
# ---------------------------------------------------------------------------

class GetSubjectBookView(APIView):
    def get(self, request: Request) -> Response:
        grade_id = request.query_params.get("grade_id")
        subject_id = request.query_params.get("subject_id")

        if not grade_id or not subject_id:
            return Response({"error": "grade_id and subject_id are required."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            grade_id = int(grade_id)
            subject_id = int(subject_id)
        except (TypeError, ValueError):
            return Response(
                {"error": "grade_id and subject_id must be integers."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        book = (
            SubjectBook.objects
            .select_related("subject__grade")
            .filter(subject_id=subject_id, subject__grade_id=grade_id)
            .order_by("-uploaded_at")
            .first()
        )
        if book is None:
            return Response({"detail": "No book found for this subject."}, status=status.HTTP_404_NOT_FOUND)

        return Response(
            {
                "id": book.pk,
                "grade": {"id": book.subject.grade_id, "name": book.subject.grade.name},
                "subject": {"id": book.subject_id, "name": book.subject.name},
                "pdf_url": book.pdf_file.url if book.pdf_file else None,
                "uploaded_at": book.uploaded_at.isoformat() if book.uploaded_at else None,
            },
            status=status.HTTP_200_OK,
        )
