from typing import Any, Dict

from django.db import transaction
from rest_framework import serializers, status
from rest_framework.permissions import IsAdminUser
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from api.models import Exam, Grade, Option, Question, User


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
        fields = ["id", "title", "duration", "subject", "grade", "questions"]

    def validate(self, attrs):
        if attrs["subject"].grade_id != attrs["grade"].pk:
            raise serializers.ValidationError({"subject": "Subject must belong to the selected grade."})
        return attrs

    def create(self, validated_data: dict) -> Exam:
        questions_data = validated_data.pop("questions", [])
        exam = Exam.objects.create(**validated_data)

        for question_data in questions_data:
            question_data: Dict[str, Any]
            options_data = question_data.pop("options", [])
            question = Question.objects.create(exam=exam, **question_data)

            for option_data in options_data:
                Option.objects.create(question=question, **option_data)

        return exam


class BulkStudentCreateSerializer(serializers.ModelSerializer):
    grade_in = serializers.PrimaryKeyRelatedField(queryset=Grade.objects.all())

    class Meta:
        model = User
        fields = ("email", "first_name", "last_name", "role", "grade_in", "points")

    def validate_role(self, value):
        if value not in [c[0] for c in User.Role.choices]:
            raise serializers.ValidationError("Invalid role.")
        return value

    def create(self, validated_data):
        user = User(**validated_data)
        user.set_unusable_password()
        user.save()
        return user


class BulkExamCreateView(APIView):
    permission_classes = [IsAdminUser]

    @transaction.atomic
    def post(self, request: Request) -> Response:
        serializer = ExamCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        exam = serializer.save()
        return Response(
            {"id": exam.id, "message": "Exam created successfully"},
            status=status.HTTP_201_CREATED,
        )


class BulkCreateStudentsView(APIView):
    permission_classes = [IsAdminUser]

    @transaction.atomic
    def post(self, request: Request) -> Response:
        if not isinstance(request.data, list):
            return Response(
                {"error": "Expected a JSON array (list) of users."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        serializer = BulkStudentCreateSerializer(data=request.data, many=True)
        serializer.is_valid(raise_exception=True)

        users = serializer.save()

        return Response(
            {
                "created_count": len(users),
                "users": [
                    {
                        "id": u.id,
                        "email": u.email,
                        "first_name": u.first_name,
                        "last_name": u.last_name,
                        "role": u.role,
                        "grade_in": u.grade_in_id,
                        "points": u.points,
                    }
                    for u in users
                ],
            },
            status=status.HTTP_201_CREATED,
        )
