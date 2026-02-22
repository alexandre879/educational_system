from datetime import date
from openai import OpenAI
import os
from dotenv import load_dotenv
import random
from tokenize import TokenError
import requests
from rest_framework.response import Response
from rest_framework.request import Request
from django.core.cache import cache
from rest_framework.views import APIView
from rest_framework import status
from telegram import Bot
from django.db import transaction

from api.telegram import tg_send
from .models import (
    Announcement,
    DailyExercise,
    Grade,
    GradeCategory,
    LessonAttendance,
    ParentStudent,
    Subject,
    User,
    Comment,
    UserSubjectPoints,
    Question,
    WeeklyLesson,
)
from django.db.models import Count, IntegerField, Value, Q
from django.db.models.functions import Coalesce
from api.serializers import VerifyOtpSerializer
from rest_framework_simplejwt.tokens import RefreshToken
from asgiref.sync import async_to_sync
from rest_framework.permissions import IsAuthenticated, AllowAny
from django.shortcuts import get_object_or_404
from .models import Exam, UserExamSession, Option, UserAnswer
from .serializers import (
    AISupportSerializer,
    CommentsCreateSerializer,
    LeaderBoardSerializer,
    MeSerializer,
    QuestionSerializer,
    SearchQuerySerializer,
    SessionMiniSerializer,
    SubjectSerializer, 
    UserAnswerSerializer, 
    UserSerializer, 
    RequestOtpSerializer, 
    PointListViewPerSubjectSerializer,
    AnnouncementSerializer,
    AnnouncementValidatorSerializer,
    UpdateProfileSerializer,
    UserSubjectPointsSerializer,
    
)
from rest_framework.parsers import MultiPartParser, FormParser
from django.db.models import Sum, IntegerField, Count
from django.db.models.functions import Cast
from django.utils import timezone
from openai import OpenAI
from rest_framework.permissions import IsAdminUser
from pathlib import Path




BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR / ".env", override=True)



BOT_TOKEN = os.getenv("BOT_TOKEN")
OTP_TIMEOUT = os.getenv("OTP_TIMEOUT")
OTP_RATE_LIMIT = os.getenv("OTP_RATE_LIMIT")



client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))


SYSTEM_PROMPT = (
    "You are a helpful support assistant for an educational platform. "
    "Be concise, friendly, and practical. "
    "If you need more info, ask 1 short question."
)




class RequestOtpView(APIView):
    
    permission_classes = [AllowAny]
    
    def post(self, request: Request) -> Response:
        
        
        serializer = RequestOtpSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        email = serializer.validated_data['email'].lower()
        
        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            return Response({"error": "Email couldn't be found in the school system."}, status=status.HTTP_404_NOT_FOUND)

        if not user.chat_id:
            return Response({"error": "Your are not integrated with a school bot."}, status=status.HTTP_400_BAD_REQUEST)


        otp = f"{random.randint(1000, 9999)}"
        cache.set(f"otp_{email}", otp, timeout=300)

        print(otp)
        bot = Bot(token=BOT_TOKEN)
        
        async_to_sync(bot.send_message)(chat_id=user.chat_id, text=f"{otp}")
        

        return Response({"message": "OTP sent via Telegram"}, status=status.HTTP_200_OK)







class VerifyOtpView(APIView):
    def post(self, request: Request) -> Response:
        serializer = VerifyOtpSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        email = serializer.validated_data["email"].lower()
        otp = serializer.validated_data["otp"]
        

        user = User.objects.get(email__iexact=email)

        cached_otp = cache.get(f"otp_{email}")
        if cached_otp is None:
            return Response({"error": "OTP expired or not requested"}, status=status.HTTP_400_BAD_REQUEST)

        if otp != cached_otp:
            return Response({"error": "Invalid OTP"}, status=status.HTTP_400_BAD_REQUEST)

        cache.delete(f"otp_{email}")
        cache.delete(f"otp_time_{email}")
        
        refresh = RefreshToken.for_user(user) 

        return Response(
            {"access": str(refresh.access_token), "refresh": str(refresh)},
            status=status.HTTP_200_OK
        )
        
        
        
        
        

