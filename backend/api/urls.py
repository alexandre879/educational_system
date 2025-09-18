

from django.urls import path
from api.views import (
    RefreshTokenView,
    RequestOtpView,
    VerifyOtpView,
    UserMeView,
    AvailableExamsView,
    StartExamSessionView,
    ExamQuestionView,
    SubmitAnswerView, 
    FinishExamSessionView,
    ExamResultsView
    )




urlpatterns = [
    
    path("otp/request/", RequestOtpView.as_view(), name="request-otp"),
    path("otp/verify/", VerifyOtpView.as_view(), name="verify-otp"),
    
    
    path("user/me/", UserMeView.as_view(), name="user-me"),
    
    
    path("auth/refresh/", RefreshTokenView.as_view(), name="refresh-token"),
    
    
    path('exams/', AvailableExamsView.as_view(), name='available_exams'),
    path('exams/<int:exam_id>/start/', StartExamSessionView.as_view(), name='start_exam'),
    path('sessions/<int:session_id>/question/<int:question_index>/', ExamQuestionView.as_view(), name='get_question'),
    path('sessions/<int:session_id>/answer/', SubmitAnswerView.as_view(), name='submit_answer'),
    path('sessions/<int:session_id>/finish/', FinishExamSessionView.as_view(), name='finish_exam'),
    path('results/<int:exam_id>/', ExamResultsView.as_view(), name='exam_results'),
    
]
