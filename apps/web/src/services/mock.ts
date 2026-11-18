import { useSyncExternalStore } from "react";
import {
  advanceRun,
  cancelRun,
  copy,
  createRun,
  normalizePermissions,
  PERMISSIONS,
  ROLES,
  availableModelTransitions,
  isActive,
  now,
  seedStore,
  uid,
  validateArchitecture,
  type Architecture,
  type Audit,
  type Dataset,
  type Model,
  type ModelStatus,
  type Project,
  type Run,
  type Settings,
  type Store,
  type User,
  type Permission,
} from "../domain";
const KEY = "neurolab_demo_v2",
  SESSION = "neurolab_demo_session";
let persistenceError = "";
function load(): Store {
  try {
    const saved = localStorage.getItem(KEY);
    if (saved) {
      const s = JSON.parse(saved) as Store;
      if (
        s.schema === 2 &&
        Array.isArray(s.projects) &&
        Array.isArray(s.runs) &&
        s.settings &&
        s.users?.length
      ) {
        s.settings.permissions = normalizePermissions(s.settings.permissions);
        s.runs = s.runs.map((r) =>
          isActive(r)
            ? {
                ...cancelRun(r),
                logs: [
                  ...r.logs,
                  "[DEMO] Simulación interrumpida al cerrar o recargar. Puedes reintentar.",
                ],
              }
            : r,
        );
        return s;
      }
    }
  } catch {
    persistenceError =
      "No se pudo recuperar la sesión guardada. Se cargaron ejemplos.";
  }
  return seedStore();
}
let data = load(),
  userId = sessionStorage.getItem(SESSION) || "",
  version = 0;
