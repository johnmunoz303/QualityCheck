import os
from datetime import timedelta
from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone
from quality.models import Defect, Evaluation, Execution, Project, Requirement, TestCase


class Command(BaseCommand):
    help = "Crea un administrador local y un proyecto ficticio. No modifica los registros existentes."

    @transaction.atomic
    def handle(self, *args, **options):
        user, created = get_user_model().objects.get_or_create(username="admin", defaults={"is_staff": True})
        if created:
            user.set_password(os.environ.get("QC_DEMO_PASSWORD", "QualityCheck2026!"))
            user.save()
            self.stdout.write("Administrador local creado. Consulte la contraseña inicial en README.md.")
        if Project.objects.filter(is_demo=True).exists():
            self.stdout.write("El proyecto de demostración ya existe; se conserva sin cambios.")
            return
        project = Project.objects.create(
            name="Inventario de una tienda",
            responsible="Equipo Alfa",
            is_demo=True,
            description="Caso ficticio para demostrar la trazabilidad y el ciclo de calidad de un inventario.",
            objective="Controlar productos, entradas, salidas y existencias sin permitir stock negativo.",
            scope="Registro y consulta de productos; movimientos de entrada y salida; consulta de existencias.",
            out_of_scope="Facturación, pagos, proveedores externos y desarrollo de un inventario completo.",
        )
        definitions = [
            (
                "RF-001",
                "Registrar productos con código único, nombre y precio válido.",
                "FUNCIONAL",
                "ALTA",
                "CUMPLIDO",
            ),
            ("RF-002", "Consultar productos por código o nombre.", "FUNCIONAL", "MEDIA", "CUMPLIDO"),
            ("RF-003", "Registrar entradas y actualizar las existencias.", "FUNCIONAL", "ALTA", "CUMPLIDO"),
            (
                "RF-004",
                "Registrar salidas sin permitir cantidades superiores al stock.",
                "FUNCIONAL",
                "ALTA",
                "EN_REVISION",
            ),
            ("RF-005", "Consultar el historial de movimientos de un producto.", "FUNCIONAL", "MEDIA", "PENDIENTE"),
            (
                "RNF-001",
                "Mostrar la consulta de productos en menos de 3 segundos en el entorno de prueba.",
                "NO_FUNCIONAL",
                "MEDIA",
                "CUMPLIDO",
            ),
            (
                "RNF-002",
                "Validar campos obligatorios, cantidades positivas y precios no negativos.",
                "NO_FUNCIONAL",
                "ALTA",
                "EN_REVISION",
            ),
            (
                "RNF-003",
                "Conservar productos y movimientos después de reiniciar la aplicación.",
                "NO_FUNCIONAL",
                "ALTA",
                "PENDIENTE",
            ),
        ]
        reqs = {}
        for code, desc, kind, priority, state in definitions:
            reqs[code] = Requirement.objects.create(
                project=project, code=code, description=desc, kind=kind, priority=priority, status=state
            )
        case_defs = [
            (
                "RF-001",
                "Registrar producto válido",
                "Código P-001, nombre Café, precio 12000",
                "1. Abrir Productos.\n2. Completar campos.\n3. Guardar.",
                "Producto guardado con su código único.",
                "APROBADO",
            ),
            (
                "RF-001",
                "Rechazar código duplicado",
                "Código P-001 existente",
                "1. Crear otro producto.\n2. Usar P-001.\n3. Guardar.",
                "Se informa que el código ya existe.",
                "APROBADO",
            ),
            (
                "RF-002",
                "Buscar producto por nombre",
                "Nombre Café",
                "1. Abrir consulta.\n2. Buscar Café.",
                "La lista contiene el producto Café.",
                "APROBADO",
            ),
            (
                "RF-003",
                "Registrar entrada de unidades",
                "Producto P-001; cantidad 5; stock inicial 10",
                "1. Seleccionar entrada.\n2. Ingresar cantidad 5.\n3. Confirmar.",
                "El stock cambia de 10 a 15.",
                "APROBADO",
            ),
            (
                "RF-004",
                "Registrar salida válida",
                "Producto P-001; stock 10; salida 3",
                "1. Seleccionar salida.\n2. Ingresar 3.\n3. Confirmar.",
                "Stock final 7 y movimiento registrado.",
                "APROBADO",
            ),
            (
                "RF-004",
                "Impedir salida superior al stock",
                "Stock 5; salida 8",
                "1. Seleccionar P-001.\n2. Intentar retirar 8.\n3. Confirmar.",
                "Operación rechazada, stock sin cambios.",
                "FALLIDO",
            ),
            (
                "RNF-001",
                "Medir respuesta de búsqueda",
                "Catálogo de 100 productos; búsqueda Café",
                "1. Repetir diez búsquedas.\n2. Registrar duración.\n3. Calcular promedio.",
                "Cada búsqueda tarda menos de 3 segundos.",
                "APROBADO",
            ),
            (
                "RNF-002",
                "Rechazar nombre vacío",
                "Nombre vacío; código P-002",
                "1. Abrir nuevo producto.\n2. Dejar nombre vacío.\n3. Guardar.",
                "Se solicita nombre y no se guarda.",
                "APROBADO",
            ),
            (
                "RF-003",
                "Conservar entrada y movimiento juntos",
                "Producto P-001; entrada 2",
                "1. Registrar entrada.\n2. Consultar stock.\n3. Consultar movimientos.",
                "Stock y movimiento se guardan en la misma operación.",
                "APROBADO",
            ),
            (
                "RNF-002",
                "Rechazar cantidad negativa",
                "Entrada -3",
                "1. Seleccionar entrada.\n2. Ingresar -3.\n3. Confirmar.",
                "Se rechaza la cantidad sin cambiar existencias.",
                "FALLIDO",
            ),
        ]
        cases = []
        now = timezone.now()
        for index, (req, objective, inputs, steps, expected, result) in enumerate(case_defs, 1):
            case = TestCase.objects.create(
                project=project,
                requirement=reqs[req],
                code=f"CP-{index:03}",
                objective=objective,
                preconditions="Escenario ficticio; catálogo inicial cargado.",
                input_data=inputs,
                steps=steps,
                expected_result=expected,
            )
            cases.append(case)
            Execution.objects.create(
                test_case=case,
                result=result,
                executor=["Laura", "Andrés", "Camila"][index % 3],
                actual_result=expected
                if result == "APROBADO"
                else "La operación inválida fue aceptada en el escenario simulado.",
                evidence="DEMOSTRACIÓN: resultado ficticio para ilustrar el uso de QualityCheck; no se ejecutó un inventario real.",
                observations="Registro de demostración, no evidencia real de pruebas.",
                performed_at=now - timedelta(hours=12 - index),
            )
        for code, case, title, severity, state, responsible in [
            ("DEF-001", cases[5], "Permite una salida superior al stock", "ALTA", "ABIERTO", "Andrés"),
            ("DEF-002", cases[9], "Acepta cantidades negativas en entradas", "ALTA", "EN_PROCESO", "Camila"),
            ("DEF-003", cases[1], "Mensaje de código duplicado poco claro", "BAJA", "RESUELTO", "Laura"),
        ]:
            Defect.objects.create(
                project=project,
                test_case=case,
                code=code,
                title=title,
                description="Hallazgo ficticio del caso de demostración.",
                steps=case.steps,
                expected_result=case.expected_result,
                actual_result=title,
                evidence="DEMOSTRACIÓN: evidencia textual simulada.",
                severity=severity,
                status=state,
                responsible=responsible,
                resolution="DEMOSTRACIÓN: mensaje ajustado y caso CP-002 repetido satisfactoriamente."
                if state == "RESUELTO"
                else "",
            )
        for char, criterion, method, indicator, target, observed, result, size, improvement in [
            (
                "FUNCIONAL",
                "Los casos funcionales priorizados deben aprobarse.",
                "Contar últimas ejecuciones concluyentes de los casos funcionales.",
                "Casos funcionales aprobados / ejecutados × 100",
                "100 %",
                "85,7 % (6 de 7)",
                "PARCIAL",
                7,
                "Corregir la validación de salidas y repetir CP-006.",
            ),
            (
                "DESEMPENO",
                "Todas las búsquedas deben responder en menos de 3 segundos.",
                "Cronometrar diez consultas bajo las mismas condiciones.",
                "Máximo de tiempos de búsqueda",
                "< 3 s",
                "2,8 s; promedio 2,4 s",
                "CUMPLE",
                10,
                "Repetir con un catálogo mayor.",
            ),
            (
                "MANTENIBILIDAD",
                "No debe haber hallazgos críticos en la revisión estática.",
                "Revisar separación por módulos y ejecutar una herramienta de análisis estático.",
                "Hallazgos críticos / menores",
                "0 críticos",
                "0 críticos; 4 menores",
                "CUMPLE",
                4,
                "Resolver los cuatro hallazgos menores y repetir la revisión.",
            ),
        ]:
            Evaluation.objects.create(
                project=project,
                characteristic=char,
                criterion=criterion,
                method=method,
                indicator=indicator,
                target=target,
                observed_value=observed,
                result=result,
                evidence="DEMOSTRACIÓN: cifras simuladas. No se realizaron estas mediciones sobre un inventario real.",
                environment="Escenario académico ficticio",
                sample_size=size,
                limitations="Datos simulados; no permiten concluir sobre la calidad de un producto real.",
                improvements=improvement,
                evaluator="Equipo Alfa",
            )
        self.stdout.write(
            self.style.SUCCESS(
                "Demostración creada: 8 requisitos, 10 casos, 10 ejecuciones, 3 defectos y 3 evaluaciones."
            )
        )