class RefreshTokenView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request: Request) -> Response:
        refresh_token = request.data.get("refresh")
        if not refresh_token:
            return Response({"error": "Refresh token required"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            refresh = RefreshToken(refresh_token)
            new_access = str(refresh.access_token)
            return Response({"access": new_access}, status=status.HTTP_200_OK)
        except TokenError:
            return Response({"error": "Invalid or expired refresh token"}, status=status.HTTP_401_UNAUTHORIZED)        






class LogoutView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request: Request) -> Response:
        refresh_token = request.data.get("refresh")

        if not refresh_token:
            return Response({"error": "Refresh token is required"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            token = RefreshToken(refresh_token)
            token.blacklist()  
        except TokenError:
            return Response({"error": "Invalid or expired refresh token"}, status=status.HTTP_400_BAD_REQUEST)

        return Response({"message": "Logout successful"}, status=status.HTTP_200_OK)




        

class UserMeView(APIView):
    permission_classes = [IsAuthenticated]
    
    def get(self, request: Request):
        user = request.user
        
        serializer = UserSerializer(user)
        
        return Response(serializer.data)
    
    
    
    
    

class UpdateProfileView(APIView):
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def patch(self, request: Request) -> Response:
        user: User = request.user
        serializer = UpdateProfileSerializer(
            user,
            data=request.data,
            partial=True,
            context={"request": request}
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data, status=status.HTTP_200_OK)
    
    
    
    
    
    
    
class AvailableExamsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request: Request) -> Response:

        user: User = request.user
        

        blocked_exam_ids = (
            UserExamSession.objects.filter(
                user=request.user
            ).filter(Q(finished=True) | Q(expired=True) | Q(ends_at__lte=timezone.now())
            ).values_list("exam_id", flat=True)
        )
        
        
        print(blocked_exam_ids)
        

        available_exams = (
            Exam.objects.filter(grade=user.grade_in)
            .exclude(pk__in=blocked_exam_ids)
            .prefetch_related("questions")
        )

        response_data = [
            {
                "id": exam.pk,
                "title": exam.title,
                "subject": exam.subject.name,
                "duration": exam.duration,
                "questions_count": exam.questions.count(),
            }
            for exam in available_exams
        ]

        return Response(response_data, status=status.HTTP_200_OK)
        
        
        


class StartOrResumeOrFinishExamSessionView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request: Request, exam_id: int):
        
        exam = get_object_or_404(Exam, pk=exam_id)
        user: User = request.user
        
        if exam.grade != user.grade_in:
            return Response({"error": "This exam is not for your grade."}, status=status.HTTP_403_FORBIDDEN)

        session, created = UserExamSession.objects.get_or_create(
            user=request.user,
            exam=exam,
            defaults={
                "current_question_index": 0,
                "score_so_far": 0,
                "started": False,
                "finished": False,
                "is_active": True,
            }
        )

        if session.finished: return Response( {"error": "You already completed this exam."}, status=status.HTTP_400_BAD_REQUEST)

        if not session.started or not session.ends_at: session.start()

        if session.is_expired:
            session.terminate()
            return Response(
                {"error": "Time is up. Session terminated."},
                status=status.HTTP_403_FORBIDDEN
            )

        questions = list(exam.questions.prefetch_related("options").order_by("id"))

        if not questions:
            return Response(
                {"error": "Exam has no questions."},
                status=status.HTTP_400_BAD_REQUEST
            )

        idx = session.current_question_index
        if idx >= len(questions):
            session.finished = True
            session.is_active = False
            session.submitted_at = session.submitted_at or timezone.now()
            session.save(update_fields=["finished", "is_active", "submitted_at"])
            return Response(
                {"error": "Session question index out of range (session ended)."},
                status=status.HTTP_400_BAD_REQUEST
            )

        current_question = questions[idx]

        return Response({
            "subject": exam.subject.name,
            "exam_id": exam.pk,
            "session_id": session.pk,
            "current_index": idx,
            "current_question": QuestionSerializer(current_question).data,
            "len_questions": len(questions),
            "score_so_far": session.score_so_far,
            "ends_at": session.ends_at,
        })





class SubmitAnswerView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request: Request, session_id: int) -> Response:
        session = get_object_or_404(
            UserExamSession,
            pk=session_id,
            user=request.user
        )

        if not session.is_active:
            return Response(
                {"error": "This exam session is not active."},
                status=status.HTTP_403_FORBIDDEN
            )

        if session.is_expired:
            session.terminate()
            return Response(
                {"error": "Time is up. This exam session has been terminated."},
                status=status.HTTP_403_FORBIDDEN
            )

        if session.finished:
            return Response(
                {"error": "This exam session has already been completed."},
                status=status.HTTP_400_BAD_REQUEST
            )

        questions = list(session.exam.questions.prefetch_related("options").order_by("id"))
        current_index = session.current_question_index

        if current_index >= len(questions):
            return Response(
                {"error": "Invalid question index."},
                status=status.HTTP_400_BAD_REQUEST
            )

        current_question: Question = questions[current_index]

        serializer = UserAnswerSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        answer_option_id = serializer.validated_data["option_id"]

        answer_option = get_object_or_404(
            Option,
            pk=answer_option_id,
            question=current_question
        )

        is_correct = answer_option.is_correct

        existing = UserAnswer.objects.filter(
            session=session,
            question=current_question
        ).only("is_correct").first()

        previously_correct = bool(existing and existing.is_correct)

        UserAnswer.objects.update_or_create(
            session=session,
            question=current_question,
            defaults={"answer_option": answer_option, "is_correct": is_correct},
        )

        if is_correct and not previously_correct:
            session.score_so_far += current_question.points

        next_index = current_index + 1
        finished_now = next_index >= len(questions)

        if not finished_now:
            session.current_question_index = next_index
            session.save(update_fields=["current_question_index", "score_so_far"])

            next_question = questions[next_index]

            return Response({
                "subject": session.exam.subject.name,
                "exam_id": session.exam.pk,
                "session_id": session.pk,
                "current_index": next_index,
                "current_question": QuestionSerializer(next_question).data,
                "len_questions": len(questions),
                "ends_at": session.ends_at, 
            })

        session.finished = True
        session.is_active = False
        session.submitted_at = session.submitted_at or timezone.now()
        session.save(update_fields=["finished", "is_active", "submitted_at", "score_so_far"])

        request.user.points = (request.user.points or 0) + session.score_so_far
        request.user.save(update_fields=["points"])

        usp, _ = UserSubjectPoints.objects.get_or_create(
            user=request.user,
            subject=session.exam.subject,
            defaults={"points": 0},
        )
        usp.points += session.score_so_far
        usp.save(update_fields=["points"])

        return Response({
            "message": "Exam completed successfully!",
            "final_score": session.score_so_far,
            "total_questions": len(questions),
            "subject_points": usp.points,
            "global_points": request.user.points,
            "ends_at": session.ends_at
        })






