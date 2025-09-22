import os
from dotenv import load_dotenv
import random
from tokenize import TokenError
from rest_framework.response import Response
from rest_framework.request import Request
from django.core.cache import cache
from rest_framework.views import APIView
from rest_framework import status, generics
from telegram import Bot
from .models import User
from api.serializers import VerifyOtpSerializer
from rest_framework_simplejwt.tokens import RefreshToken
from asgiref.sync import async_to_sync
from rest_framework.permissions import IsAuthenticated, AllowAny
from django.utils import timezone
from django.shortcuts import get_object_or_404
from .models import Exam, UserExamSession, Option, UserAnswer
from .serializers import (
    QuestionSerializer, 
    UserAnswerSerializer, 
    UserExamSessionSerializer, 
    UserSerializer, 
    RequestOtpSerializer, 
    PointListViewPerSubjectSerializer
)
from django.db.models import Sum


load_dotenv()


BOT_TOKEN = os.getenv("BOT_TOKEN")
OTP_TIMEOUT = os.getenv("OTP_TIMEOUT")
OTP_RATE_LIMIT = os.getenv("OTP_RATE_LIMIT")





class RequestOtpView(APIView):
    def post(self, request: Request):
        
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

        bot = Bot(token=BOT_TOKEN)
        
        async_to_sync(bot.send_message)(chat_id=user.chat_id, text=f"{otp}")
        

        return Response({"message": "OTP sent via Telegram"}, status=status.HTTP_200_OK)





class VerifyOtpView(APIView):
    def post(self, request: Request):
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

    def post(self, request: Request):
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

    def post(self, request: Request):
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
    
    
    
    
    
    
class AvailableExamsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request: Request):


        finished_exam_ids = UserExamSession.objects.filter(
            user=request.user,
            finished=True
        ).values_list("exam_id", flat=True)



        available_exams = (
            Exam.objects.filter(grade=request.user.grade_in)
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
        
        
        
        
        


class StartOrResumeExamSessionView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request: Request, exam_id: int):
        exam = get_object_or_404(Exam, pk=exam_id)
        user = request.user


        if exam.grade and exam.grade != user.grade_in:
            return Response({"error": "You are not allowed to access this exam"}, status=status.HTTP_403_FORBIDDEN)
        

        session = UserExamSession.objects.filter(user=user, exam=exam).first()

        if session:
            if session.finished:
                return Response({"error": "You have already completed this exam."}, status=400)


            questions = list(session.exam.questions.order_by('id'))
            current_index = session.current_question_index
            current_question = questions[current_index]
            question_data = QuestionSerializer(current_question).data
            

            return Response({
                "subject": UserExamSession.objects.filter(exam=exam, user=user).values_list('exam__subject__name', flat=True)[0],
                "session_id": session.pk,
                "current_index": current_index,
                "exam_id": session.exam.pk,
                "current_question": question_data,
                "len_questions": len(questions),
            })


        session = UserExamSession.objects.create(user=user, exam=exam, started=True)
        questions = list(exam.questions.order_by('id'))
        current_question = questions[0]
        question_data = QuestionSerializer(current_question).data

        return Response({
            "subject": UserExamSession.objects.filter(exam=exam, user=user).values_list('exam__subject__name', flat=True)[0],
            "session_id": session.id,
            "current_index": 0,
            "current_question": question_data,
            "len_questions": len(questions)
        })









class SubmitAnswerView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request: Request, session_id: int):
        session = get_object_or_404(
            UserExamSession,
            pk=session_id,
            user=request.user
        )
        
        if session.finished:
            return Response(
                {'error': 'This exam session has already been completed.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        questions = list(session.exam.questions.prefetch_related('options').order_by('id'))
        current_index = session.current_question_index

        if current_index >= len(questions):
            return Response({'error': 'Invalid question index.'}, status=400)

        current_question = questions[current_index]

        serializer = UserAnswerSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        answer_option_id = serializer.validated_data['option_id']
        answer_option = get_object_or_404(Option, pk=answer_option_id)

        is_correct = answer_option.is_correct

        UserAnswer.objects.update_or_create(
            session=session,
            question=current_question,
            defaults={'answer_option': answer_option, 'is_correct': is_correct}
        )

        if is_correct:
            session.score_so_far += current_question.points

        next_index = current_index + 1
        finished = next_index >= len(questions)
        if not finished:
            session.current_question_index = next_index
            session.save()

            next_question = questions[next_index]
            
            return Response({
                "subject": session.exam.subject.name,
                "exam_id": session.exam.pk,
                "session_id": session.pk,  
                "current_index": next_index,
                "current_question": QuestionSerializer(next_question).data,
                "len_questions": len(questions),
            })
            
            
        else:
            session.finished = True
            session.save()

            request.user.points += session.score_so_far
            request.user.save()
            
            return Response({
                'message': 'Exam completed successfully!',
                'final_score': session.score_so_far,
                'total_questions': len(questions)
            })






class PointListViewPerSubject(APIView):
    
    permission_classes = [IsAuthenticated]
    
    def post(self, request: Request):
        
        user: User = request.user
        
        subject = request.data.get('subject', None)
        
        if not subject:
            global_points = (User.objects
                .filter(grade_in=user.grade_in)
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