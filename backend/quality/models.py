from django.db import models
from django.utils import timezone


class Project(models.Model):
    STATUS = [("EN_CURSO", "En curso"), ("EN_REVISION", "En revisión"), ("FINALIZADO", "Finalizado")]
    name = models.CharField("nombre", max_length=160)
    description = models.TextField("descripción")
    objective = models.TextField("objetivo", blank=True)
    scope = models.TextField("alcance", blank=True)
    out_of_scope = models.TextField("fuera de alcance", blank=True)
    responsible = models.CharField("responsable", max_length=120)
    status = models.CharField(max_length=20, choices=STATUS, default="EN_CURSO")
    is_demo = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at", "-id"]


class Requirement(models.Model):
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name="requirements")
    code = models.CharField("código", max_length=30)
    description = models.TextField("descripción")
    kind = models.CharField(choices=[("FUNCIONAL", "Funcional"), ("NO_FUNCIONAL", "No funcional")], max_length=20)
    priority = models.CharField(
        choices=[("ALTA", "Alta"), ("MEDIA", "Media"), ("BAJA", "Baja")], max_length=10, default="MEDIA"
    )
    status = models.CharField(
        choices=[("PENDIENTE", "Pendiente"), ("EN_REVISION", "En revisión"), ("CUMPLIDO", "Cumplido")],
        max_length=20,
        default="PENDIENTE",
    )

    class Meta:
        ordering = ["code", "id"]
        constraints = [models.UniqueConstraint(fields=["project", "code"], name="unique_requirement_project_code")]


class TestCase(models.Model):
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name="test_cases")
    requirement = models.ForeignKey(Requirement, on_delete=models.PROTECT, related_name="test_cases")
    code = models.CharField("código", max_length=30)
    objective = models.CharField("objetivo", max_length=240)
    preconditions = models.TextField("precondiciones")
    input_data = models.TextField("datos de entrada")
    steps = models.TextField("pasos")
    expected_result = models.TextField("resultado esperado")

    class Meta:
        ordering = ["code", "id"]
        constraints = [models.UniqueConstraint(fields=["project", "code"], name="unique_test_project_code")]


class Execution(models.Model):
    RESULT = [("APROBADO", "Aprobado"), ("FALLIDO", "Fallido"), ("BLOQUEADO", "Bloqueado")]
    test_case = models.ForeignKey(TestCase, on_delete=models.CASCADE, related_name="executions")
    result = models.CharField(choices=RESULT, max_length=15)
    executor = models.CharField("ejecutor", max_length=120)
    actual_result = models.TextField("resultado obtenido")
    observations = models.TextField("observaciones", blank=True)
    evidence = models.TextField("evidencia textual")
    performed_at = models.DateTimeField(default=timezone.now)

    class Meta:
        ordering = ["-performed_at", "-id"]


class Defect(models.Model):
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name="defects")
    test_case = models.ForeignKey(TestCase, on_delete=models.PROTECT, related_name="defects", null=True, blank=True)
    code = models.CharField("código", max_length=30)
    title = models.CharField("título", max_length=200)
    description = models.TextField("descripción")
    steps = models.TextField("pasos para reproducir")
    expected_result = models.TextField("resultado esperado")
    actual_result = models.TextField("resultado obtenido")
    evidence = models.TextField("evidencia textual")
    severity = models.CharField(
        choices=[("CRITICA", "Crítica"), ("ALTA", "Alta"), ("MEDIA", "Media"), ("BAJA", "Baja")], max_length=10
    )
    status = models.CharField(
        choices=[("ABIERTO", "Abierto"), ("EN_PROCESO", "En proceso"), ("RESUELTO", "Resuelto")],
        max_length=15,
        default="ABIERTO",
    )
    responsible = models.CharField("responsable", max_length=120)
    resolution = models.TextField("corrección y verificación", blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["code", "id"]
        constraints = [models.UniqueConstraint(fields=["project", "code"], name="unique_defect_project_code")]


class Evaluation(models.Model):
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name="evaluations")
    characteristic = models.CharField(
        choices=[
            ("FUNCIONAL", "Adecuación funcional"),
            ("DESEMPENO", "Eficiencia de desempeño"),
            ("MANTENIBILIDAD", "Mantenibilidad"),
        ],
        max_length=20,
    )
    standard = models.CharField(max_length=50, default="ISO/IEC 25010:2023")
    criterion = models.TextField("criterio observable")
    method = models.TextField("método de medición")
    indicator = models.CharField("indicador", max_length=200)
    target = models.CharField("meta", max_length=200)
    observed_value = models.CharField("valor observado", max_length=200)
    result = models.CharField(
        choices=[("CUMPLE", "Cumple"), ("PARCIAL", "Cumple parcialmente"), ("NO_CUMPLE", "No cumple")], max_length=15
    )
    evidence = models.TextField("evidencia")
    environment = models.CharField("ambiente", max_length=240)
    sample_size = models.PositiveIntegerField("tamaño de muestra", default=1)
    limitations = models.TextField("limitaciones")
    improvements = models.TextField("acciones de mejora", blank=True)
    evaluator = models.CharField("evaluador", max_length=120)
    measured_at = models.DateTimeField(default=timezone.now)

    class Meta:
        ordering = ["characteristic", "-measured_at", "-id"]