class PointListViewPerSubject(APIView):
    permission_classes = [IsAuthenticated]
    
    def post(self, request: Request) -> Response:
        
        user: User = request.user
        
        subject = request.data.get('subject', None)
        
        if not subject:
            global_points = (User.objects
                .filter(role__iexact='student')
                .values('first_name', 'last_name', 'email', 'points')
            )
            
            return Response(global_points, status=status.HTTP_200_OK)
        
        serializer = PointListViewPerSubjectSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        subject = serializer.validated_data.get('subject')
        
        
        leaderboard = (UserExamSession.objects
            .filter(exam__grade=user.grade_in, exam__subject__name__iexact=subject)
            .values('user__id', 'user__first_name', 'user__email')
            .annotate(total_points=Sum('score_so_far'))
            .order_by('-total_points')
            .values('user__first_name', 'user__last_name', 'user__email', 'total_points')
        )
        return Response(leaderboard, status=status.HTTP_200_OK)
    
    
    
    
    
    
    

class AnnouncementCreateView(APIView):
    permission_classes = [IsAuthenticated]
    
    def post(self, request: Request) -> Response:
        user: User = request.user
        
        if user.role != User.Role.TEACHER:
            return Response({'detail': 'Only teachers are allowed to post announcements'}, status=status.HTTP_403_FORBIDDEN)
        
        serializer = AnnouncementValidatorSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        new_announcement = serializer.save()
        
        announcement_with_related = Announcement.objects.select_related(
            "grade__category", "subject", "created_by"
        ).get(pk=new_announcement.pk)
        
        response_serializer = AnnouncementSerializer(announcement_with_related)
        
        return Response(response_serializer.data, status=status.HTTP_201_CREATED)
    
    
    
    
    
    


class AnnouncementListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request: Request) -> Response:
        user: User = request.user
        subject_id = request.query_params.get("subject", None)
        

        qs = Announcement.objects.all().select_related(
            "grade", "grade__category", "subject", "created_by"
        ).prefetch_related('comments')
        

        if user.grade_in and user.grade_in.category:
            qs = qs.filter(
                grade=user.grade_in,
                grade__category=user.grade_in.category
            )
            
            

        if subject_id:
            qs = qs.filter(subject__pk=subject_id)
            

        announcements_data = AnnouncementSerializer(qs, many=True).data
        

    
        if user.role == User.Role.STUDENT and user.grade_in:
            subjects_qs = (
                Subject.objects.filter(
                    grade=user.grade_in,
                    grade__category__name__iexact=user.grade_in.category.name
                )
                .select_related("grade", "grade__category")
                .order_by("name")
            )
        elif user.role == User.Role.TEACHER and user.subjects_taught:
            subjects_qs = user.subjects_taught.all().select_related("grade", "grade__category").order_by("name")
        else:
            subjects_qs = Subject.objects.none()
            



        subjects_data = [
            {
                "id": s.pk,
                "name": s.name,
                "grade": {
                    "grade_id": s.grade.pk,
                    "grade_name": s.grade.name,
                    "grade_category_id": s.grade.category.pk,
                    "grade_category_name": s.grade.category.name,
                }
            }
            for s in subjects_qs
        ]


        grades_qs = (
            Grade.objects
            .all()
            .select_related("category")
            .annotate(num=Cast("name", IntegerField()))
            .order_by("num")
            .distinct("num")
        )
        
        
        grades_data = [
            {
                "id": g.pk,
                "name": g.name,
                "category_id": g.category.pk,
                "category_name": g.category.name,
            }
            for g in grades_qs
        ]
        
        categories = GradeCategory.objects.all().values('id', 'name')
        

        return Response(
            {
                "announcements": announcements_data,
                "subjects": subjects_data,
                "grades": grades_data,
                "role": user.role,
                'categories': categories,
            },
            status=status.HTTP_200_OK
        )
        
        
        
        
        
        
