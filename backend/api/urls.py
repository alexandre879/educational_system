

from django.urls import path
from api.views import (
    RefreshTokenView,
    RequestOtpView,
    VerifyOtpView,
    UserMeView,
    StartOrResumeOrFinishExamSessionView,
    SubmitAnswerView, 
    LogoutView,
    AvailableExamsView,
    PointListViewPerSubject,
    AnnouncementCreateView,
    AnnouncementListView,
)




urlpatterns = [
    
    path("otp/request/", RequestOtpView.as_view(), name="request-otp"),
    path("otp/verify/", VerifyOtpView.as_view(), name="verify-otp"),
    
    
    path("user/me/", UserMeView.as_view(), name="user-me"),
    
    
    path("user/logout/", LogoutView.as_view(), name="log-out"),
    path("auth/refresh/", RefreshTokenView.as_view(), name="refresh-token"),
    
    
    path('exams/', AvailableExamsView.as_view(), name='available_exams'),
    
    
    path('exams/<int:exam_id>/start_or_resume/', StartOrResumeOrFinishExamSessionView.as_view(), name='start_exam'),
    path('sessions/<int:session_id>/answer/', SubmitAnswerView.as_view(), name='submit_answer'),
    
    path("points/leaderboard/", PointListViewPerSubject.as_view(), name="leaderboard"),
    
    path('announcements/list/', AnnouncementListView.as_view(), name='announcements-list'),
    path('announcements/create/', AnnouncementCreateView.as_view(), name='announcements-create'),
    
]
