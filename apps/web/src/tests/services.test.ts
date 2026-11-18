import { test } from "node:test";
import assert from "node:assert/strict";
import { copy, now, uid, type Store } from "../domain";
const storage = new Map<string, string>(),
  session = new Map<string, string>();
const memory = (map: Map<string, string>) => ({
  getItem: (key: string) => map.get(key) ?? null,
  setItem: (key: string, value: string) => map.set(key, value),
  removeItem: (key: string) => map.delete(key),
});
Object.defineProperty(globalThis, "localStorage", {
  value: memory(storage),
  configurable: true,
});
Object.defineProperty(globalThis, "sessionStorage", {
  value: memory(session),
  configurable: true,
});
const {
  mockAuthService: auth,
  mockProjectService: projects,
  mockAdminService: admin,
  mockModelService: models,
  mockDatasetService: datasets,
  mockArchitectureService: architectures,
  mockTrainingService: training,
} = await import("../services/mock");
const saved = (): Store => JSON.parse(storage.get("neurolab_demo_v2")!);
test("permisos, persistencia y ciclo de vida impiden acciones incoherentes", () => {
  auth.login("u0");
  const initial = saved();
  const p = {
    ...copy(initial.projects[0]),
    id: uid("test"),
    name: "Persistencia de prueba",
    createdAt: now(),
  };
  projects.save(p);
  assert.equal(saved().projects.length, initial.projects.length + 1);
  assert.equal(saved().activeProjectId, p.id);
  auth.login("u4");
  assert.throws(() => projects.save({ ...p, name: "No permitido" }), /permiso/);
  assert.throws(() => admin.saveSettings(initial.settings), /permiso/);
  auth.login("u0");
  const settings = copy(saved().settings);
  settings.permissions.Lector.projects = true;
  admin.saveSettings(settings);
  auth.login("u4");
  projects.save({ ...p, description: "Permiso aplicado" });
  assert.equal(
    saved().projects.find((x) => x.id === p.id)!.description,
    "Permiso aplicado",
  );
  auth.login("u0");
  const run = saved().runs[0];
  models.save(run.id, "Versión test", "v1.0.0", "Simulado");
  const model = saved().models[0];
  assert.equal(model.runId, run.id);
  assert.throws(() => models.status(model.id, "Aprobado"), /Transición/);
  models.status(model.id, "En revisión");
  models.status(model.id, "Aprobado");
  assert.equal(saved().models[0].history.length, 3);
  assert.throws(
    () => models.save(run.id, "Versión test", "v1.0.0", ""),
    /ya existe/,
  );
  projects.remove(p.id);
  assert.equal(
    saved().projects.some((x) => x.id === p.id),
    false,
  );
  assert.ok(saved().audit.some((a) => a.action === "PROYECTO_ELIMINADO"));
  auth.logout();
  assert.equal(auth.user(), undefined);
});

test("los servicios rechazan llamadas directas fuera del alcance de cada rol", () => {
  auth.login("u0");
  const settings = copy(saved().settings);
  settings.permissions.Lector.projects = false;
  admin.saveSettings(settings);
  const s = saved(),
    project = s.projects[0],
    dataset = s.datasets[0],
    architecture = s.architectures[0],
    run = s.runs[0];
  auth.login("u1");
  projects.save({ ...project, description: "Seguimiento por responsable" });
  assert.throws(() => datasets.save(dataset), /permiso/);
  assert.throws(() => architectures.save(architecture), /permiso/);
  assert.throws(
    () => training.start(project.id, dataset.id, architecture.id, run.config),
    /permiso/,
  );
  assert.throws(() => training.cancel(run.id), /permiso/);
  assert.throws(() => training.retry(run.id), /permiso/);
  assert.throws(
    () => models.save(run.id, "Fuera de alcance", "v1.0.0", ""),
    /permiso/,
  );
  auth.login("u2");
  assert.throws(() => projects.save(project), /permiso/);
  assert.throws(() => projects.remove(project.id), /permiso/);
  assert.throws(() => admin.saveSettings(settings), /permiso/);
  datasets.save(dataset);
  architectures.save(architecture);
  models.save(run.id, "Modelo del ingeniero", "v1.0.0", "");
  const model = saved().models[0];
  models.status(model.id, "En revisión");
  assert.throws(() => models.status(model.id, "Aprobado"), /permiso/);
  auth.login("u3");
  models.status(model.id, "Aprobado");
  assert.throws(
    () => models.save(run.id, "No autorizado", "v1.0.0", ""),
    /permiso/,
  );
  auth.login("u4");
  const before = JSON.stringify(saved());
  assert.throws(() => projects.save(project), /permiso/);
  assert.throws(() => datasets.save(dataset), /permiso/);
  assert.throws(() => architectures.save(architecture), /permiso/);
  assert.throws(() => training.retry(run.id), /permiso/);
  assert.throws(() => models.status(model.id, "Retirado"), /permiso/);
  assert.throws(() => admin.saveUser(s.users[0]), /permiso/);
  assert.equal(JSON.stringify(saved()), before);
});
