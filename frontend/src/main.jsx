import React, { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  Activity,
  ArrowDownToLine,
  ArrowRight,
  BookOpen,
  Check,
  CheckCheck,
  ChevronRight,
  CircleHelp,
  ClipboardCheck,
  FileBarChart2,
  FlaskConical,
  FolderKanban,
  LayoutDashboard,
  LogOut,
  Menu,
  Pencil,
  Play,
  Plus,
  Search,
  ShieldCheck,
  TriangleAlert,
  X,
} from "lucide-react";
import "./styles.css";

const labels = {
  EN_CURSO: "En curso",
  EN_REVISION: "En revisión",
  FINALIZADO: "Finalizado",
  FUNCIONAL: "Funcional",
  NO_FUNCIONAL: "No funcional",
  ALTA: "Alta",
  MEDIA: "Media",
  BAJA: "Baja",
  CRITICA: "Crítica",
  PENDIENTE: "Pendiente",
  CUMPLIDO: "Cumplido",
  APROBADO: "Aprobado",
  FALLIDO: "Fallido",
  BLOQUEADO: "Bloqueado",
  ABIERTO: "Abierto",
  EN_PROCESO: "En proceso",
  RESUELTO: "Resuelto",
  DESEMPENO: "Eficiencia de desempeño",
  MANTENIBILIDAD: "Mantenibilidad",
  CUMPLE: "Cumple",
  PARCIAL: "Cumple parcialmente",
  NO_CUMPLE: "No cumple",
};
const characteristic = (value) =>
  value === "FUNCIONAL" ? "Adecuación funcional" : labels[value];
