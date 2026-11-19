from django.contrib.auth import authenticate, login, logout
from django.http import JsonResponse
from django.utils import timezone
from django.views.decorators.csrf import csrf_protect, ensure_csrf_cookie
from rest_framework import status, viewsets
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.exceptions import ValidationError
from .metrics import project_metrics
from .models import Defect, Evaluation, Execution, Project, Requirement, TestCase
from .serializers import (
    DefectSerializer,
    EvaluationSerializer,
    ExecutionSerializer,
    ProjectSerializer,
    RequirementSerializer,
    TestCaseSerializer,
)


@ensure_csrf_cookie
def session_view(request):
    return JsonResponse(
        {
            "authenticated": request.user.is_authenticated,
            "username": request.user.username if request.user.is_authenticated else None,
        }
    )


@api_view(["POST"])
@permission_classes([AllowAny])
@csrf_protect
def login_view(request):
    user = authenticate(request, username=request.data.get("username"), password=request.data.get("password"))
    if user is None:
        return Response({"detail": "Usuario o contraseña incorrectos."}, status=status.HTTP_400_BAD_REQUEST)
    login(request, user)
    return Response({"username": user.username})


@api_view(["POST"])
def logout_view(request):
    logout(request)
    return Response({"detail": "Sesión cerrada."})


class RecordViewSet(viewsets.ModelViewSet):
    http_method_names = ["get", "post", "put", "patch", "head", "options"]

    def get_queryset(self):
        qs = super().get_queryset()
        params = self.request.query_params
        for key in ["project", "status", "severity", "responsible", "test_case"]:
            if key in params and key in {f.name for f in qs.model._meta.fields}:
                if key in ("project", "test_case") and not params[key].isdigit():
                    raise ValidationError({key: "El identificador debe ser un número entero positivo."})
                qs = qs.filter(**{key: params[key]})
        return qs


class ProjectViewSet(RecordViewSet):
    queryset = Project.objects.all()
    serializer_class = ProjectSerializer

    @action(detail=True)
    def metrics(self, request, pk=None):
        return Response(project_metrics(self.get_object()))

    @action(detail=True)
    def report(self, request, pk=None):
        project = self.get_object()
        return Response(
            {
                "generated_at": timezone.now(),
                "project": ProjectSerializer(project).data,
                "metrics": project_metrics(project),
                "requirements": RequirementSerializer(project.requirements.all(), many=True).data,
                "test_cases": TestCaseSerializer(project.test_cases.all(), many=True).data,
                "executions": ExecutionSerializer(Execution.objects.filter(test_case__project=project), many=True).data,
                "defects": DefectSerializer(project.defects.all(), many=True).data,
                "evaluations": EvaluationSerializer(project.evaluations.all(), many=True).data,
            }
        )


class RequirementViewSet(RecordViewSet):
    queryset = Requirement.objects.select_related("project").prefetch_related("test_cases")
    serializer_class = RequirementSerializer


class TestCaseViewSet(RecordViewSet):
    queryset = TestCase.objects.select_related("project", "requirement").prefetch_related("executions")
    serializer_class = TestCaseSerializer


class ExecutionViewSet(viewsets.ReadOnlyModelViewSet, viewsets.mixins.CreateModelMixin):
    queryset = Execution.objects.select_related("test_case")
    serializer_class = ExecutionSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        for key in ["test_case", "project"]:
            if key in self.request.query_params and not self.request.query_params[key].isdigit():
                raise ValidationError({key: "El identificador debe ser un número entero positivo."})
        if "test_case" in self.request.query_params:
            qs = qs.filter(test_case=self.request.query_params["test_case"])
        if "project" in self.request.query_params:
            qs = qs.filter(test_case__project=self.request.query_params["project"])
        return qs


class DefectViewSet(RecordViewSet):
    queryset = Defect.objects.select_related("project", "test_case")
    serializer_class = DefectSerializer


class EvaluationViewSet(RecordViewSet):
    queryset = Evaluation.objects.select_related("project")
    serializer_class = EvaluationSerializer
