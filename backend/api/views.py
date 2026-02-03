from openai import OpenAI
import os
from dotenv import load_dotenv
import random
from tokenize import TokenError
from rest_framework.response import Response
from rest_framework.request import Request
from django.core.cache import cache
from rest_framework.views import APIView
from rest_framework import status
from telegram import Bot
from .models import (
    Announcement,
    Grade,
    GradeCategory,
    Subject,
    User,
    Comment,
    UserSubjectPoints,
    Question,
)
from django.db.models import Count, IntegerField, Value
from django.db.models.functions import Coalesce
from api.serializers import VerifyOtpSerializer
from rest_framework_simplejwt.tokens import RefreshToken
from asgiref.sync import async_to_sync
from rest_framework.permissions import IsAuthenticated, AllowAny
from django.shortcuts import get_object_or_404
from .models import Exam, UserExamSession, Option, UserAnswer
from .serializers import (
    CommentsCreateSerializer,
    LeaderBoardSerializer,
    MeSerializer,
    QuestionSerializer,
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





load_dotenv()



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


        finished_exam_ids = UserExamSession.objects.filter(
            user=request.user,
            finished=True
        ).values_list("exam_id", flat=True)
        
        # finished_exams_name = Exam.objects.filter(
        #     pk__in=finished_exam_ids
        # ).values_list("title", flat=True)
        

        available_exams = (
            Exam.objects.filter(grade=user.grade_in)
            .exclude(pk__in=finished_exam_ids)
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

        # already finished
        if session.finished:
            return Response(
                {"error": "You already completed this exam."},
                status=status.HTTP_400_BAD_REQUEST
            )

        # start if not started OR no ends_at
        if not session.started or not session.ends_at:
            session.start()

        # if expired -> terminate
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

        # ✅ Block if session is not active
        if not session.is_active:
            return Response(
                {"error": "This exam session is not active."},
                status=status.HTTP_403_FORBIDDEN
            )

        # ✅ Timer enforcement
        if session.is_expired:
            session.terminate()
            return Response(
                {"error": "Time is up. This exam session has been terminated."},
                status=status.HTTP_403_FORBIDDEN
            )

        # ✅ Already finished
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

        # ✅ IMPORTANT: option must belong to the current question
        answer_option = get_object_or_404(
            Option,
            pk=answer_option_id,
            question=current_question
        )

        is_correct = answer_option.is_correct

        # ✅ Prevent double-scoring: check previous answer correctness
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

        # add points only if it became correct now (was not correct before)
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
                "ends_at": session.ends_at,  # ✅ frontend countdown source of truth
            })

        # ✅ Finish session
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

    def get(self, request: Request):
        user: User = request.user

        subject_list = (
            user.grade_in.subjects.all()
            .values('pk', 'name', 'grade__pk', 'grade__name', 'grade__category__pk', 'grade__category__name')
            .order_by('pk')
        )

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
    
    
    
    



class AISupportChatView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request: Request):
        message = str(request.data.get("message", "")).strip()

        if not message:
            return Response(
                {"error": "Message is required."},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            response = client.responses.create(
                model="gpt-4.1-mini",
                input=[
                    {
                        "role": "system",
                        "content": [
                            {
                                "type": "input_text",   # ✅ FIX
                                "text": SYSTEM_PROMPT
                            }
                        ]
                    },
                    {
                        "role": "user",
                        "content": [
                            {
                                "type": "input_text",   # ✅ FIX
                                "text": message
                            }
                        ]
                    }
                ],
            )

            reply = ""
            for item in response.output:
                if item["type"] == "message":
                    for content in item["content"]:
                        if content["type"] == "output_text":
                            reply += content["text"]

            reply = reply.strip() or "Sorry, I couldn't generate a response."

            return Response(
                {"reply": reply},
                status=status.HTTP_200_OK
            )

        except Exception as e:
            return Response(
                {
                    "error": "AI service error",
                    "details": str(e)
                },
                status=status.HTTP_502_BAD_GATEWAY
            )
            
            
            

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

        # global rank even if user not in top list
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

        data = {
            "me": MeSerializer(user, context={"request": request}).data,
        }

        role = user.role

        # =========================
        # STUDENT DASHBOARD
        # =========================
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

        # =========================
        # TEACHER DASHBOARD
        # =========================
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

        # =========================
        # ADMIN DASHBOARD
        # =========================
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

        # ✅ Whole-school leaderboard for everyone (students/teachers/admin)
        data["leaderboard"] = self.build_school_leaderboard(request, user, top_n=20)

        return Response(data, status=status.HTTP_200_OK)