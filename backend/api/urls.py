from django.conf import settings
from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView

from api.views import (
    AISupportView,
    AnnouncementCreateView,
    AnnouncementDetailView,
    AnnouncementListView,
    AttendanceHistoryView,
    AvailableExamsView,
    CalendarView,
    CommentDetailView,
    CommentReactView,
    CreateCommentView,
    DailyExercisesView,
    ExamHistoryView,
    ExerciseCompleteView,
    GetSubjectBookView,
    GradeWeekdayScheduleView,
    HomeDashboardView,
    LeaderBoardListView,
    ListCommentsView,
    LogoutView,
    NotificationListView,
    NotificationReadView,
    NotificationUnreadView,
    MySubjectsListView,
    PushDeviceRegisterView,
    PushDeviceUnregisterView,
    RequestOtpView,
    SearchAnythingView,
    SessionReviewView,
    SpectatorLoginView,
    StartOrResumeOrFinishExamSessionView,
    StudentMarksView,
    SubmitAnswerView,
    TeacherDailyExerciseCreateView,
    TeacherDailyExercisesListView,
    TeacherExamsView,
    TeacherMarkAttendanceView,
    TeacherMarkDeleteView,
    TeacherMarksView,
    TeacherTodayLessonsAttendanceView,
    UpdateProfileView,
    UserMeView,
    VerifyOtpView,
)

from .fast_api_util import BulkCreateStudentsView, BulkExamCreateView


urlpatterns = [
    path("otp/request/", RequestOtpView.as_view(), name="request-otp"),
    path("otp/verify/", VerifyOtpView.as_view(), name="verify-otp"),
    path("auth/refresh/", TokenRefreshView.as_view(), name="refresh-token"),
    path("spectator/login/", SpectatorLoginView.as_view(), name="spectator-login"),
    path("user/logout/", LogoutView.as_view(), name="log-out"),
    path("user/me/", UserMeView.as_view(), name="user-me"),
    path("notifications/", NotificationListView.as_view(), name="notifications"),
    path("notifications/unread/", NotificationUnreadView.as_view(), name="notifications-unread"),
    path("notifications/read/", NotificationReadView.as_view(), name="notifications-read"),
    path("push/register/", PushDeviceRegisterView.as_view(), name="push-register"),
    path("push/unregister/", PushDeviceUnregisterView.as_view(), name="push-unregister"),
    path("update/profile/", UpdateProfileView.as_view(), name="update-profile"),
    path("home/", HomeDashboardView.as_view(), name="home-dashboard"),

    path("exams/", AvailableExamsView.as_view(), name="available_exams"),
    path("exams/<int:exam_id>/start_or_resume/", StartOrResumeOrFinishExamSessionView.as_view(), name="start_exam"),
    path("sessions/<int:session_id>/answer/", SubmitAnswerView.as_view(), name="submit_answer"),
    path("sessions/<int:session_id>/review/", SessionReviewView.as_view(), name="session-review"),
    path("exams/history/", ExamHistoryView.as_view(), name="exam-history"),
    path("teacher/exams/", TeacherExamsView.as_view(), name="teacher-exams"),

    path("announcements/list/", AnnouncementListView.as_view(), name="announcements-list"),
    path("announcements/create/", AnnouncementCreateView.as_view(), name="announcements-create"),
    path("announcements/<int:announcement_id>/", AnnouncementDetailView.as_view(), name="announcements-detail"),
    path("comments/create/", CreateCommentView.as_view(), name="comments-create"),
    path("comments/", ListCommentsView.as_view(), name="comments-list"),
    path("comments/<int:comment_id>/", CommentDetailView.as_view(), name="comments-detail"),
    path("comments/<int:comment_id>/react/", CommentReactView.as_view(), name="comments-react"),

    path(
        "leader-board/list/<int:subject_pk>/<int:grade_pk>/<int:category_pk>/",
        LeaderBoardListView.as_view(),
        name="leader-board-list",
    ),
    path("my_subjects/", MySubjectsListView.as_view(), name="my-subjects-list"),
    path("subjects/books/", GetSubjectBookView.as_view(), name="list-specific-subjects-book"),
    path("search/", SearchAnythingView.as_view(), name="search-anything"),

    path("schedule/grade-weekday/", GradeWeekdayScheduleView.as_view(), name="weekly-lessons"),
    path("teacher/attendance/today-lessons/", TeacherTodayLessonsAttendanceView.as_view(), name="teacher-today-lessons"),
    path("teacher/attendance/mark/", TeacherMarkAttendanceView.as_view(), name="teacher-attendance-mark"),

    path("exercises/daily/", DailyExercisesView.as_view(), name="student-daily-exercises"),
    path("exercises/daily/create/", TeacherDailyExerciseCreateView.as_view(), name="teacher-daily-exercise-create"),
    path("exercises/daily/teacher/", TeacherDailyExercisesListView.as_view(), name="teacher-daily-exercises-list"),
    path("exercises/<int:exercise_id>/complete/", ExerciseCompleteView.as_view(), name="exercise-complete"),

    path("marks/", StudentMarksView.as_view(), name="marks"),
    path("teacher/marks/", TeacherMarksView.as_view(), name="teacher-marks"),
    path("teacher/marks/<int:mark_id>/", TeacherMarkDeleteView.as_view(), name="teacher-mark-delete"),
    path("attendance/history/", AttendanceHistoryView.as_view(), name="attendance-history"),
    path("calendar/", CalendarView.as_view(), name="calendar"),

    path("aisupport/", AISupportView.as_view(), name="ai-support"),

    # Admin-only bulk import endpoints.
    path("exams/create/", BulkExamCreateView.as_view(), name="exam-create"),
]

if settings.STUDENTS_BULK_CREATE_PATH:
    urlpatterns.append(
        path(settings.STUDENTS_BULK_CREATE_PATH, BulkCreateStudentsView.as_view(), name="students-bulk-create"),
    )
