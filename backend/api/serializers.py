from django.forms import ValidationError
from rest_framework import serializers
from .utils import normalize_image_to_square
from .models import (Announcement, Exam, Comment,
                     Grade, Question, Option, Subject,
                     UserExamSession, UserAnswer, User,
                     GradeCategory, UserSubjectPoints)





class RequestOtpSerializer(serializers.Serializer):
    email = serializers.EmailField()






class VerifyOtpSerializer(serializers.Serializer):
    email = serializers.EmailField()
    otp = serializers.CharField(max_length=6)








class OptionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Option
        fields = ['id', 'title']








class QuestionSerializer(serializers.ModelSerializer):
    options = OptionSerializer(many=True, read_only=True)
    
    class Meta:
        model = Question
        fields = ['id', 'text', 'points', 'options']








class ExamSerializer(serializers.ModelSerializer):
    questions_count = serializers.SerializerMethodField()
    subject = serializers.SerializerMethodField()
    
    class Meta:
        model = Exam
        fields = ['id', 'title', 'subject', 'duration', 'questions_count']
    
    def get_questions_count(self, exam):
        return exam.questions.count()
    
    def get_subject(self, exam):
        return exam.subject.name
    
    
    
    
    
    
    
class ExamSerializerOnStart(serializers.ModelSerializer):
    
    questions = QuestionSerializer(many=True)
    
    class Meta:
        model = Exam
        fields = ['id', 'title', 'subject', 'duration', 'questions']
    
    
    
    
    
    
    
class UserExamSessionSerializer(serializers.ModelSerializer):

    exam = ExamSerializerOnStart()

    
    class Meta:
        model = UserExamSession
        fields = ['id', 'started', 'finished', 'exam']
        
    






class UserSerializer(serializers.ModelSerializer):
    
    
    class Meta:
        model = User
        fields = ['id', 'first_name', 'last_name', 'email', 'profilePic', 'role',]
        
        





class ExamDetailSerializer(serializers.ModelSerializer):
    questions = QuestionSerializer(many=True, read_only=True)
    
    class Meta:
        model = Exam
        fields = ['id', 'title', 'subject', 'grade', 'duration', 'start_date', 'end_date', 'questions']







class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = GradeCategory
        fields = ('name', )







class GradeSerializer(serializers.ModelSerializer):
    
    category = CategorySerializer()
    
    class Meta:
        model = Grade
        fields = ('name', 'category')






class AnnouncementSerializer(serializers.ModelSerializer):
    
    grade = GradeSerializer()
    user = serializers.SerializerMethodField()
    subject = serializers.SerializerMethodField()
    len_comments = serializers.SerializerMethodField()
    
    class Meta:
        model = Announcement
        fields = ["id", "title", "content", "grade", "subject", "user", "created_at", "len_comments"]
        read_only_fields = ["created_by", "created_at"]


    def get_user(self, obj: Announcement):
        return obj.created_by.email
    
    def get_subject(self, obj: Announcement):
        return obj.subject.name
    
    def get_len_comments(self, obj: Announcement):
        return len(obj.comments.all())







class AnnouncementValidatorSerializer(serializers.ModelSerializer):
    subject_name = serializers.CharField(write_only=True)
    grade_id = serializers.IntegerField(write_only=True)
    category_id = serializers.IntegerField(write_only=True)

    class Meta:
        model = Announcement
        fields = ["id", "title", "content", "grade_id", "subject_name", "category_id", "grade", "subject", "created_by"]
        read_only_fields = ["id", "grade", "subject", "created_by"]

    def create(self, validated_data):
        
        subject_name = validated_data.pop("subject_name")
        grade_id = validated_data.pop("grade_id")
        category_id = validated_data.pop("category_id")
        
        
        subject_qs = Subject.objects.get(name=subject_name, grade__pk=grade_id, grade__category__pk=category_id)
        category_qs = GradeCategory.objects.get(pk=category_id)
        grade_qs = Grade.objects.get(pk=grade_id, category=category_qs)

        return Announcement.objects.create(
            **validated_data,
            subject=subject_qs,
            grade=grade_qs,
            created_by=self.context["request"].user,
        )







class UserAnswerSerializer(serializers.Serializer):
    
    question_id = serializers.IntegerField()
    option_id = serializers.IntegerField()
    
    
    
    
    
    
    
class PointListViewPerSubjectSerializer(serializers.Serializer):
    subject = serializers.CharField()