class CreateCommentView(APIView):
    
    permission_classes = [IsAuthenticated]
    
    def post(self, request: Request) -> Response:

        user: User = request.user
        
        serializer = CommentsCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        comment = serializer.validated_data.get('comment')
        announcement_id = serializer.validated_data.get('announcement')
        
        
        announcement = Announcement.objects.get(pk=announcement_id)
        
        created_comment = Comment.objects.create(content=comment, announcement=announcement, user=user)
        
        return Response({ 
            "comment": created_comment.content, 
            "user": created_comment.user.email, 
            "created_at": created_comment.created_at
            },
            status=status.HTTP_201_CREATED
        )
        
            
        
        
        
        


class ListCommentsView(APIView):
    def get(self, request: Request) -> Response:
        announcement_id = request.query_params.get("announcement")
        if not announcement_id:
            return Response({"detail": "announcement ID is required"}, status=400)
        
        comments = Comment.objects.filter(announcement_id=announcement_id).select_related("user")
        data = [{"user": c.user.email, "comment": c.content, "created_at": c.created_at} for c in comments]

        return Response(data, status=200)
    








class MySubjectsListView(APIView):
    permission_classes = [AllowAny]

    def get(self, request: Request) -> Response:
        user: User = request.user


        if user.role == User.Role.STUDENT and user.grade_in:
            subject_list = (
                user.grade_in.subjects.all()
                .values('pk', 'name', 'grade__pk', 'grade__name', 'grade__category__pk', 'grade__category__name')
                .order_by('pk')
            )
        elif user.role == User.Role.TEACHER:
            subject_list = (
                user.subjects_taught.all()
                .values('pk', 'name', 'grade__pk', 'grade__name', 'grade__category__pk', 'grade__category__name')
                .order_by('pk')
            )
        else:
            subject_list = []

        return Response(list(subject_list), status=status.HTTP_200_OK)
    
    
    
    
    
    
    
    
    
class LeaderBoardListView(APIView):
    permission_classes = [AllowAny]

    def get(self, request: Request, subject_pk, grade_pk, category_pk) -> Response:
        queryset = (
            UserSubjectPoints.objects
            .filter(
                subject__pk=subject_pk,
                subject__grade__pk=grade_pk,
                subject__grade__category__pk=category_pk
            )
            .select_related('user', 'subject')
            .order_by('-points')
        )
        serializer = LeaderBoardSerializer(queryset, many=True)
        return Response(serializer.data)
    
    
    
    
    

        
        
        
        


class SearchAnythingView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request: Request) -> Response:
        serializer = SearchQuerySerializer(data=request.query_params)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        user: User = request.user
        query = serializer.validated_data["q"].strip()

        if user.grade_in and user.grade_in.category:
            grade = user.grade_in
            
            subjects = (
                Subject.objects
                .filter(name__istartswith=query, grade=grade)
                .select_related("grade__category")
                .values("pk", "name", "grade__name", "grade__category__name")
                .distinct()
            )

            exams = (
                Exam.objects
                .filter(title__istartswith=query, grade=grade)
                .values("pk", "title", "grade__name", "grade__category__name")
                .distinct()
            )

            announcements = (
                Announcement.objects
                .filter(title__istartswith=query, grade=grade)
                .values("pk", "title", "content", "grade__name", "grade__category__name")
                .distinct()
            )

            return Response(
                {"subjects": list(subjects), "exams": list(exams), "announcements": list(announcements)},
                status=status.HTTP_200_OK
            )


        taught_subjects = user.subjects_taught.select_related("grade__category")
        
        
        print(taught_subjects.values_list("pk", flat=True))

        subjects = (
            Subject.objects
            .filter(name__istartswith=query, pk__in=taught_subjects.values_list("pk", flat=True))
            .select_related("grade__category")
            .values("pk", "name", "grade__name", "grade__category__name")
            .order_by("pk")
            .distinct()
        )

        exams = (
            Exam.objects
            .filter(title__istartswith=query, subject__in=taught_subjects)
            .select_related("subject__grade__category")
            .values(
                "pk", "title",
                "subject__pk", "subject__name",
                "subject__grade__name", "subject__grade__category__name"
            )
            .order_by("pk")
            .distinct()
        )

        announcements = (
            Announcement.objects
            .filter(title__istartswith=query, subject__in=taught_subjects)
            .select_related("subject__grade__category")
            .values(
                "title", "pk", "content",
                "subject__pk", "subject__name",
                "subject__grade__name", "subject__grade__category__name"
            )
            .order_by("pk")
            .distinct()
        )

        return Response(
            {"subjects": list(subjects), "exams": list(exams), "announcements": list(announcements)},
            status=status.HTTP_200_OK
        )
            
            
            
            
            
      
