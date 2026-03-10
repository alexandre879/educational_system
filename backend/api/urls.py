import os
from django.urls import path
from api.views import (
    TEST,
    AISupportView,
    GetSubjectBookView,
    GradeWeekdayScheduleView,
    HomeDashboardView,
    ListCommentsView,
    RefreshTokenView,
    RequestOtpView,
    TeacherMarkAttendanceView,
    TeacherTodayLessonsAttendanceView,
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
    SearchAnythingView,
    StudentDailyExercisesView,
    TeacherDailyExerciseCreateView,
    TeacherDailyExercisesListView, 
    
)

from .fast_api_util import (
    BulkExamCreateView,
    BulkCreateStudentsView
)


STUDENTS_CREATE_URL = os.environ.get("FOR_STUDENTS_API")





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
    
    path('schedule/grade-weekday/', GradeWeekdayScheduleView.as_view(), name='weekly-lessons'),
    
    path("teacher/attendance/today-lessons/", TeacherTodayLessonsAttendanceView.as_view(), name="teacher-today-lessons"),
    
    path("teacher/attendance/mark/", TeacherMarkAttendanceView.as_view(), name="teacher-attendance-mark"),
    
    path('update/profile/', UpdateProfileView.as_view(), name='update-profile'),
    
    path("aisupport/", AISupportView.as_view(), name="ai-support"),
    
    path('search/', SearchAnythingView.as_view(), name='search-anything'),
    
    path("exercises/daily/", StudentDailyExercisesView.as_view(), name="student-daily-exercises"),

    path("exercises/daily/create/", TeacherDailyExerciseCreateView.as_view(), name="teacher-daily-exercise-create"),

    path("exercises/daily/teacher/", TeacherDailyExercisesListView.as_view(), name="teacher-daily-exercises-list"),
    
    path("subjects/books/", GetSubjectBookView.as_view(), name="list-specific-subjects-book"),
    
    
    path("test/", TEST.as_view(), name="test-view"),
    
    
    
    
    

    

    
    
    ##### for testing purposes, to be removed later. also can be considered as fast API ;)
    path('exams/create/', BulkExamCreateView.as_view(), name="exam-create"),
    #####
    
    
    
    ##### for testing purposes, to be removed later. also can be considered as fast API ;)
    path(f"{STUDENTS_CREATE_URL}", BulkCreateStudentsView.as_view()),
    #####
    
]
