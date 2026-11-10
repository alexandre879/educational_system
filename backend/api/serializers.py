from django.utils import timezone
from django.db.models import Sum
from rest_framework import serializers

from .models import (
    MAX_MARK,
    MIN_MARK,
    Announcement,
    CommentReaction,
    Grade,
    GradeCategory,
    Option,
    PushDevice,
    Question,
    Subject,
    User,
    UserExamSession,
    UserSubjectPoints,
)


class RequestOtpSerializer(serializers.Serializer):
    email = serializers.EmailField()


class VerifyOtpSerializer(serializers.Serializer):
    email = serializers.EmailField()
    otp = serializers.CharField(max_length=6, trim_whitespace=True)


class SpectatorLoginSerializer(serializers.Serializer):
    # Who to view the site as; left out, the first one that's set up (student first).
    role = serializers.ChoiceField(choices=[str(role) for role in User.SPECTATOR_VIEW_ROLES], required=False)


class OptionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Option
        fields = ["id", "title"]


class QuestionSerializer(serializers.ModelSerializer):
    options = OptionSerializer(many=True, read_only=True)

    class Meta:
        model = Question
        fields = ["id", "text", "points", "options"]


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["id", "first_name", "last_name", "email", "profilePic", "role"]


class GradeCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = GradeCategory
        fields = ["id", "name"]


class GradeSerializer(serializers.ModelSerializer):
    category = GradeCategorySerializer()

    class Meta:
        model = Grade
        fields = ["id", "name", "category"]


class SubjectSerializer(serializers.ModelSerializer):
    class Meta:
        model = Subject
        fields = ["id", "name"]


class MeSerializer(serializers.ModelSerializer):
    grade_in = GradeSerializer()
    profilePic = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ["id", "email", "first_name", "last_name", "role", "points", "grade_in", "profilePic"]

    def get_profilePic(self, obj):
        request = self.context.get("request")
        if not obj.profilePic:
            return None
        url = obj.profilePic.url
        return request.build_absolute_uri(url) if request else url


class AnnouncementSerializer(serializers.ModelSerializer):
    created_by = serializers.SerializerMethodField()
    subject = serializers.SerializerMethodField()
    grade = serializers.SerializerMethodField()
    len_comments = serializers.SerializerMethodField()

    class Meta:
        model = Announcement
        fields = ["id", "title", "content", "grade", "subject", "created_by", "created_at", "len_comments"]

    def get_created_by(self, obj: Announcement):
        return {
            "id": obj.created_by_id,
            "email": obj.created_by.email,
            "name": f"{obj.created_by.first_name} {obj.created_by.last_name}".strip(),
        }

    def get_subject(self, obj: Announcement):
        if not obj.subject_id:
            return None
        return {"id": obj.subject_id, "name": obj.subject.name}

    def get_grade(self, obj: Announcement):
        category = obj.grade.category
        return {
            "id": obj.grade_id,
            "name": obj.grade.name,
            "category_name": category.name if category else None,
        }

    def get_len_comments(self, obj: Announcement):
        # Views annotate `comments_count` to avoid one COUNT query per announcement.
        count = getattr(obj, "comments_count", None)
        return count if count is not None else obj.comments.filter(deleted_at__isnull=True).count()


class AnnouncementValidatorSerializer(serializers.ModelSerializer):
    subject_id = serializers.IntegerField(write_only=True)
    grade_id = serializers.IntegerField(write_only=True)
    category_id = serializers.IntegerField(write_only=True)

    class Meta:
        model = Announcement
        fields = ["id", "title", "content", "grade_id", "subject_id", "category_id"]
        read_only_fields = ["id"]

    def validate(self, attrs):
        subject = (
            Subject.objects.select_related("grade")
            .filter(
                pk=attrs["subject_id"],
                grade_id=attrs["grade_id"],
                grade__category_id=attrs["category_id"],
            )
            .first()
        )
        if subject is None:
            raise serializers.ValidationError("Subject does not belong to the selected grade.")

        user: User = self.context["request"].user
        if not user.subjects_taught.filter(pk=subject.pk).exists():
            raise serializers.ValidationError(
                {"subject_id": "You can only post announcements for subjects you teach."}
            )

        attrs["subject"] = subject
        return attrs

    def create(self, validated_data):
        subject = validated_data.pop("subject")
        for key in ("subject_id", "grade_id", "category_id"):
            validated_data.pop(key)

        return Announcement.objects.create(
            **validated_data,
            subject=subject,
            grade=subject.grade,
            created_by=self.context["request"].user,
        )


class UserAnswerSerializer(serializers.Serializer):
    question_id = serializers.IntegerField()
    option_id = serializers.IntegerField()


class CommentsCreateSerializer(serializers.Serializer):
    comment = serializers.CharField(max_length=5000)
    announcement = serializers.IntegerField()
    reply_to = serializers.IntegerField(required=False, allow_null=True)


class CommentEditSerializer(serializers.Serializer):
    comment = serializers.CharField(max_length=5000)