class GradeWeekdayScheduleView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user: User = request.user
        
        if user.role in ["teacher", "admin"]:
            return Response('Api is accessable only for a students', status=status.HTTP_403_FORBIDDEN)

        # query params
        weekday = request.query_params.get("weekday")
        grade_id = request.query_params.get("grade_id")

        # validate weekday
        try:
            weekday_int = int(weekday)
            if weekday_int < 1 or weekday_int > 7:
                return Response({"error": "weekday must be 1..7"}, status=status.HTTP_400_BAD_REQUEST)
        except (TypeError, ValueError):
            return Response({"error": "weekday is required and must be an integer 1..7"}, status=status.HTTP_400_BAD_REQUEST)

        # determine grade
        if user.role == user.Role.STUDENT:
            if not user.grade_in:
                return Response({"error": "Student has no grade_in"}, status=status.HTTP_400_BAD_REQUEST)
            # students can only request their own grade
            grade = user.grade_in
        else:
            if not grade_id:
                return Response({"error": "grade_id is required"}, status=status.HTTP_400_BAD_REQUEST)
            grade = get_object_or_404(Grade, pk=grade_id)

        # OPTIONAL: teachers can only see grades they teach in the schedule
        if user.role == user.Role.TEACHER:
            teaches_this_grade = WeeklyLesson.objects.filter(teacher=user, grade=grade).exists()
            if not teaches_this_grade:
                return Response({"error": "You don't have access to this grade schedule"}, status=status.HTTP_403_FORBIDDEN)

        # lessons for grade + weekday
        lessons_qs = (
            WeeklyLesson.objects
            .filter(grade=grade, weekday=weekday_int)
            .select_related("subject", "teacher", "grade")
            .order_by("start_time")
        )

        lessons = []
        for x in lessons_qs:
            lessons.append({
                "id": x.pk,
                "weekday": x.weekday,
                "start_time": x.start_time.strftime("%H:%M"),
                "end_time": x.end_time.strftime("%H:%M"),
                "room": x.room,
                "grade": {"id": x.grade_id, "name": x.grade.name},
                "subject": {"id": x.subject_id, "name": x.subject.name},
                "teacher": {
                    "id": x.teacher_id,
                    "name": (x.teacher.get_full_name() if x.teacher else None),
                },
            })

        # students of that grade (users list)
        students_qs = (
            User.objects
            .filter(role=User.Role.STUDENT, grade_in=grade)
            .only("id", "first_name", "last_name", "email", "profilePic")
            .order_by("first_name", "last_name")
        )

        students = [{
            "id": s.id,
            "first_name": s.first_name,
            "last_name": s.last_name,
            "email": s.email,
            "profilePic": s.profilePic.url if s.profilePic else None,
        } for s in students_qs]

        return Response({
            "grade": {"id": grade.id, "name": grade.name},
            "weekday": weekday_int,
            "lessons": lessons,
            "students": students,
        }, status=status.HTTP_200_OK)

            
            
            
            
            


class TeacherTodayLessonsAttendanceView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request: Request) -> Response:
        user: User = request.user
        if user.role not in [User.Role.TEACHER, User.Role.ADMIN]:
            return Response({"error": "Only teachers and admins can access this."}, status=403)

        today = timezone.localdate()
        weekday = today.isoweekday()

        lessons = (
            WeeklyLesson.objects
            .filter(teacher=user, weekday=weekday)
            .select_related("grade", "subject")
            .order_by("start_time")
        )

        lesson_ids = [l.id for l in lessons]
        grade_ids = list({l.grade_id for l in lessons})

        students = (
            User.objects
            .filter(role=User.Role.STUDENT, grade_in_id__in=grade_ids)
            .only("id", "first_name", "last_name", "email", "grade_in_id")
        )
    
        students_by_grade = {}
        for s in students:
            students_by_grade.setdefault(s.grade_in_id, []).append(s)

        att = (
            LessonAttendance.objects
            .filter(lesson_id__in=lesson_ids, date=today)
            .values("lesson_id", "student_id", "is_present")
        )
        att_map = {(a["lesson_id"], a["student_id"]): a["is_present"] for a in att}

        payload_lessons = []
        for l in lessons:
            grade_students = students_by_grade.get(l.grade_id, [])
            payload_lessons.append({
                "lesson_id": l.id,
                "subject_name": l.subject.name,
                "grade_name": l.grade.name,
                "grade_category_name": l.grade.category.name if l.grade.category else None,
                "room": l.room,
                "time": {
                    "start": l.start_time.strftime("%H:%M"),
                    "end": l.end_time.strftime("%H:%M"),
                },
                "students": [
                    {
                        "id": s.id,
                        "name": (f"{s.first_name} {s.last_name}".strip() or s.email),
                        "is_present": att_map.get((l.id, s.id), True),
                    }
                    for s in grade_students
                ],
            })

        return Response({
            "date": str(today),
            "weekday": weekday,
            "lessons": payload_lessons
        }, status=status.HTTP_200_OK)
        
        
        




                
                
                
