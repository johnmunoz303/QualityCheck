from django.conf import settings
from django.contrib.staticfiles.views import serve
from django.urls import include, path, re_path
from django.views.generic import TemplateView
from rest_framework.routers import DefaultRouter
from quality import views

router = DefaultRouter()
for prefix, view, name in [
    ("projects", views.ProjectViewSet, "project"),
    ("requirements", views.RequirementViewSet, "requirement"),
    ("test-cases", views.TestCaseViewSet, "testcase"),
    ("executions", views.ExecutionViewSet, "execution"),
    ("defects", views.DefectViewSet, "defect"),
    ("evaluations", views.EvaluationViewSet, "evaluation"),
]:
    router.register(prefix, view, basename=name)

urlpatterns = [
    path("api/session/", views.session_view),
    path("api/login/", views.login_view),
    path("api/logout/", views.logout_view),
    path("api/", include(router.urls)),
]
if settings.DEBUG:
    urlpatterns += [re_path(r"^assets/(?P<path>.*)$", serve)]
urlpatterns += [path("", TemplateView.as_view(template_name="index.html"))]