const listeners = new Set<() => void>();
const emit = () => {
  version++;
  listeners.forEach((fn) => fn());
};
function persist() {
  try {
    localStorage.setItem(KEY, JSON.stringify(data));
  } catch {
    persistenceError =
      "Almacenamiento local no disponible. Exporta tus reportes antes de cerrar.";
  }
  emit();
}
const user = () => data.users.find((u) => u.id === userId && u.active);
const can = (action: Permission) => {
  const role = user()?.role;
  return !!role && !!data.settings.permissions[role]?.[action];
};
function requireAccess(action: Permission) {
  if (!can(action))
    throw new Error(
      "Tu rol demostrativo no tiene permiso. Cambia de usuario desde el perfil.",
    );
}
function audit(action: string, detail: string, projectId?: string) {
  const item: Audit = {
    id: uid("audit"),
    at: now(),
    actor: user()?.name || "Sesión demo",
    action,
    detail,
    projectId,
  };
  data.audit = [item, ...data.audit].slice(0, 500);
}
function assertProject(id: string) {
  const p = data.projects.find((p) => p.id === id);
  if (!p) throw new Error("Selecciona un proyecto válido.");
  return p;
}
export const mockAuthService = {
  login(id: string) {
    const u = data.users.find((u) => u.id === id && u.active);
    if (!u) throw new Error("Selecciona un usuario de demostración activo.");
    userId = id;
    sessionStorage.setItem(SESSION, id);
    audit("INICIO_SESION", `Acceso ficticio como ${u.role}.`);
    persist();
  },
  logout() {
    audit("CIERRE_SESION", "Sesión demostrativa finalizada.");
    userId = "";
    sessionStorage.removeItem(SESSION);
    persist();
  },
  user,
  can,
};
export const mockProjectService = {
  save(input: Project) {
    requireAccess("projects");
    if (!input.name.trim())
      throw new Error("El nombre del proyecto es obligatorio.");
    const p = copy(input);
    p.name = p.name.trim();
    const exists = data.projects.some((x) => x.id === p.id);
    data.projects = exists
      ? data.projects.map((x) => (x.id === p.id ? p : x))
      : [...data.projects, p];
    data.activeProjectId = p.id;
    audit(exists ? "PROYECTO_EDITADO" : "PROYECTO_CREADO", p.name, p.id);
    persist();
  },
  select(id: string) {
    assertProject(id);
    data.activeProjectId = id;
    persist();
  },
  remove(id: string) {
    requireAccess("projects");
    if (data.runs.some((r) => r.projectId === id && isActive(r)))
      throw new Error(
        "Cancela los entrenamientos del proyecto antes de eliminarlo.",
      );
    const p = assertProject(id);
    data.projects = data.projects.filter((p) => p.id !== id);
    data.datasets = data.datasets.filter((d) => d.projectId !== id);
    data.architectures = data.architectures.filter((a) => a.projectId !== id);
    data.runs = data.runs.filter((r) => r.projectId !== id);
    data.models = data.models.filter((m) => m.projectId !== id);
    if (data.activeProjectId === id)
      data.activeProjectId = data.projects[0]?.id || "";
    audit("PROYECTO_ELIMINADO", p.name, id);
    persist();
  },
};
export const mockDatasetService = {
  save(input: Dataset) {
    requireAccess("datasets");
    assertProject(input.projectId);
    if (!input.columns.some((c) => c.name === input.target))
      throw new Error("Selecciona una variable objetivo válida.");
    const exists = data.datasets.some((d) => d.id === input.id);
    data.datasets = exists
      ? data.datasets.map((d) => (d.id === input.id ? copy(input) : d))
      : [...data.datasets, copy(input)];
    audit(
      "DATASET_GUARDADO",
      `${input.name} · ${input.rows} filas sintéticas · ${input.source}.`,
      input.projectId,
    );
    persist();
  },
};
export const mockArchitectureService = {
  save(input: Architecture) {
    requireAccess("architectures");
    const p = assertProject(input.projectId);
    const error = validateArchitecture(input, p.problem);
    if (error) throw new Error(error);
    const exists = data.architectures.some((a) => a.id === input.id);
    data.architectures = exists
      ? data.architectures.map((a) => (a.id === input.id ? copy(input) : a))
      : [...data.architectures, copy(input)];
    audit("ARQUITECTURA_GUARDADA", input.name, input.projectId);
    persist();
  },
};
export const mockTrainingService = {
  start(
    projectId: string,
    datasetId: string,
    architectureId: string,
    config: Run["config"],
  ) {
    requireAccess("training");
    if (data.runs.filter(isActive).length >= data.settings.maxConcurrent)
      throw new Error("Límite de simulaciones simultáneas alcanzado.");
    if (config.epochs > data.settings.maxEpochs)
      throw new Error(
        `El límite configurado es ${data.settings.maxEpochs} épocas.`,
      );
    const p = assertProject(projectId),
      ds = data.datasets.find((d) => d.id === datasetId),
      arch = data.architectures.find((a) => a.id === architectureId);
    if (!ds || !arch)
      throw new Error(
        "Guarda un dataset y una arquitectura antes de entrenar.",
      );
    const run = createRun(p, ds, arch, config);
    data.runs = [run, ...data.runs];
    audit(
      "SIMULACION_INICIADA",
      `${run.id} · ${ds.name} · ${arch.name}`,
      projectId,
    );
    persist();
    return run.id;
  },
  cancel(id: string) {
    requireAccess("training");
    data.runs = data.runs.map((r) => (r.id === id ? cancelRun(r) : r));
    audit(
      "SIMULACION_CANCELADA",
      id,
      data.runs.find((r) => r.id === id)?.projectId,
    );
    persist();
  },
  retry(id: string) {
    requireAccess("training");
    const source = data.runs.find((r) => r.id === id);
    if (!source) throw new Error("Ejecución no encontrada.");
    if (data.runs.filter(isActive).length >= data.settings.maxConcurrent)
      throw new Error("Límite de simulaciones simultáneas alcanzado.");
    if (source.config.epochs > data.settings.maxEpochs)
      throw new Error(
        "Ajusta el límite de épocas o inicia una nueva simulación.",
      );
    const run = createRun(
      assertProject(source.projectId),
      source.dataset,
      source.architecture,
      source.config,
    );
    data.runs = [run, ...data.runs];
    audit("SIMULACION_REINTENTADA", `${source.id} → ${run.id}`, run.projectId);
    persist();
    return run.id;
  },
};
export const mockMetricsService = {
  get: (id: string) => data.runs.find((r) => r.id === id),
};
export const mockModelService = {
  save(runId: string, name: string, version: string, notes: string) {
    requireAccess("models");
    const run = data.runs.find((r) => r.id === runId);
    if (!run || run.status !== "Completado" || !run.evaluation)
      throw new Error("Selecciona un entrenamiento completado.");
    if (!name.trim() || !/^v\d+\.\d+\.\d+$/.test(version))
      throw new Error("Indica nombre y versión con formato v1.0.0.");
    if (
      data.models.some(
        (m) =>
          m.projectId === run.projectId &&
          m.name === name.trim() &&
          m.version === version,
      )
    )
      throw new Error("Esta versión ya existe para ese modelo.");
    const m: Model = {
      id: uid("model"),
      projectId: run.projectId,
      runId,
      name: name.trim(),
      version,
      status: "Borrador",
      createdAt: now(),
      notes,
      history: [{ at: now(), status: "Borrador", actor: user()!.name }],
    };
    data.models = [m, ...data.models];
    audit("MODELO_REGISTRADO", `${m.name} ${version} · ${runId}`, m.projectId);
    persist();
  },
  status(id: string, status: ModelStatus) {
    const m = data.models.find((m) => m.id === id);
    if (!m) throw new Error("Modelo no encontrado.");
    if (status === "Aprobado" || status === "Retirado")
      requireAccess("approve");
    else requireAccess("models");
    if (
      !availableModelTransitions(m.status, {
        models: can("models"),
        approve: can("approve"),
      }).includes(status)
    )
      throw new Error("Transición de estado no permitida.");
    data.models = data.models.map((x) =>
      x.id === id
        ? {
            ...x,
            status,
            history: [...x.history, { at: now(), status, actor: user()!.name }],
          }
        : x,
    );
    audit("ESTADO_MODELO", `${m.name}: ${status}`, m.projectId);
    persist();
  },
};
export const mockAdminService = {
  saveUser(input: User) {
    requireAccess("admin");
    if (!input.name.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email))
      throw new Error("Indica un nombre y un correo de ejemplo válido.");
    if (
      data.users.some(
        (u) =>
          u.id !== input.id &&
          u.email.toLowerCase() === input.email.toLowerCase(),
      )
    )
      throw new Error("Ya existe un usuario con ese correo.");
    const others = data.users.filter((u) => u.id !== input.id);
    if (
      !(input.active && input.role === "Administrador") &&
      !others.some((u) => u.active && u.role === "Administrador")
    )
      throw new Error("Debe quedar al menos un administrador activo.");
    data.users = [...others, copy(input)];
    audit("USUARIO_GUARDADO", `${input.name} · ${input.role}`);
    if (input.id === userId && !input.active) {
      userId = "";
      sessionStorage.removeItem(SESSION);
    }
    persist();
  },
  saveSettings(settings: Settings) {
    requireAccess("admin");
    if (
      !ROLES.every((role) =>
        PERMISSIONS.every(
          ({ key }) => typeof settings.permissions?.[role]?.[key] === "boolean",
        ),
      )
    )
      throw new Error("Revisa los permisos de cada perfil antes de guardar.");
    if (
      !settings.organization.trim() ||
      !Number.isInteger(settings.maxEpochs) ||
      settings.maxEpochs < 1 ||
      settings.maxEpochs > 100 ||
      !Number.isInteger(settings.maxConcurrent) ||
      settings.maxConcurrent < 1 ||
      settings.maxConcurrent > 4 ||
      !Number.isFinite(settings.memory) ||
      settings.memory < 256
    )
      throw new Error(
        "Revisa límites: épocas 1–100, simulaciones 1–4, memoria desde 256 MB.",
      );
    if (!settings.permissions.Administrador.admin)
      throw new Error(
        "El perfil Administrador debe conservar acceso administrativo.",
      );
    data.settings = copy(settings);
    audit(
      "PREFERENCIAS_ACTUALIZADAS",
      "Límites ficticios y organización guardados.",
    );
    persist();
  },
};
export function useDemo() {
  useSyncExternalStore(
    (fn) => {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    () => version,
  );
  return { data, user: user(), can, persistenceError };
}
export function startSimulationClock() {
  const interval = setInterval(() => {
    let changed = false;
    data.runs = data.runs.map((r) => {
      if (!isActive(r)) return r;
      const next = advanceRun(r);
      changed = true;
      if (next.status === "Completado")
        audit(
          "SIMULACION_COMPLETADA",
          `${r.id} · resultados ficticios disponibles.`,
          r.projectId,
        );
      return next;
    });
    if (changed) persist();
  }, 450);
  return () => clearInterval(interval);
}