class TeacherMarkAttendanceView(APIView):
    permission_classes = [IsAuthenticated]

    @transaction.atomic
    def post(self, request: Request) -> Response:
        user: User = request.user
        if user.role not in  [User.Role.TEACHER, User.Role.ADMIN]:
            return Response({"error": "Only teachers and admins can mark attendance."}, status=status.HTTP_403_FORBIDDEN)

        lesson_id = request.data.get("lesson_id")
        date_str = request.data.get("date")
        attendance = request.data.get("attendance", [])

        if not lesson_id or not date_str:
            return Response({"error": "lesson_id and date are required."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            day = date.fromisoformat(str(date_str))
        except ValueError:
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

        absent_ids: list[int] = []
        present_ids: list[int] = []

        for row in attendance:
            sid = row.get("student_id")
            is_present = row.get("is_present")

            if sid is None or is_present is None:
                continue

            try:
                sid = int(sid)
            except (TypeError, ValueError):
                continue

            if sid not in allowed_student_ids:
                continue

            present_bool = bool(is_present)

            LessonAttendance.objects.update_or_create(
                lesson_id=lesson.id,
                date=day,
                student_id=sid,
                defaults={
                    "is_present": present_bool,
                    "marked_by": user,
                },
            )

            if present_bool:
                present_ids.append(sid)
            else:
                absent_ids.append(sid)

        def notify_parents():
            all_ids = set(absent_ids + present_ids)
            if not all_ids:
                return

            students = {
                s.id: s
                for s in User.objects.filter(id__in=all_ids).only("id", "first_name", "last_name", "email")
            }

            links = (
                ParentStudent.objects
                .filter(student_id__in=all_ids)
                .select_related("parent", "student")
            )

            for link in links:
                parent = link.parent
                student = students.get(link.student_id)

                if not parent or not parent.chat_id or not student:
                    continue

                student_name = (f"{student.first_name} {student.last_name}".strip() or student.email)

                if student.id in all_ids and student.id in absent_ids:
                    text = (
                        f"🚨 <b>დასწრების შეტყობინება</b>\n\n"
                        f"👤 <b>{student_name}</b>\n"
                        f"📚 {lesson.subject.name}\n"
                        f"🕒 {lesson.start_time.strftime('%H:%M')}–{lesson.end_time.strftime('%H:%M')}\n"
                        f"📅 {day}\n\n"
                        f"<b>სტატუსი:</b> ❌ არ გამოცხადდა"
                    )
                else:
                    text = (
                        f"✅ დასწრების დადასტურება\n\n"
                        f"👤 {student_name}\n"
                        f"📚 {lesson.subject.name}\n"
                        f"🕒 {lesson.start_time.strftime('%H:%M')}–{lesson.end_time.strftime('%H:%M')}\n"
                        f"📅 {day}\n\n"
                        f"სტატუსი: 🎉 გამოცხადდა"
                    )

                tg_send(parent.chat_id, text)

        transaction.on_commit(notify_parents)

        return Response(
            {
                "ok": True,
                "absent_count": len(absent_ids),
                "present_count": len(present_ids),
            },
            status=200
        )
            
            
     
     
     


class StudentDailyExercisesView(APIView):
    
    permission_classes = [IsAuthenticated]

    def get(self, request: Request) -> Response:
        user: User = request.user

        if user.role != User.Role.STUDENT or not user.grade_in:
            return Response({"error": "Only students with a grade can access."}, status=403)

        date_str = request.query_params.get("date")
        if date_str:
            try:
                day = date.fromisoformat(str(date_str))
            except ValueError:
                return Response({"error": "date must be YYYY-MM-DD"}, status=400)
        else:
            day = timezone.localdate()

        qs = (
            DailyExercise.objects
            .filter(grade_id=user.grade_in_id, date=day)
            .select_related("grade", "subject", "teacher")
            .order_by("created_at")
        )

        items = []
        for x in qs:
            items.append({
                "id": x.pk,
                "date": str(x.date),
                "due_date": str(x.due_date) if x.due_date else None,
                "title": x.title,
                "description": x.description,
                "grade": {"id": x.grade_id, "name": x.grade.name},
                "subject": {"id": x.subject_id, "name": x.subject.name} if x.subject else None,
                "teacher": {
                    "id": x.teacher_id,
                    "name": (x.teacher.get_full_name() if x.teacher else None),
                },
                "created_at": x.created_at.isoformat() if x.created_at else None,
            })

        return Response({
            "date": str(day),
            "grade": {"id": user.grade_in_id, "name": user.grade_in.name},
            "items": items
        }, status=200)







class TeacherDailyExerciseCreateView(APIView):
    """
    Teacher creates an exercise for a grade (and optional subject)
    POST /exercises/daily/create/

    Body:
    {
      "grade_id": 8,
      "subject_id": 12,           // optional
      "date": "2026-02-14",       // optional (default today)
      "due_date": "2026-02-16",   // optional
      "title": "Homework #1",
      "description": "Solve 1-10 tasks"
    }
    """
    permission_classes = [IsAuthenticated]

    def post(self, request: Request) -> Response:
        user: User = request.user
        if user.role != User.Role.TEACHER:
            return Response({"error": "Only teachers can create exercises."}, status=403)

        grade_id = request.data.get("grade_id")
        subject_id = request.data.get("subject_id")  # optional
        title = (request.data.get("title") or "").strip()
        description = (request.data.get("description") or "").strip()

        date_str = request.data.get("date")
        due_str = request.data.get("due_date")

        if not grade_id or not title:
            return Response({"error": "grade_id and title are required."}, status=400)

        try:
            grade_id = int(grade_id)
        except (TypeError, ValueError):
            return Response({"error": "grade_id must be integer."}, status=400)

        # day
        if date_str:
            try:
                day = date.fromisoformat(str(date_str))
            except ValueError:
                return Response({"error": "date must be YYYY-MM-DD"}, status=400)
        else:
            day = timezone.localdate()

        # due_date
        due_day = None
        if due_str:
            try:
                due_day = date.fromisoformat(str(due_str))
            except ValueError:
                return Response({"error": "due_date must be YYYY-MM-DD"}, status=400)

        grade = Grade.objects.filter(pk=grade_id).first()
        if not grade:
            return Response({"error": "Grade not found."}, status=404)

        subject = None
        if subject_id:
            try:
                subject_id = int(subject_id)
            except (TypeError, ValueError):
                return Response({"error": "subject_id must be integer."}, status=400)

            subject = Subject.objects.filter(pk=subject_id).select_related("grade").first()
            if not subject:
                return Response({"error": "Subject not found."}, status=404)

            # IMPORTANT: subject must belong to grade
            if subject.grade_id != grade.id:
                return Response({"error": "Subject must belong to the selected grade."}, status=400)

            # OPTIONAL safety: teacher must teach that subject
            if not user.subjects_taught.filter(pk=subject.id).exists():
                return Response({"error": "You can't assign exercises for a subject you don't teach."}, status=403)

        ex = DailyExercise.objects.create(
            grade=grade,
            subject=subject,
            teacher=user,
            date=day,
            due_date=due_day,
            title=title,
            description=description or None,
        )

        return Response({
            "id": ex.id,
            "date": str(ex.date),
            "due_date": str(ex.due_date) if ex.due_date else None,
            "title": ex.title,
            "description": ex.description,
            "grade": {"id": ex.grade_id, "name": ex.grade.name},
            "subject": {"id": ex.subject_id, "name": ex.subject.name} if ex.subject else None,
            "teacher": {"id": user.id, "name": user.get_full_name()},
            "created_at": ex.created_at.isoformat() if ex.created_at else None,
        }, status=status.HTTP_201_CREATED)
       
            
   
   
   
   


class TeacherDailyExercisesListView(APIView):
    """
    Teacher sees what they assigned (filters optional)
    GET /exercises/daily/teacher/?date=YYYY-MM-DD&grade_id=8
    """
    permission_classes = [IsAuthenticated]

    def get(self, request: Request) -> Response:
        user: User = request.user
        if user.role != User.Role.TEACHER:
            return Response({"error": "Only teachers."}, status=403)

        date_str = request.query_params.get("date")
        grade_id = request.query_params.get("grade_id")

        qs = DailyExercise.objects.filter(teacher=user).select_related("grade", "subject", "teacher")

        if date_str:
            try:
                day = date.fromisoformat(str(date_str))
            except ValueError:
                return Response({"error": "date must be YYYY-MM-DD"}, status=400)
            qs = qs.filter(date=day)

        if grade_id:
            try:
                grade_id = int(grade_id)
            except (TypeError, ValueError):
                return Response({"error": "grade_id must be integer."}, status=400)
            qs = qs.filter(grade_id=grade_id)

        qs = qs.order_by("-date", "-created_at")

        items = []
        for x in qs:
            items.append({
                "id": x.id,
                "date": str(x.date),
                "due_date": str(x.due_date) if x.due_date else None,
                "title": x.title,
                "description": x.description,
                "grade": {"id": x.grade_id, "name": x.grade.name},
                "subject": {"id": x.subject_id, "name": x.subject.name} if x.subject else None,
                "created_at": x.created_at.isoformat() if x.created_at else None,
            })

        return Response({"items": items}, status=200)   
   
   
        
           
           
            
            
            

class HomeDashboardView(APIView):
    permission_classes = [IsAuthenticated]

    def build_school_leaderboard(self, request: Request, user: User, top_n: int = 20) -> dict:

        my_points = user.points or 0

        qs = (
            User.objects
            .filter(role=User.Role.STUDENT) 
            .select_related("grade_in__category")
            .annotate(total_points=Coalesce("points", Value(0), output_field=IntegerField()))
            .order_by("-total_points", "id")
        )

        top_users = list(qs[:top_n])

        items = []
        for idx, u in enumerate(top_users, start=1):
            pic = None
            if u.profilePic:
                try:
                    pic = request.build_absolute_uri(u.profilePic.url)
                except Exception:
                    pic = u.profilePic.url

            grade_label = None
            if u.grade_in_id:
                cat = u.grade_in.category.name if u.grade_in.category_id else None
                grade_label = f"{u.grade_in.name}{('-' + cat) if cat else ''}"

            items.append({
                "rank": idx,
                "id": u.id,
                "name": f"{u.first_name} {u.last_name}".strip() or u.email,
                "email": u.email,
                "points": int(getattr(u, "total_points", 0) or 0),
                "profilePic": pic,
                "grade": grade_label,
                "isMe": (u.id == user.id),
            })


        higher_count = qs.filter(total_points__gt=my_points).count()
        me_rank = higher_count + 1

        return {
            "scope": "school",
            "me_rank": me_rank,
            "items": items,
        }

    def get(self, request: Request) -> Response:
        user = (
            User.objects
            .select_related("grade_in__category")
            .prefetch_related("subjects_taught")
            .get(pk=request.user.pk)
        )

        data: dict[str, any] = {
            "me": MeSerializer(user, context={"request": request}).data,
        }

        role: str = user.role


        if role == User.Role.STUDENT:
            if not user.grade_in_id:
                return Response({"error": "Student has no grade assigned."}, status=400)

            subjects = Subject.objects.filter(grade_id=user.grade_in_id).order_by("name")

            subject_points = (
                UserSubjectPoints.objects
                .filter(user=user)
                .select_related("subject")
                .order_by("subject__name")
            )

            announcements = (
                Announcement.objects
                .filter(grade_id=user.grade_in_id)
                .select_related("grade", "subject", "created_by")
                .prefetch_related("comments__user")
                .order_by("-created_at")[:20]
            )

            sessions = (
                UserExamSession.objects
                .filter(user=user)
                .select_related("exam__subject", "exam__grade")
                .order_by("-started_at")[:30]
            )

            data.update({
                "subjects": SubjectSerializer(subjects, many=True).data,
                "subjectPoints": UserSubjectPointsSerializer(subject_points, many=True).data,
                "announcements": AnnouncementSerializer(announcements, many=True).data,
                "sessions": SessionMiniSerializer(sessions, many=True).data,
            })


        elif role == User.Role.TEACHER:
            taught = user.subjects_taught.all().order_by("name")

            announcements = (
                Announcement.objects
                .filter(created_by=user)
                .select_related("grade", "subject", "created_by")
                .prefetch_related("comments__user")
                .order_by("-created_at")[:20]
            )

            exam_counts = (
                Exam.objects
                .filter(subject__in=taught)
                .values("subject_id", "subject__name")
                .annotate(count=Count("id"))
                .order_by("subject__name")
            )

            data.update({
                "subjectsTaught": SubjectSerializer(taught, many=True).data,
                "myAnnouncements": AnnouncementSerializer(announcements, many=True).data,
                "examCounts": list(exam_counts),
            })


        elif role == User.Role.ADMIN:
            data.update({
                "stats": {
                    "users": User.objects.count(),
                    "grades": Grade.objects.count(),
                    "subjects": Subject.objects.count(),
                    "exams": Exam.objects.count(),
                    "questions": Question.objects.count(),
                },
                "latestAnnouncements": AnnouncementSerializer(
                    Announcement.objects
                    .select_related("grade", "subject", "created_by")
                    .prefetch_related("comments__user")
                    .order_by("-created_at")[:20],
                    many=True
                ).data
            })

        else:
            data["info"] = "Role not supported yet (parent needs relationship to student)."

        data["leaderboard"] = self.build_school_leaderboard(request, user, top_n=20)

        return Response(data, status=status.HTTP_200_OK)
    
    
    
    
    
    
    
    

class AISupportView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request: Request) -> Response:
        serializer = AISupportSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        user_text = serializer.validated_data["message"]

        key = "sk-fc8cf129413248c0bf6283a8e95a5981"
        if not key:
            return Response(
                {"error": "Server misconfigured: missing DEEPSEEK_API_KEY"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        model = os.getenv("DEEPSEEK_MODEL", "deepseek-chat")

        try:
            r = requests.post(
                "https://api.deepseek.com/chat/completions",
                headers={
                    "Content-Type": "application/json",
                    "Authorization": f"Bearer {key}",
                },
                json={
                    "model": model,
                    "messages": [
                        {
                            "role": "system",
                            "content": (
                                "You are an AI support agent inside an educational platform. "
                                "Be concise, helpful, and practical. Ask one clarifying question if needed."
                            ),
                        },
                        {"role": "user", "content": user_text},
                    ],
                    "temperature": 0.5,
                },
                timeout=30,
            )

            if r.status_code >= 400:
                return Response(
                    {"error": "deepseek_failed", "details": r.text},
                    status=status.HTTP_502_BAD_GATEWAY,
                )

            data = r.json()
            reply = (
                data.get("choices", [{}])[0]
                .get("message", {})
                .get("content", "")
                .strip()
            ) or "..."

            return Response({"reply": reply}, status=status.HTTP_200_OK)

        except requests.Timeout:
            return Response({"error": "deepseek_timeout"}, status=status.HTTP_504_GATEWAY_TIMEOUT)
        except Exception as e:
            return Response(
                {"error": "server_error", "details": str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )
    
    
    
    
    