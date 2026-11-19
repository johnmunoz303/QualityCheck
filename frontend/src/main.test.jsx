import React from "react";
import {
  render,
  screen,
  waitFor,
  cleanup,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, it, expect, vi } from "vitest";
import { App } from "./main";

let authenticated, requirements, cases, executions;
const project = {
  id: 1,
  name: "Proyecto de prueba",
  description: "Verificación de interfaz",
  responsible: "Ana",
  status: "EN_CURSO",
  is_demo: false,
};
const metrics = {
  requirements: 1,
  verified_requirements: 0,
  approval_rate: null,
  verification_rate: 0,
  resolution_rate: null,
  unresolved_defects: 0,
  unresolved_by_severity: { CRITICA: 0, ALTA: 0, MEDIA: 0, BAJA: 0 },
  test_cases: 1,
  completed: 0,
  approved: 0,
  failed: 0,
  blocked: 0,
  pending: 1,
  executions: 0,
  characteristics_evaluated: 0,
};
beforeEach(() => {
  authenticated = true;
  localStorage.clear();
  requirements = [
    {
      id: 1,
      project: 1,
      code: "RF-001",
      description: "Guardar productos",
      kind: "FUNCIONAL",
      priority: "ALTA",
      status: "PENDIENTE",
      test_case_codes: ["CP-001"],
    },
  ];
  cases = [
    {
      id: 1,
      project: 1,
      requirement: 1,
      requirement_code: "RF-001",
      code: "CP-001",
      objective: "Guardar producto válido",
      preconditions: "Formulario abierto",
      input_data: "Producto",
      steps: "Guardar",
      expected_result: "Guardado",
      latest_execution: null,
      execution_count: 0,
    },
  ];
  executions = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url, config = {}) => {
      const path = String(url).replace("/api/", "").split("?")[0];
      let body;
      if (path === "session/")
        body = { authenticated, username: authenticated ? "tester" : null };
      else if (path === "login/") {
        const payload = JSON.parse(config.body);
        if (payload.password !== "correcta")
          return {
            ok: false,
            status: 400,
            json: async () => ({ detail: "Usuario o contraseña incorrectos." }),
          };
        authenticated = true;
        body = { username: "tester" };
      } else if (path === "logout/") {
        authenticated = false;
        body = {};
      } else if (path === "projects/") body = [project];
      else if (path === "projects/1/metrics/") body = metrics;
      else if (path === "projects/1/report/")
        body = {
          project,
          metrics,
          requirements,
          test_cases: cases,
          executions,
          defects: [],
          evaluations: [],
        };
      else if (path === "requirements/" && config.method === "POST") {
        const payload = JSON.parse(config.body);
        body = { ...payload, id: 2, test_case_codes: [] };
        requirements = [...requirements, body];
      } else if (path === "requirements/") body = requirements;
      else if (path === "test-cases/") body = cases;
      else if (path === "executions/" && config.method === "POST") {
        body = {
          ...JSON.parse(config.body),
          id: 1,
          performed_at: new Date().toISOString(),
        };
        executions = [body];
        cases = [{ ...cases[0], execution_count: 1, latest_execution: body }];
      } else if (path === "executions/") body = executions;
      else body = [];
      return { ok: true, status: 200, json: async () => body };
    }),
  );
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
async function openSection(name) {
  await screen.findByRole("heading", {
    name: "Una vista clara de tu calidad.",
  });
  await userEvent.click(screen.getByRole("button", { name, exact: true }));
}
describe("Flujos de React con API simulada", () => {
  it("muestra el panel con indicadores sin denominador", async () => {
    render(<App />);
    await screen.findByRole("heading", {
      name: "Una vista clara de tu calidad.",
    });
    await screen.findByText("Estado de las pruebas");
    expect(screen.getAllByText("Sin datos").length).toBeGreaterThan(0);
  });
  it("crea un requisito y envía el proyecto correcto", async () => {
    render(<App />);
    await openSection("Requisitos");
    await userEvent.click(
      await screen.findByRole("button", { name: "Nuevo requisito" }),
    );
    const dialog = screen.getByRole("dialog");
    await userEvent.type(within(dialog).getByLabelText(/Código/), "RF-002");
    await userEvent.type(
      within(dialog).getByLabelText(/Descripción/),
      "Consultar existencias",
    );
    await userEvent.click(
      within(dialog).getByRole("button", { name: "Guardar registro" }),
    );
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(
      fetch.mock.calls.some(
        ([url, c]) =>
          url === "/api/requirements/" &&
          c.method === "POST" &&
          JSON.parse(c.body).project === 1,
      ),
    ).toBe(true);
    await screen.findByText("RF-002");
  });
  it("registra una ejecución y muestra su historial", async () => {
    render(<App />);
    await openSection("Casos de prueba");
    await userEvent.click(
      await screen.findByRole("button", { name: "Ejecutar", exact: true }),
    );
    const dialog = screen.getByRole("dialog");
    await userEvent.type(
      within(dialog).getByLabelText(/Resultado obtenido/),
      "Producto guardado",
    );
    await userEvent.type(
      within(dialog).getByLabelText(/Evidencia textual/),
      "Registro de la prueba",
    );
    await userEvent.click(
      within(dialog).getByRole("button", { name: "Guardar registro" }),
    );
    await screen.findByText("1 ejecuciones");
    await userEvent.click(
      screen.getByRole("button", { name: /1 ejecuciones/ }),
    );
    await within(screen.getByRole("dialog")).findByText("Producto guardado");
    expect(executions[0].test_case).toBe(1);
  });
  it("abre trazabilidad desde el requisito y cierra con Escape", async () => {
    render(<App />);
    await openSection("Requisitos");
    await userEvent.click(
      await screen.findByRole("button", { name: "CP-001", exact: true }),
    );
    expect(screen.getByRole("dialog")).toBeTruthy();
    await screen.findByText("Guardar producto válido");
    await userEvent.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).toBeNull();
  });
  it("filtra defectos y muestra un estado vacío", async () => {
    render(<App />);
    await openSection("Defectos");
    await screen.findByText("Todavía no hay registros");
    await userEvent.selectOptions(
      screen.getByLabelText("Filtrar por severidad"),
      "ALTA",
    );
    await screen.findByText("No hay coincidencias");
  });
  it("rechaza credenciales incorrectas y permite iniciar sesión", async () => {
    authenticated = false;
    render(<App />);
    await screen.findByRole("heading", { name: "Bienvenido a QualityCheck" });
    await userEvent.type(screen.getByLabelText("Usuario"), "tester");
    await userEvent.type(screen.getByLabelText("Contraseña"), "incorrecta");
    await userEvent.click(
      screen.getByRole("button", { name: "Ingresar al espacio" }),
    );
    await screen.findByRole("alert");
    await userEvent.clear(screen.getByLabelText("Contraseña"));
    await userEvent.type(screen.getByLabelText("Contraseña"), "correcta");
    await userEvent.click(
      screen.getByRole("button", { name: "Ingresar al espacio" }),
    );
    await screen.findByRole("heading", {
      name: "Una vista clara de tu calidad.",
    });
  });
  it("cierra la sesión", async () => {
    render(<App />);
    await screen.findByRole("heading", {
      name: "Una vista clara de tu calidad.",
    });
    await userEvent.click(
      screen.getByRole("button", { name: "Cerrar sesión" }),
    );
    await screen.findByRole("heading", { name: "Bienvenido a QualityCheck" });
  });
  it("presenta el informe y advierte los límites de la evaluación", async () => {
    render(<App />);
    await openSection("Informe del proyecto");
    await screen.findByRole("heading", {
      name: "01 / Indicadores del proyecto",
    });
    expect(screen.getByText(/No constituye una certificación/)).toBeTruthy();
    expect(screen.getByRole("button", { name: "Exportar JSON" })).toBeTruthy();
  });
});
