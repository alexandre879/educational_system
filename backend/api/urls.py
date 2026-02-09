

from django.urls import path
from api.views import (
    AISupportChatView,
    HomeDashboardView,
    ListCommentsView,
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
    CreateCommentView,
    LeaderBoardListView,
    MySubjectsListView,
    UpdateProfileView,
    
)

from .fast_api_util import ExamCreateView




urlpatterns = [
    
    path('otp/request/', RequestOtpView.as_view(), name="request-otp"),
    path('otp/verify/', VerifyOtpView.as_view(), name="verify-otp"),
    
    
    path('user/me/', UserMeView.as_view(), name="user-me"),
    
    path('home/', HomeDashboardView.as_view(), name="home-dashboard"),
    
    
    path('user/logout/', LogoutView.as_view(), name="log-out"),
    path('auth/refresh/', RefreshTokenView.as_view(), name="refresh-token"),
    
    
    path('exams/', AvailableExamsView.as_view(), name='available_exams'),
    
    
    path('exams/<int:exam_id>/start_or_resume/', StartOrResumeOrFinishExamSessionView.as_view(), name='start_exam'),
    path('sessions/<int:session_id>/answer/', SubmitAnswerView.as_view(), name='submit_answer'),
    
    path('points/leaderboard/', PointListViewPerSubject.as_view(), name="leaderboard"),
    
    path('announcements/list/', AnnouncementListView.as_view(), name='announcements-list'),
    path('announcements/create/', AnnouncementCreateView.as_view(), name='announcements-create'),
    
    path('comments/create/', CreateCommentView.as_view(), name='comments-create'),
    
    path('comments/', ListCommentsView.as_view(), name='comments-list'), 
    
    path('leader-board/list/<int:subject_pk>/<int:grade_pk>/<int:category_pk>/', LeaderBoardListView.as_view(), name='leader-board-list'),
    path('my_subjects/', MySubjectsListView.as_view(), name='my-subjects-list'),
    
    
    
    path('exams/create/', ExamCreateView.as_view(), name="exam-create"),
    
    
    path('update/profile/', UpdateProfileView.as_view(), name='update-profile'),
    
    path('support/chat/', AISupportChatView.as_view(), name="support-chat"),
    
    path("aisupport/", AISupportChatView.as_view(), name="ai-support"),
    
]
