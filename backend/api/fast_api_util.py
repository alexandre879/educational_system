from rest_framework import serializers
from api.models import Exam, Question, Option
from rest_framework.views import APIView
from rest_framework import status
from rest_framework.request import Request
from rest_framework.response import Response


class OptionCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Option
        fields = ["title", "is_correct"]


class QuestionCreateSerializer(serializers.ModelSerializer):
    options = OptionCreateSerializer(many=True)

    class Meta:
        model = Question
        fields = ["text", "points", "question_category", "options"]


class ExamCreateSerializer(serializers.ModelSerializer):
    questions = QuestionCreateSerializer(many=True)

    class Meta:
        model = Exam
        fields = ['id', 'title', 'duration', 'subject', 'grade', 'questions']

    def create(self, validated_data):
        questions_data = validated_data.pop("questions", [])
        exam = Exam.objects.create(**validated_data)

        for question_data in questions_data:
            options_data = question_data.pop("options", [])
            question = Question.objects.create(exam=exam, **question_data)

            for option_data in options_data:
                Option.objects.create(question=question, **option_data)

        return exam
    
    
    
    


class ExamCreateView(APIView):
    def post(self, request: Request):
        serializer = ExamCreateSerializer(data=request.data)
        if serializer.is_valid():
            exam = serializer.save()
            return Response(
                {"id": exam.id, "message": "Exam created successfully"},
                status=status.HTTP_201_CREATED,
            )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)