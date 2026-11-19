"""Recorrido HTTP real sobre una copia temporal de SQLite. No altera los proyectos del usuario."""

import http.cookiejar
from contextlib import closing
import json
import os
from pathlib import Path
import re
import sqlite3
import sys
import tempfile
import threading
import urllib.error
import urllib.request
from wsgiref.simple_server import make_server

ROOT = Path(__file__).resolve().parent.parent


def main():
    with tempfile.TemporaryDirectory(prefix="qualitycheck-http-") as temp:
        database = Path(temp) / "test.sqlite3"
        with closing(sqlite3.connect(ROOT / "backend" / "db.sqlite3")) as source:
            with closing(sqlite3.connect(database)) as destination:
                source.backup(destination)
        os.environ["QC_DATABASE_PATH"] = str(database)
        os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
        sys.path.insert(0, str(ROOT / "backend"))
        import django

        django.setup()
        from django.core.wsgi import get_wsgi_application
        from django.db import connections

        server = make_server("127.0.0.1", 0, get_wsgi_application())
        thread = threading.Thread(target=server.serve_forever, daemon=True)
        thread.start()
        base = f"http://127.0.0.1:{server.server_port}"
        jar = http.cookiejar.CookieJar()
        client = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(jar))
        steps = []

        def request(path, method="GET", payload=None, expected=200, parse=True):
            headers = {"Content-Type": "application/json"}
            for cookie in jar:
                if cookie.name == "csrftoken":
                    headers["X-CSRFToken"] = cookie.value
            req = urllib.request.Request(
                base + path,
                data=json.dumps(payload).encode() if payload is not None else None,
                method=method,
                headers=headers,
            )
            try:
                response = client.open(req, timeout=5)
            except urllib.error.HTTPError as error:
                response = error
            with response:
                content = response.read().decode("utf-8")
                if response.status != expected:
                    raise AssertionError(f"{method} {path}: {response.status}; esperado {expected}: {content[:300]}")
                steps.append(
                    {"method": method, "path": path, "expected": expected, "actual": response.status, "passed": True}
                )
                return json.loads(content) if parse else content

        try:
            html = request("/", parse=False)
            for asset in re.findall(r'(?:src|href)="(/assets/[^\"]+)"', html):
                request(asset, parse=False)
            request("/api/projects/", expected=403)
            request("/api/session/")
            request(
                "/api/login/",
                "POST",
                {"username": "admin", "password": os.environ.get("QC_DEMO_PASSWORD", "QualityCheck2026!")},
            )
            project = request(
                "/api/projects/",
                "POST",
                {
                    "name": "HTTP real · verificación",
                    "description": "Proyecto temporal de prueba",
                    "responsible": "Verificación automatizada",
                },
                201,
            )
            project_id = project["id"]
            req = request(
                "/api/requirements/",
                "POST",
                {
                    "project": project_id,
                    "code": "RF-001",
                    "description": "Guardar y recuperar información",
                    "kind": "FUNCIONAL",
                },
                201,
            )
            case = request(
                "/api/test-cases/",
                "POST",
                {
                    "project": project_id,
                    "requirement": req["id"],
                    "code": "CP-001",
                    "objective": "Verificar persistencia por API",
                    "preconditions": "Sesión activa",
                    "input_data": "Proyecto temporal",
                    "steps": "Crear y consultar",
                    "expected_result": "Datos recuperados",
                },
                201,
            )
            for result in ["FALLIDO", "APROBADO"]:
                request(
                    "/api/executions/",
                    "POST",
                    {
                        "test_case": case["id"],
                        "result": result,
                        "executor": "Prueba HTTP",
                        "actual_result": "Resultado de control de la prueba de API",
                        "evidence": "Petición HTTP respondida y contenido validado",
                    },
                    201,
                )
            defect = request(
                "/api/defects/",
                "POST",
                {
                    "project": project_id,
                    "test_case": case["id"],
                    "code": "DEF-001",
                    "title": "Defecto de control",
                    "description": "Registro para verificar seguimiento",
                    "steps": "Crear y resolver",
                    "expected_result": "Resolución con evidencia",
                    "actual_result": "Registro creado",
                    "evidence": "Petición HTTP",
                    "severity": "ALTA",
                    "responsible": "Prueba HTTP",
                },
                201,
            )
            request(f"/api/defects/{defect['id']}/", "PATCH", {"status": "RESUELTO"}, 400)
            request(
                f"/api/defects/{defect['id']}/",
                "PATCH",
                {"status": "RESUELTO", "resolution": "Verificación de validación completada por HTTP"},
            )
            request(
                "/api/evaluations/",
                "POST",
                {
                    "project": project_id,
                    "characteristic": "FUNCIONAL",
                    "criterion": "Recorrido HTTP completo",
                    "method": "Solicitudes HTTP con sesión y CSRF",
                    "indicator": "Pasos con respuesta esperada",
                    "target": "100 %",
                    "observed_value": "Pasos comprobados",
                    "result": "CUMPLE",
                    "evidence": "http-integracion.json",
                    "environment": "Servidor WSGI local; SQLite temporal",
                    "sample_size": 1,
                    "limitations": "No incluye navegador real",
                    "evaluator": "Verificación automatizada",
                },
                201,
            )
            metrics = request(f"/api/projects/{project_id}/metrics/")
            assert metrics["approval_rate"] == 100 and metrics["resolution_rate"] == 100
            assert metrics["verification_rate"] == 100 and metrics["executions"] == 2
            report = request(f"/api/projects/{project_id}/report/")
            assert len(report["executions"]) == 2
            request("/api/logout/", "POST", {})
            request("/api/projects/", expected=403)
            evidence = {
                "successful": True,
                "steps": steps,
                "metric_assertions": metrics,
                "scope": "HTTP real, sesión, CSRF, recursos React compilados y recorrido completo sobre SQLite temporal; no navegador.",
            }
            (ROOT / "docs" / "evidencias" / "http-integracion.json").write_text(
                json.dumps(evidence, ensure_ascii=False, indent=2), encoding="utf-8"
            )
            print(f"{len(steps)} comprobaciones HTTP correctas; métricas e historial verificados.")
        finally:
            server.shutdown()
            thread.join(timeout=5)
            server.server_close()
            connections.close_all()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