class CommentsCreateSerializer(serializers.Serializer):
    comment = serializers.CharField()
    announcement = serializers.IntegerField()
    
    
    
    
class UpdateProfileSerializer(serializers.ModelSerializer):
    profilePic = serializers.ImageField(required=False, allow_null=True, write_only=True)
    profilePicUrl = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = User
        fields = ("first_name", "last_name", 'profilePic', 'profilePicUrl')
        
    def update(self, instance, validated_data):
        image = validated_data.get("profile_image", None)

        if image:
            validated_data["profile_image"] = normalize_image_to_square(image, size=512)

        return super().update(instance, validated_data)
    
    

    def get_profilePicUrl(self, obj: User):
        if obj.profilePic:
            try:
                return obj.profilePic.url
            except Exception:
                return None
        return None

    def validate_email(self, value):
        user: User = self.context["request"].user
        if User.objects.exclude(pk=user.pk).filter(email=value).exists():
            raise serializers.ValidationError("This email is already taken.")
        return value
    
    




class LeaderBoardSerializer(serializers.ModelSerializer):
    first_name = serializers.CharField(source='user.first_name')
    last_name = serializers.CharField(source='user.last_name')
    email = serializers.EmailField(source='user.email')
    profile_pic = serializers.SerializerMethodField()

    class Meta:
        model = UserSubjectPoints
        fields = ['first_name', 'last_name', 'email', 'points', 'profile_pic']

    def get_profile_pic(self, obj: UserSubjectPoints):
        if obj.user.profilePic:
            return obj.user.profilePic.url
        return None
    
    


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

    def get_profilePic(self, obj):
        request = self.context.get("request")
        if not obj.profilePic:
            return None
        url = obj.profilePic.url
        return request.build_absolute_uri(url) if request else url

    class Meta:
        model = User
        fields = ["id", "email", "first_name", "last_name", "role", "points", "grade_in", "profilePic"]

class CommentSerializer(serializers.ModelSerializer):
    user = serializers.SerializerMethodField()

    def get_user(self, obj: Comment):
        return {
            "id": obj.user_id,
            "email": obj.user.email,
            "name": f"{obj.user.first_name} {obj.user.last_name}".strip(),
        }

    class Meta:
        model = Comment
        fields = ["id", "content", "user", "created_at"]
        
        
        

        
        

class AnnouncementSerializer(serializers.ModelSerializer):
    created_by = serializers.SerializerMethodField()
    subject = serializers.SerializerMethodField()
    grade = serializers.SerializerMethodField()
    len_comments = serializers.SerializerMethodField()
    
    
    def get_category(self, obj: Announcement):
        return {"id": obj.grade.category_id, "grade_name": obj.grade.name, "category_name": obj.grade.category.name}

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
        return {"id": obj.grade_id, "name": obj.grade.name, "category_name": obj.grade.category.name}
    
    def get_len_comments(self, obj: Announcement):
        return obj.comments.count()

    class Meta:
        model = Announcement
        fields = ["id", "title", "content", "grade", "subject", "created_by", "created_at", "comments", "len_comments"]
        
        
        
        

class UserSubjectPointsSerializer(serializers.ModelSerializer):
    subject = serializers.SerializerMethodField()

    def get_subject(self, obj: UserSubjectPoints):
        return {"id": obj.subject_id, "name": obj.subject.name}

    class Meta:
        model = UserSubjectPoints
        fields = ["subject", "points"]
        
        
        

class SessionMiniSerializer(serializers.ModelSerializer):
    exam = serializers.SerializerMethodField()
    subject = serializers.SerializerMethodField()
    grade = serializers.SerializerMethodField()

    def get_exam(self, obj):
        return {"id": obj.exam_id, "title": obj.exam.title, "duration": obj.exam.duration}

    def get_subject(self, obj):
        return {"id": obj.exam.subject_id, "name": obj.exam.subject.name}

    def get_grade(self, obj):
        return {"id": obj.exam.grade_id, "name": obj.exam.grade.name}

    class Meta:
        model = UserExamSession
        fields = [
            "id", "exam", "subject", "grade",
            "score_so_far", "started", "finished",
            "started_at", "ends_at", "submitted_at", "is_active"
        ]
        
        
        
        
class SearchQuerySerializer(serializers.Serializer):
    q = serializers.CharField(required=True, max_length=100)
    
    


class AISupportSerializer(serializers.Serializer):
    message = serializers.CharField(max_length=4000, allow_blank=False, trim_whitespace=True)