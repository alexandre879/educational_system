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
from rest_framework.permissions import IsAuthenticated
from django.utils import timezone
from django.shortcuts import get_object_or_404
from .models import Exam, UserExamSession, Option, UserAnswer
from .serializers import (
    ExamSerializer, QuestionSerializer, 
    UserAnswerSerializer, UserExamSessionSerializer, UserSerializer, RequestOtpSerializer
)




BOT_TOKEN = "8291605075:AAHRi1FC_OKIOlmuKVjy88CVtm906FBNihA"
OTP_TIMEOUT = 300
OTP_RATE_LIMIT = 30





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





        

class UserMeView(APIView):
    
    permission_classes = [IsAuthenticated]
    
    def get(self, request: Request):
        user = request.user
        
        serializer = UserSerializer(user)
        
        return Response(serializer.data)
    
    
    

    


class AvailableExamsView(generics.ListAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = ExamSerializer
    
    def get_queryset(self):
        user: User = self.request.user
        
        return Exam.objects.filter(
            grade=user.grade_in,
        )
    
    def get_serializer_context(self):
        context = super().get_serializer_context()
        context['request'] = self.request
        return context
    
    
    
# class StartExamSessionView(APIView):
#     permission_classes = [IsAuthenticated]
    
#     def post(self, request: Request, exam_id):
#         exam = get_object_or_404(Exam, pk=exam_id)
#         user = request.user
        
#         existing_session = UserExamSession.objects.select_related(
#             "exam"
#         ).prefetch_related(
#             "exam__questions"   
#         ).filter(user=user, exam=exam).first()
        
#         if existing_session:
#             if existing_session.finished:
#                 return Response(
#                     {'error': 'You have already completed this exam.'},
#                     status=status.HTTP_400_BAD_REQUEST
#                 )
#             serializer = UserExamSessionSerializer(existing_session)
#             return Response(serializer.data)
        
#         session = UserExamSession.objects.create(
#             user=user,
#             exam=exam,
#             started=True
#         )
        
#         session = UserExamSession.objects.prefetch_related(
#             "exam__questions"
#         ).get(pk=session.pk)
        
#         serializer = UserExamSessionSerializer(session)
#         return Response(serializer.data)






class StartOrResumeExamSessionView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request: Request, exam_id):
        exam = get_object_or_404(Exam, pk=exam_id)
        user = request.user


        session = UserExamSession.objects.filter(user=user, exam=exam).first()

        if session:
            if session.finished:
                return Response({"error": "You have already completed this exam."}, status=400)


            questions = list(session.exam.questions.order_by('id'))
            current_index = session.current_question_index
            current_question = questions[current_index]
            question_data = QuestionSerializer(current_question).data

            return Response({
                "session_id": session.id,
                "current_index": current_index,
                "current_question": question_data,
                "score_so_far": session.score_so_far
            })


        session = UserExamSession.objects.create(user=user, exam=exam, started=True)
        questions = list(exam.questions.order_by('id'))
        current_question = questions[0]
        question_data = QuestionSerializer(current_question).data

        return Response({
            "session_id": session.id,
            "current_index": 0,
            "current_question": question_data,
            "score_so_far": 0,
            "len_questions": len(questions)
        })






class ExamQuestionView(APIView):
    permission_classes = [IsAuthenticated]
    
    def get(self, request: Request, session_id, question_index):
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
        
        questions = session.exam.questions.all().order_by('id')
        
        if question_index >= questions.count():
            return Response(
                {'error': 'Question index out of bounds.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        question = questions[question_index]
        serializer = QuestionSerializer(question)
        
        return Response(serializer.data)





class SubmitAnswerView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request: Request, session_id):
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

        # Get questions once and ordered
        questions = list(session.exam.questions.prefetch_related('options').order_by('id'))
        current_index = session.current_question_index

        # Ensure the index is valid
        if current_index >= len(questions):
            return Response({'error': 'Invalid question index.'}, status=400)

        current_question = questions[current_index]

        # Validate answer
        serializer = UserAnswerSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        answer_option_id = serializer.validated_data['answer_option'].id
        answer_option = get_object_or_404(Option, pk=answer_option_id)

        # Check correctness
        is_correct = answer_option.is_correct

        # Create or update answer
        UserAnswer.objects.update_or_create(
            session=session,
            question=current_question,
            defaults={'answer_option': answer_option, 'is_correct': is_correct}
        )

        # Update score
        if is_correct:
            session.score_so_far += current_question.points

        # Move to next question
        next_index = current_index + 1
        finished = next_index >= len(questions)
        response_data = {
            'is_correct': is_correct,
            'current_score': session.score_so_far,
        }

        if not finished:
            # Update session index for next question
            session.current_question_index = next_index
            session.save()

            next_question = questions[next_index]
            response_data.update({
                'message': 'Answer submitted successfully.',
                'next_question': QuestionSerializer(next_question).data,
                'progress': f"{next_index + 1}/{len(questions)}"
            })
        else:
            # Finish exam
            session.finished_at = timezone.now()
            session.save()

            request.user.points += session.score_so_far
            request.user.save()

            response_data.update({
                'message': 'Exam completed successfully!',
                'final_score': session.score_so_far,
                'total_questions': len(questions)
            })

        return Response(response_data)







class FinishExamSessionView(APIView):
    permission_classes = [IsAuthenticated]
    
    def post(self, request: Request, session_id):
        session = get_object_or_404(
            UserExamSession, 
            id=session_id, 
            user=request.user
        )
        
        if not session.finished_at:
            session.finished_at = timezone.now()
            session.save()
            

            request.user.points += session.score_so_far
            request.user.save()
            
            return Response({
                'message': 'Exam session finished.',
                'final_score': session.score_so_far
            })
        else:
            return Response({
                'message': 'Exam session was already finished.',
                'final_score': session.score_so_far
            })






class ExamResultsView(generics.RetrieveAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = UserExamSessionSerializer
    
    def get_object(self):
        exam_id = self.kwargs.get('exam_id')
        user = self.request.user
        
        return get_object_or_404(
            UserExamSession, 
            exam_id=exam_id, 
            user=user,
            finished_at__isnull=False
        )