const names = {
  project: "Proyecto",
  name: "Nombre",
  description: "Descripción",
  objective: "Objetivo",
  scope: "Alcance",
  out_of_scope: "Fuera de alcance",
  responsible: "Responsable",
  status: "Estado",
  code: "Código",
  kind: "Tipo",
  priority: "Prioridad",
  requirement: "Requisito",
  preconditions: "Precondiciones",
  input_data: "Datos de entrada",
  steps: "Pasos",
  expected_result: "Resultado esperado",
  test_case: "Caso de prueba",
  result: "Resultado",
  executor: "Ejecutor",
  actual_result: "Resultado obtenido",
  observations: "Observaciones",
  evidence: "Evidencia textual",
  title: "Título",
  severity: "Severidad",
  resolution: "Corrección y verificación",
  characteristic: "Característica",
  standard: "Edición de referencia",
  criterion: "Criterio observable",
  method: "Método de medición",
  indicator: "Indicador",
  target: "Meta",
  observed_value: "Valor observado",
  environment: "Ambiente de medición",
  sample_size: "Tamaño de muestra",
  limitations: "Limitaciones",
  improvements: "Acciones de mejora",
  evaluator: "Evaluador",
};
const navigation = [
  ["dashboard", "Panel general", LayoutDashboard],
  ["projects", "Proyectos", FolderKanban],
  ["requirements", "Requisitos", BookOpen],
  ["test-cases", "Casos de prueba", FlaskConical],
  ["defects", "Defectos", TriangleAlert],
  ["evaluations", "Evaluación de calidad", ShieldCheck],
  ["report", "Informe del proyecto", FileBarChart2],
];
const titleMap = {
  dashboard: [
    "Una vista clara de tu calidad.",
    "Sigue las pruebas, identifica riesgos y decide el siguiente paso.",
  ],
  projects: [
    "Proyectos",
    "Organiza los proyectos y centraliza sus evidencias de calidad.",
  ],
  requirements: [
    "Requisitos",
    "Define qué debe cumplir el producto y conserva su trazabilidad.",
  ],
  "test-cases": [
    "Casos de prueba",
    "Diseña, ejecuta y consulta el historial de cada verificación.",
  ],
  defects: ["Defectos", "Documenta los hallazgos y sigue su corrección."],
  evaluations: [
    "Evaluación de calidad",
    "Convierte los criterios de calidad en resultados verificables.",
  ],
  report: [
    "Informe del proyecto",
    "Reúne los indicadores, las evidencias y las mejoras pendientes.",
  ],
};
const endpoints = [
  "requirements",
  "test-cases",
  "defects",
  "evaluations",
  "executions",
];
const options = (values) => values.map((v) => [v, labels[v] || v]);
const field = (name, type = "text", extra = {}) => ({
  name,
  label: names[name],
  type,
  required: true,
  ...extra,
});
const statusOptions = options(["EN_CURSO", "EN_REVISION", "FINALIZADO"]);
const initialData = () => Object.fromEntries(endpoints.map((x) => [x, []]));
function csrf() {
  return (
    document.cookie
      .split("; ")
      .find((v) => v.startsWith("csrftoken="))
      ?.split("=")[1] || ""
  );
}
async function api(path, method = "GET", data) {
  const response = await fetch("/api/" + path, {
    method,
    credentials: "same-origin",
    headers: { "Content-Type": "application/json", "X-CSRFToken": csrf() },
    ...(data ? { body: JSON.stringify(data) } : {}),
  });
  const body = await response
    .json()
    .catch(() => ({
      detail: "El servidor devolvió una respuesta inesperada.",
    }));
  if (!response.ok) {
    const error = new Error(
      body.detail || "No se pudo completar la operación.",
    );
    error.fields = body;
    error.status = response.status;
    throw error;
  }
  return body;
}
const fmtDate = (v) =>
  v
    ? new Intl.DateTimeFormat("es-CO", {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(new Date(v))
    : "—";
const percent = (v) =>
  v == null ? "Sin datos" : `${v.toLocaleString("es-CO")} %`;
function Badge({ value }) {
  return (
    <span className={`badge ${value?.toLowerCase() || "pendiente"}`}>
      <i />
      {labels[value] || value || "Sin ejecutar"}
    </span>
  );
}
function Empty({
  title = "Todavía no hay registros",
  text = "Crea el primer registro para comenzar.",
  action,
}) {
  return (
    <div className="empty">
      <ClipboardCheck size={32} />
      <h3>{title}</h3>
      <p>{text}</p>
      {action}
    </div>
  );
}
function Button({ children, icon: Icon = Plus, secondary = false, ...props }) {
  return (
    <button className={secondary ? "button secondary" : "button"} {...props}>
      <Icon size={16} />
      {children}
    </button>
  );
}
function Modal({ title, children, onClose, wide = false }) {
  const ref = useRef(null);
  useEffect(() => {
    const old = document.activeElement;
    ref.current?.focus();
    const listener = (e) => {
      if (e.key === "Escape") onClose();
      if (e.key === "Tab") {
        const nodes = ref.current.querySelectorAll(
          'button:not(:disabled),input,select,textarea,[tabindex="0"]',
        );
        if (!nodes.length) return;
        const first = nodes[0],
          last = nodes[nodes.length - 1];
        if (
          e.shiftKey &&
          (document.activeElement === first ||
            document.activeElement === ref.current)
        ) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", listener);
    return () => {
      document.removeEventListener("keydown", listener);
      old?.focus();
    };
  }, []);
  return (
    <div
      className="overlay"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <section
        className={`modal ${wide ? "wide" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="dialog-title"
        tabIndex={-1}
        ref={ref}
      >
        <div className="modal-head">
          <div>
            <span className="eyebrow">QUALITYCHECK / REGISTRO</span>
            <h2 id="dialog-title">{title}</h2>
          </div>
          <button className="icon-button" aria-label="Cerrar" onClick={onClose}>
            <X size={20} />
          </button>
        </div>
        {children}
      </section>
    </div>
  );
}
function RecordForm({ schema, initial, onSave, onClose }) {
  const [values, setValues] = useState(() =>
    Object.fromEntries(
      schema.map((f) => [
        f.name,
        initial?.[f.name] ??
          f.default ??
          (f.type === "select" && f.required ? f.options[0]?.[0] : ""),
      ]),
    ),
  );
  const [errors, setErrors] = useState({}),
    [saving, setSaving] = useState(false);
  async function submit(e) {
    e.preventDefault();
    setSaving(true);
    setErrors({});
    try {
      const payload = { ...values };
      schema.forEach((f) => {
        if (f.type === "number") payload[f.name] = Number(payload[f.name]);
        if (f.nullable && !payload[f.name]) payload[f.name] = null;
      });
      await onSave(payload);
    } catch (err) {
      setErrors(err.fields || { detail: err.message });
    } finally {
      setSaving(false);
    }
  }
  return (
    <form onSubmit={submit}>
      <div className="form-grid">
        {schema.map((f) => (
          <label
            key={f.name}
            className={f.type === "textarea" ? "span-2" : ""}
            htmlFor={`field-${f.name}`}
          >
            <span>
              {f.label}
              {f.required && <b aria-hidden="true"> *</b>}
            </span>
            {f.type === "textarea" ? (
              <textarea
                id={`field-${f.name}`}
                required={f.required}
                rows={3}
                value={values[f.name]}
                onChange={(e) =>
                  setValues({ ...values, [f.name]: e.target.value })
                }
              />
            ) : f.type === "select" ? (
              <select
                id={`field-${f.name}`}
                required={f.required}
                value={values[f.name] ?? ""}
                onChange={(e) =>
                  setValues({ ...values, [f.name]: e.target.value })
                }
              >
                {!f.required && <option value="">Sin asociar</option>}
                {f.options.map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
              </select>
            ) : (
              <input
                id={`field-${f.name}`}
                type={f.type}
                required={f.required}
                maxLength={f.maxLength || undefined}
                min={f.type === "number" ? 1 : undefined}
                value={values[f.name]}
                onChange={(e) =>
                  setValues({ ...values, [f.name]: e.target.value })
                }
              />
            )}{" "}
            {errors[f.name] && (
              <small className="field-error">{String(errors[f.name])}</small>
            )}
          </label>
        ))}
      </div>
      {Object.entries(errors)
        .filter(([k]) => !schema.some((f) => f.name === k))
        .map(([k, v]) => (
          <p role="alert" className="field-error" key={k}>
            {k === "non_field_errors"
              ? "Datos duplicados o incompatibles"
              : k === "detail"
                ? ""
                : names[k] || k}
            : {String(v)}
          </p>
        ))}
      <div className="modal-footer">
        <button type="button" className="button secondary" onClick={onClose}>
          Cancelar
        </button>
        <Button type="submit" icon={Check} disabled={saving}>
          {saving ? "Guardando…" : "Guardar registro"}
        </Button>
      </div>
    </form>
  );
}
function Login({ onLogin }) {
  const [username, setUsername] = useState(""),
    [password, setPassword] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  return (
    <main className="login-layout">
      <section className="login-story">
        <div className="brand">
          <div className="brand-icon">
            <ShieldCheck />
          </div>
          <span>
            QualityCheck<b>SOFTWARE QUALITY WORKSPACE</b>
          </span>
        </div>
        <div>
          <span className="eyebrow light">DEL REQUISITO A LA EVIDENCIA</span>
          <h1>
            La calidad se construye.
            <br />
            <em>Y se demuestra.</em>
          </h1>
          <p>
            Conecta requisitos, pruebas y defectos en un solo lugar. Toma
            decisiones respaldadas por evidencias.
          </p>
          <div className="login-flow">
            <span>01 / Define</span>
            <ArrowRight size={18} />
            <span>02 / Verifica</span>
            <ArrowRight size={18} />
            <span>03 / Mejora</span>
          </div>
        </div>
        <small>Proyecto académico · Calidad de Software</small>
      </section>
      <section className="login-form">
        <div>
          <span className="eyebrow">TU ESPACIO DE TRABAJO</span>
          <h2>Bienvenido a QualityCheck</h2>
          <p>Ingresa para continuar con tus proyectos.</p>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              setBusy(true);
              setError("");
              try {
                await api("login/", "POST", { username, password });
                await onLogin();
              } catch (e) {
                setError(e.message);
              } finally {
                setBusy(false);
              }
            }}
          >
            <label htmlFor="username">
              Usuario
              <input
                id="username"
                autoComplete="username"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </label>
            <label htmlFor="password">
              Contraseña
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </label>
            {error && (
              <p className="field-error" role="alert">
                {error}
              </p>
            )}
            <Button icon={ArrowRight} disabled={busy}>
              {busy ? "Ingresando…" : "Ingresar al espacio"}
            </Button>
          </form>
          <div className="login-note">
            <ShieldCheck size={20} />
            <span>
              Los registros se conservan en la base de datos del proyecto.
            </span>
          </div>
        </div>
      </section>
    </main>
  );
}
export function App() {
  const [session, setSession] = useState(null),
    [initializing, setInitializing] = useState(true),
    [projects, setProjects] = useState([]),
    [projectId, setProjectId] = useState(
      () => localStorage.getItem("qc-project") || "",
    ),
    [nav, setNav] = useState("dashboard"),
    [data, setData] = useState(initialData),
    [metrics, setMetrics] = useState(null),
    [loading, setLoading] = useState(false),
    [error, setError] = useState(""),
    [toast, setToast] = useState(""),
    [modal, setModal] = useState(null),
    [search, setSearch] = useState(""),
    [status, setStatus] = useState(""),
    [severity, setSeverity] = useState(""),
    [assignee, setAssignee] = useState(""),
    [mobile, setMobile] = useState(false),
    [report, setReport] = useState(null);
  const requestVersion = useRef(0),
    project = projects.find((p) => String(p.id) === String(projectId));
  async function fetchSession() {
    const s = await api("session/");
    setSession(s);
    return s;
  }
  async function loadProjects() {
    const rows = await api("projects/");
    setProjects(rows);
    setProjectId((prev) =>
      rows.some((p) => String(p.id) === String(prev))
        ? prev
        : String(rows[0]?.id || ""),
    );
    return rows;
  }
  async function loadData(id) {
    const version = ++requestVersion.current;
    setLoading(true);
    setError("");
    try {
      const results = await Promise.all([
        ...endpoints.map((e) => api(`${e}/?project=${id}`)),
        api(`projects/${id}/metrics/`),
        api(`projects/${id}/report/`),
      ]);
      if (version !== requestVersion.current) return;
      setData(Object.fromEntries(endpoints.map((e, i) => [e, results[i]])));
      setMetrics(results[endpoints.length]);
      setReport(results[endpoints.length + 1]);
    } catch (e) {
      if (version === requestVersion.current) {
        setError(e.message);
        if (e.status === 403) setSession({ authenticated: false });
      }
    } finally {
      if (version === requestVersion.current) setLoading(false);
    }
  }
  useEffect(() => {
    fetchSession()
      .catch((e) => setError(e.message))
      .finally(() => setInitializing(false));
  }, []);
  useEffect(() => {
    if (session?.authenticated)
      loadProjects().catch((e) => setError(e.message));
  }, [session?.authenticated]);
  useEffect(() => {
    if (projectId && session?.authenticated) {
      localStorage.setItem("qc-project", projectId);
      setData(initialData());
      setMetrics(null);
      setReport(null);
      loadData(projectId);
    } else {
      ++requestVersion.current;
      setData(initialData());
      setMetrics(null);
      setReport(null);
    }
  }, [projectId, session?.authenticated]);
  useEffect(() => {
    setSearch("");
    setStatus("");
    setSeverity("");
    setAssignee("");
  }, [nav, projectId]);
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(""), 4500);
      return () => clearTimeout(timer);
    }
  }, [toast]);
  function navigate(value) {
    setNav(value);
    setMobile(false);
  }
  function schemas(type) {
    if (type === "projects")
      return [
        field("name", "text", { maxLength: 160 }),
        field("responsible", "text", { maxLength: 120 }),
        field("status", "select", { options: statusOptions }),
        field("description", "textarea"),
        field("objective", "textarea", { required: false }),
        field("scope", "textarea", { required: false }),
        field("out_of_scope", "textarea", { required: false }),
      ];
    if (type === "requirements")
      return [
        field("code", "text", { maxLength: 30 }),
        field("kind", "select", {
          options: options(["FUNCIONAL", "NO_FUNCIONAL"]),
        }),
        field("priority", "select", {
          options: options(["ALTA", "MEDIA", "BAJA"]),
        }),
        field("status", "select", {
          options: options(["PENDIENTE", "EN_REVISION", "CUMPLIDO"]),
        }),
        field("description", "textarea"),
      ];
    if (type === "test-cases")
      return [
        field("code", "text", { maxLength: 30 }),
        field("requirement", "select", {
          options: data.requirements.map((r) => [
            r.id,
            `${r.code} · ${r.description.slice(0, 65)}`,
          ]),
        }),
        field("objective", "text", { maxLength: 240 }),
        field("preconditions", "textarea"),
        field("input_data", "textarea"),
        field("steps", "textarea"),
        field("expected_result", "textarea"),
      ];
    if (type === "executions")
      return [
        field("result", "select", {
          options: options(["APROBADO", "FALLIDO", "BLOQUEADO"]),
        }),
        field("executor", "text", {
          default: session?.username,
          maxLength: 120,
        }),
        field("actual_result", "textarea"),
        field("evidence", "textarea"),
        field("observations", "textarea", { required: false }),
      ];
    if (type === "defects")
      return [
        field("code", "text", { maxLength: 30 }),
        field("title", "text", { maxLength: 200 }),
        field("test_case", "select", {
          required: false,
          nullable: true,
          options: data["test-cases"].map((t) => [
            t.id,
            `${t.code} · ${t.objective.slice(0, 55)}`,
          ]),
        }),
        field("responsible", "text", { maxLength: 120 }),
        field("severity", "select", {
          options: options(["ALTA", "CRITICA", "MEDIA", "BAJA"]),
        }),
        field("status", "select", {
          options: options(["ABIERTO", "EN_PROCESO", "RESUELTO"]),
        }),
        field("description", "textarea"),
        field("steps", "textarea"),
        field("expected_result", "textarea"),
        field("actual_result", "textarea"),
        field("evidence", "textarea"),
        field("resolution", "textarea", { required: false }),
      ];
    return [
      field("characteristic", "select", {
        options: ["FUNCIONAL", "DESEMPENO", "MANTENIBILIDAD"].map((v) => [
          v,
          characteristic(v),
        ]),
      }),
      field("standard", "text", {
        default: "ISO/IEC 25010:2023",
        maxLength: 50,
      }),
      field("criterion", "textarea"),
      field("method", "textarea"),
      field("indicator", "text", { maxLength: 200 }),
      field("target", "text", { maxLength: 200 }),
      field("observed_value", "text", { maxLength: 200 }),
      field("result", "select", {
        options: options(["CUMPLE", "PARCIAL", "NO_CUMPLE"]),
      }),
      field("environment", "text", { maxLength: 240 }),
      field("sample_size", "number", { default: 1 }),
      field("evaluator", "text", {
        default: session?.username,
        maxLength: 120,
      }),
      field("evidence", "textarea"),
      field("limitations", "textarea"),
      field("improvements", "textarea", { required: false }),
    ];
  }
  function openForm(type, record = null, caseRecord = null) {
    setModal({ type, record, caseRecord });
  }
  async function saveRecord(values) {
    const { type, record, caseRecord } = modal;
    const payload = {
      ...values,
      ...(type === "executions"
        ? { test_case: caseRecord.id }
        : type !== "projects"
          ? { project: Number(projectId) }
          : {}),
    };
    const saved = await api(
      `${type}/${record ? record.id + "/" : ""}`,
      record ? "PATCH" : "POST",
      payload,
    );
    setModal(null);
    setToast(
      record ? "Cambios guardados." : "Registro guardado correctamente.",
    );
    if (type === "projects") {
      await loadProjects();
      setProjectId(String(saved.id));
      if (String(saved.id) === String(projectId)) await loadData(saved.id);
    } else await loadData(projectId);
  }
  function downloadReport() {
    const blob = new Blob([JSON.stringify(report, null, 2)], {
        type: "application/json",
      }),
      url = URL.createObjectURL(blob),
      a = document.createElement("a");
    a.href = url;
    a.download = `qualitycheck-informe-${projectId}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }
  if (initializing)
    return (
      <div className="loading-screen">
        <ShieldCheck size={35} />
        <p>Abriendo QualityCheck…</p>
      </div>
    );
  if (!session?.authenticated)
    return (
      <>
        {error && (
          <div className="connection-error" role="alert">
            {error} Comprueba que el servidor esté iniciado.{" "}
            <button
              onClick={() => {
                setError("");
                fetchSession().catch((e) => setError(e.message));
              }}
            >
              Reintentar
            </button>
          </div>
        )}
        <Login onLogin={fetchSession} />
      </>
    );
  const rows = (nav === "projects" ? projects : data[nav] || []).filter(
    (r) =>
      (!search ||
        JSON.stringify(r)
          .toLocaleLowerCase("es")
          .includes(search.toLocaleLowerCase("es"))) &&
      (!status ||
        (nav === "test-cases"
          ? r.latest_execution?.result || "PENDIENTE"
          : r.status) === status) &&
      (!severity || r.severity === severity) &&
      (!assignee || r.responsible === assignee),
  );
  const pageTitle = titleMap[nav],
    canCreate =
      nav === "projects" ||
      (project &&
        !loading &&
        (nav !== "test-cases" || data.requirements.length > 0));
  const actionLabels = {
    projects: "Nuevo proyecto",
    requirements: "Nuevo requisito",
    "test-cases": "Nuevo caso",
    defects: "Nuevo defecto",
    evaluations: "Nueva evaluación",
  };
  const statusValues =
    nav === "projects"
      ? ["EN_CURSO", "EN_REVISION", "FINALIZADO"]
      : nav === "requirements"
        ? ["PENDIENTE", "EN_REVISION", "CUMPLIDO"]
        : nav === "test-cases"
          ? ["APROBADO", "FALLIDO", "BLOQUEADO", "PENDIENTE"]
          : nav === "defects"
            ? ["ABIERTO", "EN_PROCESO", "RESUELTO"]
            : [];
  return (
    <div className="app">
      <aside className={`sidebar ${mobile ? "open" : ""}`}>
        <div className="brand">
          <div className="brand-icon">
            <ShieldCheck size={25} />
          </div>
          <span>
            QualityCheck<b>CALIDAD DE SOFTWARE</b>
          </span>
        </div>
        <div className="workspace">
          <span className="eyebrow light">PROYECTO ACTUAL</span>
          <select
            aria-label="Proyecto actual"
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
          >
            {!projects.length && <option value="">Sin proyectos</option>}
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
        <nav aria-label="Navegación principal">
          {navigation.map(([key, label, Icon]) => (
            <button
              key={key}
              onClick={() => navigate(key)}
              className={nav === key ? "active" : ""}
              aria-current={nav === key ? "page" : undefined}
            >
              <Icon size={18} />
              <span>{label}</span>
              {nav === key && <ChevronRight size={15} />}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="sidebar-note">
            <Activity size={19} />
            <div>
              De los datos a la mejora.<small>Cada evidencia cuenta.</small>
            </div>
          </div>
          <div className="user">
            <div className="avatar">
              {session.username?.slice(0, 2).toUpperCase()}
            </div>
            <span>
              {session.username}
              <small>Administrador</small>
            </span>
            <button
              className="icon-button"
              aria-label="Cerrar sesión"
              onClick={async () => {
                try {
                  await api("logout/", "POST");
                  setSession({ authenticated: false });
                } catch (e) {
                  setError(e.message);
                }
              }}
            >
              <LogOut size={17} />
            </button>
          </div>
        </div>
      </aside>
      <div className="main-wrap">
        <header className="topbar">
          <div>
            <button
              className="icon-button mobile-toggle"
              aria-label="Abrir navegación"
              onClick={() => setMobile(!mobile)}
            >
              <Menu size={22} />
            </button>
            <span>Espacio de trabajo</span>
            <ChevronRight size={14} />
            <strong>{navigation.find((n) => n[0] === nav)[1]}</strong>
          </div>
          <span className="environment">
            <i />
            Entorno local{" "}
            <span className="topbar-date">
              ·{" "}
              {new Intl.DateTimeFormat("es-CO", {
                day: "numeric",
                month: "long",
                year: "numeric",
              }).format(new Date())}
            </span>
          </span>
        </header>
        <main>
          <div className="page-heading">
            <div>
              <span className="eyebrow">
                {nav === "dashboard"
                  ? "VISIÓN DEL PROYECTO"
                  : "GESTIÓN DE CALIDAD"}
              </span>
              <h1>{pageTitle[0]}</h1>
              <p>{pageTitle[1]}</p>
            </div>
            <div className="page-actions">
              {actionLabels[nav] && (
                <Button disabled={!canCreate} onClick={() => openForm(nav)}>
                  {actionLabels[nav]}
                </Button>
              )}
              {nav === "dashboard" && project && (
                <Button
                  secondary
                  icon={FileBarChart2}
                  onClick={() => navigate("report")}
                >
                  Ver informe
                </Button>
              )}
              {nav === "report" && report && (
                <>
                  <Button
                    secondary
                    icon={ArrowDownToLine}
                    onClick={downloadReport}
                  >
                    Exportar JSON
                  </Button>
                  <Button icon={FileBarChart2} onClick={() => window.print()}>
                    Imprimir / PDF
                  </Button>
                </>
              )}
            </div>
          </div>
          {error && (
            <div className="error-banner" role="alert">
              {error}
              <button
                onClick={() =>
                  projectId ? loadData(projectId) : loadProjects()
                }
              >
                Reintentar
              </button>
            </div>
          )}
          {project && nav !== "projects" && (
            <div className="project-strip">
              <FolderKanban size={18} />
              <strong>{project.name}</strong>
              <Badge value={project.status} />
              {project.is_demo && (
                <span className="demo-tag">Datos de demostración</span>
              )}
            </div>
          )}
          {!project && nav !== "projects" ? (
            <Empty
              title="Tu primer proyecto comienza aquí"
              text="Crea un proyecto para registrar requisitos, ejecutar pruebas y reunir evidencias."
              action={
                <Button onClick={() => openForm("projects")}>
                  Crear proyecto
                </Button>
              }
            />
          ) : loading && nav !== "projects" ? (
            <div className="loading-content">Cargando datos del proyecto…</div>
          ) : (
            <>
              {nav === "dashboard" && metrics && (
                <Dashboard
                  metrics={metrics}
                  data={data}
                  navigate={navigate}
                  openForm={openForm}
                />
              )}
              {nav === "projects" && (
                <>
                  <div className="section-meta">
                    <span>
                      {projects.length} proyectos en el espacio de trabajo
                    </span>
                    <span>Un lugar para cada ciclo de calidad</span>
                  </div>
                  <div className="project-grid">
                    {rows.map((p) => (
                      <article className="project-card" key={p.id}>
                        <div className="card-title">
                          <div className="project-symbol">
                            <FolderKanban size={23} />
                          </div>
                          <Badge value={p.status} />
                        </div>
                        <h2>{p.name}</h2>
                        <p>{p.description}</p>
                        <div className="project-owner">
                          <span className="avatar pale">
                            {p.responsible.slice(0, 2).toUpperCase()}
                          </span>
                          <span>
                            {p.responsible}
                            <small>Responsable del proyecto</small>
                          </span>
                        </div>
                        <div className="project-card-footer">
                          <button
                            className="text-button"
                            onClick={() => {
                              setProjectId(String(p.id));
                              navigate("dashboard");
                            }}
                          >
                            Abrir proyecto <ArrowRight size={15} />
                          </button>
                          <button
                            className="icon-button"
                            aria-label={`Editar ${p.name}`}
                            onClick={() => openForm("projects", p)}
                          >
                            <Pencil size={16} />
                          </button>
                        </div>
                      </article>
                    ))}
                  </div>
                  {!projects.length && <Empty />}
                </>
              )}
              {["requirements", "test-cases", "defects"].includes(nav) && (
                <section className="panel">
                  <div className="table-toolbar">
                    <div className="search">
                      <Search size={17} />
                      <input
                        aria-label="Buscar registros"
                        placeholder="Buscar por código, descripción…"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                      />
                    </div>
                    <div className="filters">
                      <select
                        aria-label="Filtrar por estado"
                        value={status}
                        onChange={(e) => setStatus(e.target.value)}
                      >
                        <option value="">Todos los estados</option>
                        {options(statusValues).map(([v, l]) => (
                          <option key={v} value={v}>
                            {l}
                          </option>
                        ))}
                      </select>
                      {nav === "defects" && (
                        <>
                          <select
                            aria-label="Filtrar por severidad"
                            value={severity}
                            onChange={(e) => setSeverity(e.target.value)}
                          >
                            <option value="">Toda severidad</option>
                            {options(["CRITICA", "ALTA", "MEDIA", "BAJA"]).map(
                              ([v, l]) => (
                                <option key={v} value={v}>
                                  {l}
                                </option>
                              ),
                            )}
                          </select>
                          <select
                            aria-label="Filtrar por responsable"
                            value={assignee}
                            onChange={(e) => setAssignee(e.target.value)}
                          >
                            <option value="">Todo responsable</option>
                            {[
                              ...new Set(
                                data.defects.map((d) => d.responsible),
                              ),
                            ].map((v) => (
                              <option key={v}>{v}</option>
                            ))}
                          </select>
                        </>
                      )}
                    </div>
                  </div>
                  {nav === "test-cases" && !data.requirements.length && (
                    <div className="inline-note">
                      Primero registra un requisito para poder asociar el caso
                      de prueba.
                    </div>
                  )}
                  <div className="table-scroll">
                    <table>
                      <thead>
                        <tr>
                          {(nav === "requirements"
                            ? [
                                "Código / descripción",
                                "Tipo",
                                "Prioridad",
                                "Estado",
                                "Trazabilidad",
                                "Acciones",
                              ]
                            : nav === "test-cases"
                              ? [
                                  "Código / objetivo",
                                  "Requisito",
                                  "Último resultado",
                                  "Historial",
                                  "Acciones",
                                ]
                              : [
                                  "Código / defecto",
                                  "Severidad",
                                  "Estado",
                                  "Responsable",
                                  "Caso asociado",
                                  "Acciones",
                                ]
                          ).map((h) => (
                            <th key={h}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {rows.map((r) => (
                          <tr key={r.id}>
                            <td>
                              <span className="record-code">{r.code}</span>
                              <span className="record-description">
                                {r.description && nav === "requirements"
                                  ? r.description
                                  : r.objective || r.title}
                              </span>
                            </td>
                            {nav === "requirements" ? (
                              <>
                                <td>{labels[r.kind]}</td>
                                <td>
                                  <Badge value={r.priority} />
                                </td>
                                <td>
                                  <Badge value={r.status} />
                                </td>
                                <td>
                                  <div className="trace-links">
                                    {r.test_case_codes.length ? (
                                      r.test_case_codes.map((code) => (
                                        <button
                                          key={code}
                                          onClick={() =>
                                            setModal({
                                              type: "detail",
                                              record: data["test-cases"].find(
                                                (t) => t.code === code,
                                              ),
                                            })
                                          }
                                        >
                                          {code}
                                        </button>
                                      ))
                                    ) : (
                                      <span className="muted">Sin casos</span>
                                    )}
                                  </div>
                                </td>
                              </>
                            ) : nav === "test-cases" ? (
                              <>
                                <td>
                                  <span className="code-chip">
                                    {r.requirement_code}
                                  </span>
                                </td>
                                <td>
                                  <Badge value={r.latest_execution?.result} />
                                </td>
                                <td>
                                  <button
                                    className="text-button"
                                    onClick={() =>
                                      setModal({ type: "detail", record: r })
                                    }
                                  >
                                    {r.execution_count} ejecuciones{" "}
                                    <ChevronRight size={14} />
                                  </button>
                                </td>
                              </>
                            ) : (
                              <>
                                <td>
                                  <Badge value={r.severity} />
                                </td>
                                <td>
                                  <Badge value={r.status} />
                                </td>
                                <td>{r.responsible}</td>
                                <td>{r.test_case_code || "Sin asociar"}</td>
                              </>
                            )}
                            <td>
                              <div className="row-actions">
                                {nav === "test-cases" && (
                                  <button
                                    className="run-button"
                                    onClick={() =>
                                      openForm("executions", null, r)
                                    }
                                  >
                                    <Play size={13} />
                                    Ejecutar
                                  </button>
                                )}
                                <button
                                  className="icon-button"
                                  aria-label={`Editar ${r.code}`}
                                  onClick={() => openForm(nav, r)}
                                >
                                  <Pencil size={15} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {!rows.length && (
                    <Empty
                      title={
                        search || status || severity || assignee
                          ? "No hay coincidencias"
                          : "Todavía no hay registros"
                      }
                      text={
                        search || status || severity || assignee
                          ? "Prueba con otros filtros."
                          : "Usa el botón superior para crear el primer registro."
                      }
                    />
                  )}
                  <div className="table-footer">
                    {rows.length} de {data[nav].length} registros{" "}
                    <span>Información guardada en la base de datos</span>
                  </div>
                </section>
              )}
              {nav === "evaluations" && (
                <>
                  <div className="inline-note">
                    <CircleHelp size={18} />
                    <span>
                      Evaluación académica de características seleccionadas de
                      ISO/IEC 25010:2023. Cada resultado necesita un criterio,
                      una medición y evidencia; no constituye una certificación.
                    </span>
                  </div>
                  <div className="evaluation-grid">
                    {data.evaluations.map((e) => (
                      <article className="panel evaluation-card" key={e.id}>
                        <div className="card-title">
                          <ShieldCheck size={22} />
                          <Badge value={e.result} />
                        </div>
                        <span className="eyebrow">{e.standard}</span>
                        <h2>{characteristic(e.characteristic)}</h2>
                        <p>{e.criterion}</p>
                        <div className="measurement">
                          <div>
                            <small>VALOR OBSERVADO</small>
                            <strong>{e.observed_value}</strong>
                          </div>
                          <div>
                            <small>META</small>
                            <strong>{e.target}</strong>
                          </div>
                        </div>
                        <dl>
                          <dt>Indicador</dt>
                          <dd>{e.indicator}</dd>
                          <dt>Método</dt>
                          <dd>{e.method}</dd>
                          <dt>Evidencia</dt>
                          <dd>{e.evidence}</dd>
                          <dt>Ambiente / muestra</dt>
                          <dd>
                            {e.environment} · n = {e.sample_size}
                          </dd>
                          <dt>Limitaciones</dt>
                          <dd>{e.limitations}</dd>
                          <dt>Mejoras</dt>
                          <dd>
                            {e.improvements || "Sin acciones registradas"}
                          </dd>
                        </dl>
                        <div className="evaluation-footer">
                          <small>
                            {e.evaluator} · {fmtDate(e.measured_at)}
                          </small>
                          <button
                            className="text-button"
                            onClick={() => openForm("evaluations", e)}
                          >
                            Editar <Pencil size={14} />
                          </button>
                        </div>
                      </article>
                    ))}
                  </div>
                  {!data.evaluations.length && (
                    <Empty
                      title="Define tu primera evaluación"
                      text="Selecciona una característica y documenta cómo vas a medirla."
                    />
                  )}
                </>
              )}
              {nav === "report" && report && <Report report={report} />}
            </>
          )}
          <footer className="page-footer">
            <span>
              QualityCheck <b>·</b> Evidencias para mejorar
            </span>
            <span>Proyecto académico / Calidad de Software</span>
          </footer>
        </main>
      </div>
      {toast && (
        <div className="toast" role="status">
          <CheckCheck size={19} />
          {toast}
        </div>
      )}
      {modal && (
        <Modal
          title={
            modal.type === "detail"
              ? `${modal.record.code} · Detalle e historial`
              : modal.type === "executions"
                ? `Ejecutar ${modal.caseRecord.code}`
                : `${modal.record ? "Editar" : "Crear"} ${{ projects: "proyecto", requirements: "requisito", "test-cases": "caso de prueba", defects: "defecto", evaluations: "evaluación" }[modal.type]}`
          }
          onClose={() => setModal(null)}
          wide
        >
          {modal.type === "detail" ? (
            <CaseDetail
              record={modal.record}
              executions={data.executions.filter(
                (e) => e.test_case === modal.record.id,
              )}
              onRun={() => openForm("executions", null, modal.record)}
            />
          ) : (
            <RecordForm
              key={`${modal.type}-${modal.record?.id || "new"}`}
              schema={schemas(modal.type)}
              initial={modal.record}
              onClose={() => setModal(null)}
              onSave={saveRecord}
            />
          )}
        </Modal>
      )}
    </div>
  );
}
function Metric({ label, value, detail, icon: Icon, tone }) {
  return (
    <article className={`metric ${tone || ""}`}>
      <div>
        <span>{label}</span>
        <Icon size={19} />
      </div>
      <strong>{value}</strong>
      <small>{detail}</small>
    </article>
  );
}
function Dashboard({ metrics: m, data, navigate, openForm }) {
  const completion = m.test_cases
    ? Math.round((m.completed / m.test_cases) * 100)
    : 0;
  const activity = data.executions.slice(0, 5);
  return (
    <>
      <div className="metrics-grid">
        <Metric
          label="Requisitos registrados"
          value={m.requirements}
          detail={`${m.verified_requirements} con pruebas ejecutadas`}
          icon={BookOpen}
        />
        <Metric
          label="Pruebas aprobadas"
          value={percent(m.approval_rate)}
          detail={`${m.approved} de ${m.completed} casos con resultado concluyente`}
          icon={CheckCheck}
          tone="green"
        />
        <Metric
          label="Defectos pendientes"
          value={m.unresolved_defects}
          detail={`${m.unresolved_by_severity.CRITICA + m.unresolved_by_severity.ALTA} de severidad crítica o alta`}
          icon={TriangleAlert}
          tone="amber"
        />
        <Metric
          label="Requisitos verificados"
          value={percent(m.verification_rate)}
          detail="Cobertura de ejecución; no implica cumplimiento"
          icon={ShieldCheck}
        />
      </div>
      <div className="dashboard-grid">
        <section className="panel execution-panel">
          <div className="panel-heading">
            <div>
              <h2>Estado de las pruebas</h2>
              <p>Última ejecución de cada caso de prueba</p>
            </div>
            <span className="code-chip">{m.test_cases} casos</span>
          </div>
          <div className="test-overview">
            <div
              className="progress-ring"
              style={{ "--progress": `${completion}%` }}
            >
              <div>
                <strong>
                  {completion}
                  <small>%</small>
                </strong>
                <span>concluyentes</span>
              </div>
            </div>
            <div className="result-bars">
              {[
                ["Aprobadas", m.approved, "green"],
                ["Fallidas", m.failed, "red"],
                ["Bloqueadas", m.blocked, "amber"],
                ["Sin ejecutar", m.pending, "gray"],
              ].map(([label, count, color]) => (
                <div className="result-bar" key={label}>
                  <div>
                    <span>
                      <i className={color} />
                      {label}
                    </span>
                    <b>{count}</b>
                  </div>
                  <div className="bar-track">
                    <div
                      className={color}
                      style={{
                        width: `${m.test_cases ? (count / m.test_cases) * 100 : 0}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="panel-bottom">
            <span>{m.executions} ejecuciones conservadas en el historial</span>
            <button
              className="text-button"
              onClick={() => navigate("test-cases")}
            >
              Ver casos de prueba <ArrowRight size={15} />
            </button>
          </div>
        </section>
        <section className="panel activity-panel">
          <div className="panel-heading">
            <div>
              <h2>Actividad de pruebas</h2>
              <p>Las ejecuciones más recientes</p>
            </div>
            <Activity size={19} />
          </div>
          <div className="activity-list">
            {activity.map((e) => (
              <div className="activity-item" key={e.id}>
                <div className={`activity-dot ${e.result.toLowerCase()}`}>
                  {e.result === "APROBADO" ? (
                    <Check size={14} />
                  ) : (
                    <FlaskConical size={14} />
                  )}
                </div>
                <div>
                  <strong>
                    {data["test-cases"].find((t) => t.id === e.test_case)?.code}{" "}
                    · {labels[e.result]}
                  </strong>
                  <p>
                    {e.executor} <span>·</span> {fmtDate(e.performed_at)}
                  </p>
                </div>
              </div>
            ))}
            {!activity.length && (
              <p className="muted">
                Ejecuta un caso para ver su resultado aquí.
              </p>
            )}
          </div>
        </section>
        <section className="panel risk-panel">
          <div className="panel-heading">
            <div>
              <h2>Defectos por severidad</h2>
              <p>Abiertos y en proceso</p>
            </div>
            <TriangleAlert size={19} />
          </div>
          <div className="severity-grid">
            {["CRITICA", "ALTA", "MEDIA", "BAJA"].map((s) => (
              <div key={s}>
                <Badge value={s} />
                <strong>{m.unresolved_by_severity[s]}</strong>
              </div>
            ))}
          </div>
          <div className="panel-bottom">
            <span>{percent(m.resolution_rate)} resueltos</span>
            <button className="text-button" onClick={() => navigate("defects")}>
              Gestionar defectos <ArrowRight size={15} />
            </button>
          </div>
        </section>
        <section className="next-step">
          <span className="eyebrow light">EL SIGUIENTE PASO</span>
          <h2>
            La evidencia convierte
            <br />
            un resultado en una mejora.
          </h2>
          <p>
            {m.characteristics_evaluated} de 3 características de calidad con
            evaluaciones registradas.
          </p>
          <button onClick={() => navigate("evaluations")}>
            Revisar evaluación de calidad <ArrowRight size={17} />
          </button>
          <div className="next-decoration">
            <ShieldCheck size={130} strokeWidth={1} />
          </div>
        </section>
      </div>
      <div className="method-note">
        <CircleHelp size={17} />
        <p>
          Las tasas de aprobación usan la última ejecución por caso y excluyen
          bloqueadas. La cobertura cuenta requisitos con al menos una ejecución
          aprobada o fallida. Los valores sin denominador se muestran como «Sin
          datos».
        </p>
      </div>
    </>
  );
}
function CaseDetail({ record, executions, onRun }) {
  return (
    <div className="case-detail">
      <div className="detail-top">
        <Badge value={record.latest_execution?.result} />
        <Button icon={Play} onClick={onRun}>
          Registrar ejecución
        </Button>
      </div>
      <h3>{record.objective}</h3>
      <dl>
        {[
          "requirement_code",
          "preconditions",
          "input_data",
          "steps",
          "expected_result",
        ].map((k) => (
          <React.Fragment key={k}>
            <dt>
              {k === "requirement_code" ? "Requisito asociado" : names[k]}
            </dt>
            <dd>{record[k]}</dd>
          </React.Fragment>
        ))}
      </dl>
      <h3>
        Historial de ejecuciones{" "}
        <span className="muted">({executions.length})</span>
      </h3>
      {executions.map((e) => (
        <article className="execution-entry" key={e.id}>
          <div className="card-title">
            <Badge value={e.result} />
            <small>
              {e.executor} · {fmtDate(e.performed_at)}
            </small>
          </div>
          <dl>
            <dt>Resultado obtenido</dt>
            <dd>{e.actual_result}</dd>
            <dt>Evidencia</dt>
            <dd>{e.evidence}</dd>
            {e.observations && (
              <>
                <dt>Observaciones</dt>
                <dd>{e.observations}</dd>
              </>
            )}
          </dl>
        </article>
      ))}
      {!executions.length && (
        <p className="muted">Este caso todavía no tiene ejecuciones.</p>
      )}
    </div>
  );
}
function Report({ report: r }) {
  return (
    <div className="report">
      <section className="report-cover panel">
        <span className="eyebrow">QUALITYCHECK / INFORME DE CALIDAD</span>
        <h2>{r.project.name}</h2>
        <p>{r.project.description}</p>
        <div className="report-meta">
          <span>
            Responsable: <b>{r.project.responsible}</b>
          </span>
          <span>Generado: {fmtDate(r.generated_at)}</span>
          <Badge value={r.project.status} />
        </div>
        {r.project.is_demo && (
          <div className="inline-note">
            Datos ficticios de demostración. Los resultados de este proyecto no
            son mediciones reales del inventario ni pruebas de QualityCheck.
          </div>
        )}
        <dl>
          {["objective", "scope", "out_of_scope"]
            .filter((k) => r.project[k])
            .map((k) => (
              <React.Fragment key={k}>
                <dt>{names[k]}</dt>
                <dd>{r.project[k]}</dd>
              </React.Fragment>
            ))}
        </dl>
      </section>
      <section className="panel report-section">
        <h2>01 / Indicadores del proyecto</h2>
        <div className="report-stats">
          <div>
            <strong>{percent(r.metrics.approval_rate)}</strong>
            <span>Pruebas aprobadas</span>
          </div>
          <div>
            <strong>{percent(r.metrics.verification_rate)}</strong>
            <span>Requisitos verificados</span>
          </div>
          <div>
            <strong>{percent(r.metrics.resolution_rate)}</strong>
            <span>Defectos resueltos</span>
          </div>
        </div>
        <p>
          Última ejecución por caso: {r.metrics.approved} aprobados,{" "}
          {r.metrics.failed} fallidos, {r.metrics.blocked} bloqueados y{" "}
          {r.metrics.pending} sin ejecutar. Historial: {r.metrics.executions}{" "}
          ejecuciones.
        </p>
        <p className="muted">
          Aprobación = aprobados / (aprobados + fallidos). Verificación =
          requisitos con alguna ejecución aprobada o fallida / total de
          requisitos. Resolución = defectos resueltos / defectos registrados.
          Cada razón se multiplica por 100; sin denominador se informa «Sin
          datos». Verificación mide cobertura de ejecución y no demuestra
          cumplimiento.
        </p>
      </section>
      <section className="panel report-section">
        <h2>02 / Requisitos y trazabilidad</h2>
        {r.requirements.map((q) => (
          <div className="report-record" key={q.id}>
            <b>{q.code}</b> · {q.description}
            <p>
              {labels[q.kind]} · Prioridad {labels[q.priority]} ·{" "}
              {labels[q.status]} · Casos:{" "}
              {q.test_case_codes.join(", ") || "Sin asociar"}
            </p>
          </div>
        ))}
        {!r.requirements.length && <p>Sin requisitos registrados.</p>}
      </section>
      <section className="panel report-section">
        <h2>03 / Casos de prueba e historial</h2>
        {r.test_cases.map((t) => (
          <div className="report-record" key={t.id}>
            <h3>
              {t.code} · {t.objective}
            </h3>
            <dl>
              <dt>Requisito</dt>
              <dd>{t.requirement_code}</dd>
              {["preconditions", "input_data", "steps", "expected_result"].map(
                (k) => (
                  <React.Fragment key={k}>
                    <dt>{names[k]}</dt>
                    <dd>{t[k]}</dd>
                  </React.Fragment>
                ),
              )}
            </dl>
            {r.executions
              .filter((e) => e.test_case === t.id)
              .map((e) => (
                <div className="report-execution" key={e.id}>
                  <Badge value={e.result} /> · {e.executor} ·{" "}
                  {fmtDate(e.performed_at)}
                  <p>
                    <b>Obtenido:</b> {e.actual_result}
                  </p>
                  <p>
                    <b>Evidencia:</b> {e.evidence}
                  </p>
                  {e.observations && (
                    <p>
                      <b>Observaciones:</b> {e.observations}
                    </p>
                  )}
                </div>
              ))}
            {!t.execution_count && <p>Sin ejecuciones.</p>}
          </div>
        ))}
        {!r.test_cases.length && <p>Sin casos registrados.</p>}
      </section>
      <section className="panel report-section">
        <h2>04 / Defectos y seguimiento</h2>
        {r.defects.map((d) => (
          <div className="report-record" key={d.id}>
            <h3>
              {d.code} · {d.title}
            </h3>
            <Badge value={d.status} /> <Badge value={d.severity} />
            <p>
              Responsable: {d.responsible} · Caso:{" "}
              {d.test_case_code || "Sin asociar"}
            </p>
            <dl>
              {[
                "description",
                "steps",
                "expected_result",
                "actual_result",
                "evidence",
                "resolution",
              ].map((k) => (
                <React.Fragment key={k}>
                  <dt>{names[k]}</dt>
                  <dd>{d[k] || "Sin registrar"}</dd>
                </React.Fragment>
              ))}
            </dl>
          </div>
        ))}
        {!r.defects.length && (
          <p>
            Sin defectos registrados. Esto no demuestra ausencia de errores.
          </p>
        )}
      </section>
      <section className="panel report-section">
        <h2>05 / Evaluación de calidad y mejoras</h2>
        {r.evaluations.map((e) => (
          <div className="report-record" key={e.id}>
            <h3>{characteristic(e.characteristic)}</h3>
            <Badge value={e.result} />
            <p>
              {e.standard} · {e.evaluator} · {fmtDate(e.measured_at)}
            </p>
            <dl>
              {[
                "criterion",
                "method",
                "indicator",
                "target",
                "observed_value",
                "evidence",
                "environment",
                "sample_size",
                "limitations",
                "improvements",
              ].map((k) => (
                <React.Fragment key={k}>
                  <dt>{names[k]}</dt>
                  <dd>{e[k] || "Sin registrar"}</dd>
                </React.Fragment>
              ))}
            </dl>
          </div>
        ))}
        {!r.evaluations.length && <p>Sin evaluaciones registradas.</p>}
        <p className="muted">
          Evaluación académica limitada a las características y muestras
          documentadas. No constituye una certificación de conformidad con
          ISO/IEC 25010.
        </p>
      </section>
    </div>
  );
}

if (document.getElementById("root"))
  createRoot(document.getElementById("root")).render(<App />);
