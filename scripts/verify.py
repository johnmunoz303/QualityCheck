"""Ejecuta pruebas y guarda evidencia real; no modifica los datos del proyecto de demostración."""

import io
import json
import os
import platform
import subprocess
import sys
import time
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "backend"))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")


def main():
    import django

    django.setup()
    from django.contrib.auth import get_user_model
    from django.test.runner import DiscoverRunner
    from rest_framework.test import APIClient
    from quality.models import Project

    output = ROOT / "docs" / "evidencias"
    output.mkdir(parents=True, exist_ok=True)
    log = io.StringIO()
    runner = DiscoverRunner(verbosity=2, interactive=False)
    suite = runner.build_suite(["quality"])
    old_config = runner.setup_databases()
    try:
        import unittest

        result = unittest.TextTestRunner(stream=log, verbosity=2).run(suite)
    finally:
        runner.teardown_databases(old_config)
        from django.db import connections

        connections.close_all()
    (output / "pruebas-automatizadas.txt").write_text(log.getvalue(), encoding="utf-8")
    user = get_user_model().objects.filter(username="admin").first()
    project = Project.objects.filter(is_demo=True).first()
    if not user or not project:
        raise SystemExit("Ejecute migrate y seed_demo antes de verificar.")
    client = APIClient()
    client.force_authenticate(user)
    timings = {}
    for endpoint in ["/api/projects/", f"/api/projects/{project.id}/metrics/", f"/api/projects/{project.id}/report/"]:
        samples = []
        for _ in range(30):
            started = time.perf_counter()
            response = client.get(endpoint)
            if response.status_code != 200:
                raise RuntimeError(f"{endpoint}: HTTP {response.status_code}")
            samples.append((time.perf_counter() - started) * 1000)
        timings[endpoint] = {
            "n": len(samples),
            "mean_ms": round(sum(samples) / len(samples), 3),
            "max_ms": round(max(samples), 3),
            "p95_ms": round(sorted(samples)[28], 3),
        }
    # Un intérprete nuevo vuelve a leer la misma base de datos en disco.
    code = (
        "import os,django;os.environ['DJANGO_SETTINGS_MODULE']='config.settings';django.setup();"
        "from quality.models import Project;"
        f"p=Project.objects.get(pk={project.id});print(p.name)"
    )
    child = subprocess.run(
        [sys.executable, "-c", code], cwd=ROOT / "backend", capture_output=True, text=True, check=True
    )
    persisted = child.stdout.strip() == project.name
    summary = {
        "generated_at_utc": datetime.now(timezone.utc).isoformat(),
        "environment": {
            "python": platform.python_version(),
            "django": django.get_version(),
            "os": platform.platform(),
            "database": "SQLite en disco para mediciones; SQLite aislada para pruebas automatizadas",
        },
        "tests": {
            "run": result.testsRun,
            "failures": len(result.failures),
            "errors": len(result.errors),
            "skipped": len(result.skipped),
            "successful": result.wasSuccessful(),
        },
        "persistent_read_new_process": persisted,
        "response_times": timings,
        "performance_method": "Django APIClient dentro del proceso; 30 consultas por endpoint; sin red, navegador ni concurrencia.",
        "quality_criteria": {
            "functional": "100 % de pruebas automatizadas aprobadas",
            "performance": "Máximo < 3000 ms por operación en esta muestra local",
            "maintainability": "Cero hallazgos Ruff E4,E7,E9,F; revisión modular documentada por separado",
        },
        "limitations": [
            "No se verificó la interfaz en navegador: el entorno bloquea la conexión a localhost.",
            "Muestra pequeña; no representa carga real ni garantiza tiempos en otro equipo.",
            "Las pruebas automatizadas cubren API y lógica; no sustituyen una prueba manual de React.",
        ],
    }
    (output / "verificacion.json").write_text(json.dumps(summary, ensure_ascii=False, indent=2), encoding="utf-8")
    (output / "informe-demo.json").write_text(
        json.dumps(client.get(f"/api/projects/{project.id}/report/").json(), ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    print(json.dumps(summary, ensure_ascii=False, indent=2))
    return 0 if result.wasSuccessful() and persisted else 1


if __name__ == "__main__":
    raise SystemExit(main())