class CommentReactionSerializer(serializers.Serializer):
    emoji = serializers.ChoiceField(choices=CommentReaction.EMOJIS)


class UpdateProfileSerializer(serializers.ModelSerializer):
    # Resizing/cropping happens in User.save(), so every upload path is covered.
    profilePic = serializers.ImageField(required=False, allow_null=True)

    class Meta:
        model = User
        fields = ("first_name", "last_name", "profilePic")


class LeaderBoardSerializer(serializers.ModelSerializer):
    first_name = serializers.CharField(source="user.first_name")
    last_name = serializers.CharField(source="user.last_name")
    email = serializers.EmailField(source="user.email")
    profile_pic = serializers.SerializerMethodField()

    class Meta:
        model = UserSubjectPoints
        fields = ["first_name", "last_name", "email", "points", "profile_pic"]

    def get_profile_pic(self, obj: UserSubjectPoints):
        if obj.user.profilePic:
            return obj.user.profilePic.url
        return None


class UserSubjectPointsSerializer(serializers.ModelSerializer):
    subject = serializers.SerializerMethodField()

    class Meta:
        model = UserSubjectPoints
        fields = ["subject", "points"]

    def get_subject(self, obj: UserSubjectPoints):
        return {"id": obj.subject_id, "name": obj.subject.name}


class SessionMiniSerializer(serializers.ModelSerializer):
    exam = serializers.SerializerMethodField()
    subject = serializers.SerializerMethodField()
    grade = serializers.SerializerMethodField()
    # The most points the exam can give, so apps can show "6 / 10" instead of a bare score.
    max_score = serializers.SerializerMethodField()

    class Meta:
        model = UserExamSession
        fields = [
            "id", "exam", "subject", "grade",
            "score_so_far", "max_score", "started", "finished",
            "started_at", "ends_at", "submitted_at", "is_active",
        ]

    def get_max_score(self, obj):
        # Callers pass the totals for all their sessions at once (one query, not one per row).
        totals = self.context.get("max_scores")
        if totals is not None:
            return totals.get(obj.exam_id, 0)
        return obj.exam.questions.aggregate(total=Sum("points"))["total"] or 0

    def get_exam(self, obj):
        return {"id": obj.exam_id, "title": obj.exam.title, "duration": obj.exam.duration}

    def get_subject(self, obj):
        return {"id": obj.exam.subject_id, "name": obj.exam.subject.name}

    def get_grade(self, obj):
        return {"id": obj.exam.grade_id, "name": obj.exam.grade.name}


class SearchQuerySerializer(serializers.Serializer):
    q = serializers.CharField(required=True, max_length=100)


class PushDeviceSerializer(serializers.Serializer):
    token = serializers.RegexField(r"^Expo(nent)?PushToken\[[^\]]+\]$", max_length=255)
    platform = serializers.ChoiceField(choices=PushDevice.Platform.choices, required=False, allow_blank=True)
    language = serializers.ChoiceField(choices=["en", "ka", "ru"], required=False)


class ChatTurnSerializer(serializers.Serializer):
    role = serializers.ChoiceField(choices=["user", "assistant"])
    content = serializers.CharField(max_length=4000, trim_whitespace=True)


class AISupportSerializer(serializers.Serializer):
    message = serializers.CharField(max_length=4000, allow_blank=False, trim_whitespace=True)
    # Previous turns of the conversation, oldest first, so follow-up questions have context.
    history = ChatTurnSerializer(many=True, required=False, max_length=20)


class MarkCreateSerializer(serializers.Serializer):
    student_id = serializers.IntegerField()
    subject_id = serializers.IntegerField()
    value = serializers.IntegerField(min_value=MIN_MARK, max_value=MAX_MARK)
    date = serializers.DateField(required=False)
    comment = serializers.CharField(max_length=255, required=False, allow_blank=True, default="")

    def validate_date(self, value):
        if value > timezone.localdate():
            raise serializers.ValidationError("A mark can't be dated in the future.")
        return value


class ExamOptionInputSerializer(serializers.Serializer):
    title = serializers.CharField(max_length=500)
    is_correct = serializers.BooleanField(default=False)


class ExamQuestionInputSerializer(serializers.Serializer):
    text = serializers.CharField(max_length=2000)
    points = serializers.IntegerField(min_value=1, max_value=100, default=1)
    options = ExamOptionInputSerializer(many=True, min_length=2, max_length=6)

    def validate_options(self, options):
        if not any(option["is_correct"] for option in options):
            raise serializers.ValidationError("Mark at least one option as correct.")
        return options


class TeacherExamCreateSerializer(serializers.Serializer):
    """An exam written by a teacher in the app, in a single language."""

    subject_id = serializers.IntegerField()
    title = serializers.CharField(max_length=255)
    duration = serializers.IntegerField(min_value=1, max_value=300)
    scheduled_for = serializers.DateField(required=False, allow_null=True)
    questions = ExamQuestionInputSerializer(many=True, min_length=1, max_length=100)
