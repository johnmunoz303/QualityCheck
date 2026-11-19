from datetime import timedelta
from django.contrib.auth import get_user_model
from django.core.management import call_command
from django.test import TestCase as DjangoTestCase
from django.utils import timezone
from rest_framework.test import APIClient
from .metrics import percentage, project_metrics
from .models import Defect, Evaluation, Execution, Project, Requirement, TestCase


class QualityCheckTests(DjangoTestCase):
    def setUp(self):
        self.user = get_user_model().objects.create_user(username="tester", password="Test-Quality2026!")
        self.client = APIClient()
        self.client.force_authenticate(self.user)
        self.project = Project.objects.create(name="Pruebas", description="Proyecto de prueba", responsible="Equipo")
        self.req = Requirement.objects.create(
            project=self.project, code="RF-001", description="Guardar", kind="FUNCIONAL"
        )
        self.case = TestCase.objects.create(
            project=self.project,
            requirement=self.req,
            code="CP-001",
            objective="Guardar válido",
            preconditions="Abierto",
            input_data="Datos",
            steps="Guardar",
            expected_result="Guardado",
        )

    def execution(self, result, **kwargs):
        return Execution.objects.create(
            test_case=self.case,
            result=result,
            executor="Tester",
            actual_result="Observado",
            evidence="Evidencia de prueba",
            **kwargs,
        )

    def defect_data(self, **kwargs):
        return dict(
            project=self.project.id,
            code="DEF-001",
            title="Fallo",
            description="Descripción",
            steps="Reproducir",
            expected_result="Esperado",
            actual_result="Obtenido",
            evidence="Registro",
            severity="ALTA",
            responsible="Tester",
            **kwargs,
        )

    def test_01_authentication_required(self):
        client = APIClient()
        self.assertEqual(client.get("/api/projects/").status_code, 403)

    def test_02_login_and_logout(self):
        client = APIClient(enforce_csrf_checks=True)
        self.assertEqual(client.get("/api/session/").status_code, 200)
        csrf = client.cookies["csrftoken"].value
        response = client.post(
            "/api/login/", {"username": "tester", "password": "Test-Quality2026!"}, format="json", HTTP_X_CSRFTOKEN=csrf
        )
        self.assertEqual(response.status_code, 200)
        self.assertTrue(client.get("/api/session/").json()["authenticated"])
        csrf = client.cookies["csrftoken"].value
        self.assertEqual(client.post("/api/logout/", {}, format="json", HTTP_X_CSRFTOKEN=csrf).status_code, 200)
        self.assertFalse(client.get("/api/session/").json()["authenticated"])

    def test_03_csrf_rejects_unprotected_login(self):
        client = APIClient(enforce_csrf_checks=True)
        response = client.post("/api/login/", {"username": "tester", "password": "Test-Quality2026!"})
        self.assertEqual(response.status_code, 403)

    def test_04_create_project_and_read_persisted_data(self):
        response = self.client.post(
            "/api/projects/", {"name": "Nuevo", "description": "Descripción", "responsible": "Ana"}, format="json"
        )
        self.assertEqual(response.status_code, 201)
        project_id = response.json()["id"]
        self.assertEqual(Project.objects.get(pk=project_id).name, "Nuevo")
        self.assertEqual(self.client.get(f"/api/projects/{project_id}/").json()["name"], "Nuevo")

    def test_05_required_fields_and_choices(self):
        self.assertEqual(self.client.post("/api/projects/", {"name": " "}, format="json").status_code, 400)
        self.assertEqual(
            self.client.patch(f"/api/projects/{self.project.id}/", {"status": "INVALIDO"}, format="json").status_code,
            400,
        )

    def test_06_edit_and_close_project(self):
        response = self.client.patch(
            f"/api/projects/{self.project.id}/", {"name": "Editado", "status": "FINALIZADO"}, format="json"
        )
        self.assertEqual(response.status_code, 200)
        self.project.refresh_from_db()
        self.assertEqual(self.project.status, "FINALIZADO")

    def test_07_requirement_unique_within_project(self):
        payload = {"project": self.project.id, "code": "RF-001", "description": "Otro", "kind": "FUNCIONAL"}
        self.assertEqual(self.client.post("/api/requirements/", payload, format="json").status_code, 400)

    def test_08_reject_cross_project_test_case(self):
        other = Project.objects.create(name="Otro", description="Otro", responsible="Ana")
        response = self.client.patch(f"/api/test-cases/{self.case.id}/", {"project": other.id}, format="json")
        self.assertEqual(response.status_code, 400)

    def test_09_traceability_shows_associated_cases(self):
        data = self.client.get(f"/api/requirements/{self.req.id}/").json()
        self.assertEqual(data["test_case_codes"], ["CP-001"])

    def test_10_execute_and_preserve_history(self):
        for result in ["FALLIDO", "APROBADO"]:
            response = self.client.post(
                "/api/executions/",
                {
                    "test_case": self.case.id,
                    "result": result,
                    "executor": "Ana",
                    "actual_result": "Obtenido",
                    "evidence": "Evidencia",
                },
                format="json",
            )
            self.assertEqual(response.status_code, 201)
        data = self.client.get(f"/api/test-cases/{self.case.id}/").json()
        self.assertEqual(data["execution_count"], 2)
        self.assertEqual(data["latest_execution"]["result"], "APROBADO")

    def test_11_executions_cannot_be_overwritten(self):
        entry = self.execution("FALLIDO")
        self.assertEqual(self.client.patch(f"/api/executions/{entry.id}/", {"result": "APROBADO"}).status_code, 405)

    def test_12_future_execution_rejected(self):
        response = self.client.post(
            "/api/executions/",
            {
                "test_case": self.case.id,
                "result": "APROBADO",
                "executor": "Ana",
                "actual_result": "Bien",
                "evidence": "Prueba",
                "performed_at": (timezone.now() + timedelta(days=1)).isoformat(),
            },
            format="json",
        )
        self.assertEqual(response.status_code, 400)

    def test_13_defect_creation_and_filtering(self):
        response = self.client.post("/api/defects/", self.defect_data(test_case=self.case.id), format="json")
        self.assertEqual(response.status_code, 201)
        url = f"/api/defects/?project={self.project.id}&severity=ALTA&status=ABIERTO&responsible=Tester"
        self.assertEqual(len(self.client.get(url).json()), 1)
        self.assertEqual(len(self.client.get("/api/defects/?severity=BAJA").json()), 0)

    def test_14_resolution_requires_evidence(self):
        payload = self.defect_data(status="RESUELTO")
        self.assertEqual(self.client.post("/api/defects/", payload, format="json").status_code, 400)
        payload["resolution"] = "Validación corregida y prueba repetida satisfactoriamente."
        self.assertEqual(self.client.post("/api/defects/", payload, format="json").status_code, 201)

    def test_15_cross_project_defect_rejected(self):
        other = Project.objects.create(name="Otro", description="Otro", responsible="Ana")
        payload = self.defect_data(test_case=self.case.id)
        payload["project"] = other.id
        self.assertEqual(self.client.post("/api/defects/", payload, format="json").status_code, 400)

    def test_16_empty_denominators(self):
        empty = Project.objects.create(name="Vacío", description="Sin datos", responsible="Ana")
        metrics = project_metrics(empty)
        self.assertIsNone(metrics["approval_rate"])
        self.assertIsNone(metrics["verification_rate"])
        self.assertIsNone(metrics["resolution_rate"])
        self.assertEqual(percentage(1, 3), 33.3)

    def test_17_latest_execution_determines_approval(self):
        self.execution("FALLIDO")
        self.execution("APROBADO")
        metrics = project_metrics(self.project)
        self.assertEqual(metrics["approval_rate"], 100)
        self.assertEqual(metrics["completed"], 1)
        self.assertEqual(metrics["executions"], 2)

    def test_18_blocked_is_not_conclusive_or_verified(self):
        self.execution("BLOQUEADO")
        metrics = project_metrics(self.project)
        self.assertIsNone(metrics["approval_rate"])
        self.assertEqual(metrics["verification_rate"], 0)
        self.assertEqual(metrics["blocked"], 1)

    def test_19_failed_still_counts_as_coverage(self):
        self.execution("FALLIDO")
        metrics = project_metrics(self.project)
        self.assertEqual(metrics["verification_rate"], 100)
        self.assertEqual(metrics["approval_rate"], 0)

    def test_20_resolved_defects_metrics(self):
        payload = self.defect_data(status="RESUELTO", resolution="Corregido y probado")
        payload.pop("project")
        Defect.objects.create(project=self.project, **payload)
        self.assertEqual(project_metrics(self.project)["resolution_rate"], 100)

    def test_21_evaluation_sample_validation(self):
        response = self.client.post("/api/evaluations/", {"sample_size": 0}, format="json")
        self.assertEqual(response.status_code, 400)
        self.assertIn("sample_size", response.json())

    def test_22_report_contains_complete_history(self):
        self.execution("FALLIDO")
        self.execution("APROBADO")
        data = self.client.get(f"/api/projects/{self.project.id}/report/").json()
        self.assertEqual(len(data["executions"]), 2)
        self.assertEqual(data["test_cases"][0]["requirement_code"], "RF-001")

    def test_23_project_filter_separates_data(self):
        other = Project.objects.create(name="Otro", description="Otro", responsible="Ana")
        Requirement.objects.create(project=other, code="RF-001", description="Otro", kind="FUNCIONAL")
        data = self.client.get(f"/api/requirements/?project={self.project.id}").json()
        self.assertEqual(len(data), 1)
        self.assertEqual(data[0]["project"], self.project.id)

    def test_24_seed_is_idempotent_and_demo_metrics_match(self):
        call_command("seed_demo", verbosity=0)
        call_command("seed_demo", verbosity=0)
        self.assertEqual(Project.objects.filter(is_demo=True).count(), 1)
        demo = Project.objects.get(is_demo=True)
        metrics = project_metrics(demo)
        self.assertEqual(metrics["test_cases"], 10)
        self.assertEqual(metrics["approval_rate"], 80)
        self.assertEqual(metrics["verification_rate"], 75)
        self.assertEqual(metrics["resolution_rate"], 33.3)

    def test_25_requirement_cannot_move_between_projects(self):
        other = Project.objects.create(name="Otro", description="Otro", responsible="Ana")
        response = self.client.patch(f"/api/requirements/{self.req.id}/", {"project": other.id}, format="json")
        self.assertEqual(response.status_code, 400)

    def test_26_create_complete_evaluation(self):
        payload = dict(
            project=self.project.id,
            characteristic="FUNCIONAL",
            criterion="Todos los casos aprobados",
            method="Contar resultados",
            indicator="Tasa de aprobación",
            target="100 %",
            observed_value="0 %",
            result="NO_CUMPLE",
            evidence="CP-001 fallido",
            environment="SQLite de pruebas",
            sample_size=1,
            limitations="Un solo caso",
            improvements="Corregir defecto",
            evaluator="Ana",
        )
        response = self.client.post("/api/evaluations/", payload, format="json")
        self.assertEqual(response.status_code, 201)
        self.assertEqual(Evaluation.objects.get(pk=response.json()["id"]).observed_value, "0 %")

    def test_27_invalid_project_filters_return_validation_error(self):
        for endpoint in ["requirements", "test-cases", "defects", "evaluations", "executions"]:
            self.assertEqual(self.client.get(f"/api/{endpoint}/?project=invalido").status_code, 400)

    def test_28_same_requirement_code_allowed_in_different_project(self):
        other = Project.objects.create(name="Otro", description="Otro", responsible="Ana")
        payload = dict(project=other.id, code="RF-001", description="Otro requisito", kind="FUNCIONAL")
        self.assertEqual(self.client.post("/api/requirements/", payload, format="json").status_code, 201)

    def test_29_latest_blocked_retains_historical_coverage(self):
        self.execution("APROBADO")
        self.execution("BLOQUEADO")
        metrics = project_metrics(self.project)
        self.assertIsNone(metrics["approval_rate"])
        self.assertEqual(metrics["verification_rate"], 100)

    def test_30_recent_tie_resolves_by_execution_id(self):
        at = timezone.now() - timedelta(minutes=1)
        self.execution("FALLIDO", performed_at=at)
        self.execution("APROBADO", performed_at=at)
        self.assertEqual(project_metrics(self.project)["approval_rate"], 100)
