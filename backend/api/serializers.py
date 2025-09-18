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
    
    
    
    
    
class UserExamSessionSerializer(serializers.ModelSerializer):


    exam = serializers.SerializerMethodField()

    
    class Meta:
        model = UserExamSession
        fields = ['id', 'started', 'finished', 'exam']
        
    
    def get_exam(self, exam_session):
        return ExamSerializer(exam_session.exam).data





class UserSerializer(serializers.ModelSerializer):
    
    exam_sessions = UserExamSessionSerializer(many=True)

    
    class Meta:
        model = User
        fields = ['id', 'first_name', 'last_name', 'role', 'points', 'exam_sessions']
        
        



class ExamDetailSerializer(serializers.ModelSerializer):
    questions = QuestionSerializer(many=True, read_only=True)
    
    class Meta:
        model = Exam
        fields = ['id', 'title', 'subject', 'grade', 'duration', 'start_date', 'end_date', 'questions']






class UserAnswerSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserAnswer
        fields = ['question', 'answer_option']

