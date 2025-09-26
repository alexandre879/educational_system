# api/serializers.py
from django.forms import ValidationError
from rest_framework import serializers
from .models import Announcement, Exam, Grade, Question, Option, Subject, UserExamSession, UserAnswer, User, GradeCategory



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
        fields = ['id', 'first_name', 'last_name']
        
        



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
    grade_name = serializers.CharField(write_only=True)
    subject_id = serializers.IntegerField(write_only=True)
    category_id = serializers.IntegerField(write_only=True)

    class Meta:
        model = Announcement
        fields = ["id", "title", "content", "grade_name", "subject_id", "category_id", "grade", "subject", "created_by"]
        read_only_fields = ["id", "grade", "subject", "created_by"]

    def create(self, validated_data):
        grade_name = validated_data.pop("grade_name")
        subject_id = validated_data.pop("subject_id")
        category_id = validated_data.pop("category_id")

        subject_qs = Subject.objects.get(pk=subject_id)
        category_qs = GradeCategory.objects.get(pk=category_id)
        grade_qs = Grade.objects.get(name=grade_name, category=category_qs)

        return Announcement.objects.create(
            **validated_data,
            grade=grade_qs,
            subject=subject_qs,
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