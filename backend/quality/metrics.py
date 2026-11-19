from collections import Counter


def percentage(numerator, denominator):
    return round(100 * numerator / denominator, 1) if denominator else None


def project_metrics(project):
    cases = list(project.test_cases.prefetch_related("executions"))
    latest = [case.executions.first() for case in cases]
    results = Counter(e.result for e in latest if e)
    completed = results["APROBADO"] + results["FALLIDO"]
    verified = {
        case.requirement_id for case in cases if any(e.result in ("APROBADO", "FALLIDO") for e in case.executions.all())
    }
    defects = list(project.defects.all())
    unresolved = [d for d in defects if d.status != "RESUELTO"]
    resolved = sum(d.status == "RESUELTO" for d in defects)
    total_requirements = project.requirements.count()
    return {
        "requirements": total_requirements,
        "test_cases": len(cases),
        "completed": completed,
        "approved": results["APROBADO"],
        "failed": results["FALLIDO"],
        "blocked": results["BLOQUEADO"],
        "pending": sum(e is None for e in latest),
        "executions": sum(case.executions.count() for case in cases),
        "verified_requirements": len(verified),
        "approval_rate": percentage(results["APROBADO"], completed),
        "verification_rate": percentage(len(verified), total_requirements),
        "defects": len(defects),
        "resolved_defects": resolved,
        "unresolved_defects": len(unresolved),
        "resolution_rate": percentage(resolved, len(defects)),
        "open_by_severity": {
            s: sum(d.severity == s and d.status == "ABIERTO" for d in defects)
            for s in ["CRITICA", "ALTA", "MEDIA", "BAJA"]
        },
        "unresolved_by_severity": {
            s: sum(d.severity == s for d in unresolved) for s in ["CRITICA", "ALTA", "MEDIA", "BAJA"]
        },
        "evaluations": project.evaluations.count(),
        "characteristics_evaluated": project.evaluations.values("characteristic").distinct().count(),
    }
