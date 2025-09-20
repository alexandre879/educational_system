# api/serializers.py
from rest_framework import serializers
from .models import Exam, Question, Option, UserExamSession, UserAnswer, User



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






class UserAnswerSerializer(serializers.Serializer):
    
    question_id = serializers.IntegerField()
    option_id = serializers.IntegerField()
