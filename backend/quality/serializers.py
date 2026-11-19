from rest_framework import serializers
from .models import Defect, Evaluation, Execution, Project, Requirement, TestCase


class CleanSerializer(serializers.ModelSerializer):
    def validate(self, attrs):
        for name, value in attrs.items():
            if isinstance(value, str) and not value.strip() and not self.fields[name].allow_blank:
                raise serializers.ValidationError({name: "Este campo es obligatorio."})
        return attrs


class ProjectSerializer(CleanSerializer):
    class Meta:
        model = Project
        fields = "__all__"
        read_only_fields = ["created_at", "updated_at", "is_demo"]


class RequirementSerializer(CleanSerializer):
    test_case_codes = serializers.SerializerMethodField()

    def get_test_case_codes(self, obj):
        return list(obj.test_cases.values_list("code", flat=True))

    def validate(self, attrs):
        attrs = super().validate(attrs)
        if self.instance and attrs.get("project", self.instance.project) != self.instance.project:
            raise serializers.ValidationError({"project": "No se puede trasladar un requisito a otro proyecto."})
        return attrs

    class Meta:
        model = Requirement
        fields = "__all__"


class TestCaseSerializer(CleanSerializer):
    requirement_code = serializers.CharField(source="requirement.code", read_only=True)
    latest_execution = serializers.SerializerMethodField()
    execution_count = serializers.SerializerMethodField()

    def get_latest_execution(self, obj):
        entry = obj.executions.first()
        return ExecutionSerializer(entry).data if entry else None

    def get_execution_count(self, obj):
        return obj.executions.count()

    def validate(self, attrs):
        attrs = super().validate(attrs)
        project = attrs.get("project", getattr(self.instance, "project", None))
        requirement = attrs.get("requirement", getattr(self.instance, "requirement", None))
        if requirement and requirement.project != project:
            raise serializers.ValidationError({"requirement": "El requisito debe pertenecer al mismo proyecto."})
        if self.instance and project != self.instance.project:
            raise serializers.ValidationError({"project": "No se puede trasladar un caso a otro proyecto."})
        return attrs

    class Meta:
        model = TestCase
        fields = "__all__"


class ExecutionSerializer(CleanSerializer):
    def validate_performed_at(self, value):
        from django.utils import timezone

        if value > timezone.now():
            raise serializers.ValidationError("La fecha de ejecución no puede estar en el futuro.")
        return value

    class Meta:
        model = Execution
        fields = "__all__"


class DefectSerializer(CleanSerializer):
    test_case_code = serializers.CharField(source="test_case.code", read_only=True, default=None)

    def validate(self, attrs):
        attrs = super().validate(attrs)
        project = attrs.get("project", getattr(self.instance, "project", None))
        case = attrs.get("test_case", getattr(self.instance, "test_case", None))
        if case and case.project != project:
            raise serializers.ValidationError({"test_case": "El caso debe pertenecer al mismo proyecto."})
        if self.instance and project != self.instance.project:
            raise serializers.ValidationError({"project": "No se puede trasladar un defecto a otro proyecto."})
        status = attrs.get("status", getattr(self.instance, "status", "ABIERTO"))
        resolution = attrs.get("resolution", getattr(self.instance, "resolution", ""))
        if status == "RESUELTO" and not resolution.strip():
            raise serializers.ValidationError(
                {"resolution": "Documente la corrección y su verificación antes de resolver."}
            )
        return attrs

    class Meta:
        model = Defect
        fields = "__all__"
        read_only_fields = ["created_at", "updated_at"]


class EvaluationSerializer(CleanSerializer):
    sample_size = serializers.IntegerField(min_value=1)

    class Meta:
        model = Evaluation
        fields = "__all__"
