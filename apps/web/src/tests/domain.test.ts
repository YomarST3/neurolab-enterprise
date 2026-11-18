import { test } from "node:test";
import assert from "node:assert/strict";
import {
  advanceRun,
  cancelRun,
  copy,
  createRun,
  isActive,
  makeDataset,
  parameterCounts,
  seedStore,
  splitRows,
  template,
  validateArchitecture,
  type Run,
} from "../domain";
const fixture = () => {
  const s = seedStore();
  return {
    s,
    run: createRun(s.projects[0], s.datasets[0], s.architectures[0], {
      epochs: 5,
      batch: 16,
      optimizer: "Adam",
      learningRate: 0.005,
    }),
  };
};
function finish(run: Run) {
  for (let i = 0; isActive(run) && i < 200; i++) run = advanceRun(run);
  return run;
}
test("cada división conserva todas las filas, incluso con redondeo", () => {
  for (const n of [10, 150, 620, 750, 1200]) {
    const s = splitRows(n);
    assert.equal(s.train + s.val + s.test, n);
    assert.ok(s.test >= Math.floor(n * 0.15));
  }
});
test("una ejecución conserva snapshots aunque cambie la configuración original", () => {
  const { s, run } = fixture();
  s.projects[0].name = "Editado";
  s.datasets[0].name = "Otro.csv";
  s.architectures[0].layers[0].units = 400;
  assert.notEqual(run.project.name, s.projects[0].name);
  assert.notEqual(run.dataset.name, s.datasets[0].name);
  assert.notEqual(run.architecture.layers[0].units, 400);
});
test("no permite mezclar recursos de proyectos diferentes", () => {
  const { s } = fixture();
  assert.throws(
    () =>
      createRun(s.projects[0], s.datasets[1], s.architectures[0], {
        epochs: 5,
        batch: 16,
        optimizer: "Adam",
        learningRate: 0.005,
      }),
    /pertenecer/,
  );
});
test("las cinco fases se recorren y se guardan exactamente las épocas pedidas", () => {
  let { run } = fixture();
  const statuses = new Set([run.status]);
  while (isActive(run)) {
    run = advanceRun(run);
    statuses.add(run.status);
  }
  assert.deepEqual(
    [...statuses],
    [
      "En cola",
      "Preparando",
      "Entrenando",
      "Calculando métricas",
      "Completado",
    ],
  );
  assert.equal(run.metrics.length, 5);
  assert.ok(run.evaluation);
  assert.ok(run.endedAt);
  assert.ok(run.metrics.at(-1)!.loss < run.metrics[0].loss);
});
test("cancelar en cualquier fase es definitivo aunque continúen los ticks", () => {
  for (let ticks = 0; ticks < 8; ticks++) {
    let { run } = fixture();
    for (let i = 0; i < ticks && isActive(run); i++) run = advanceRun(run);
    if (!isActive(run)) continue;
    run = cancelRun(run);
    const count = run.metrics.length;
    for (let i = 0; i < 10; i++) run = advanceRun(run);
    assert.equal(run.status, "Cancelado");
    assert.equal(run.metrics.length, count);
    assert.equal(run.evaluation, undefined);
  }
});
test("matriz y accuracy se derivan de los mismos conteos del test set", () => {
  const { run } = fixture();
  const e = finish(run).evaluation!;
  assert.equal(
    e.matrix.flat().reduce((a, b) => a + b, 0),
    splitRows(run.dataset.rows).test,
  );
  assert.equal(
    e.accuracy,
    e.matrix.reduce((s, row, i) => s + row[i], 0) / e.samples,
  );
  for (const score of [e.accuracy, e.precision, e.recall, e.f1])
    assert.ok(score >= 0 && score <= 1);
});
test("multiclase genera una matriz de tres clases; regresión no usa matriz", () => {
  const s = seedStore();
  const cfg = { epochs: 4, batch: 32, optimizer: "SGD", learningRate: 0.01 };
  const multi = finish(
    createRun(s.projects[1], s.datasets[1], s.architectures[1], cfg),
  );
  const reg = finish(
    createRun(s.projects[2], s.datasets[2], s.architectures[2], cfg),
  );
  assert.equal(multi.evaluation!.matrix.length, 3);
  assert.equal(reg.evaluation!.matrix.length, 0);
  assert.ok(reg.evaluation!.mae > 0);
});
test("metadatos de archivo no alteran las filas y columnas sintéticas", () => {
  const ds = makeDataset("p0", "iris", {
    name: "presentacion.csv",
    size: 1234,
  });
  assert.equal(ds.name, "presentacion.csv");
  assert.equal(ds.bytes, 1234);
  assert.equal(ds.rows, 150);
  assert.equal(ds.columns.length, 5);
  assert.equal(ds.source, "Archivo demostrativo");
  assert.equal(Object.keys(ds.preview[0]).length, ds.columns.length);
});
test("todas las familias tienen plantillas válidas y conteos finitos", () => {
  const s = seedStore();
  for (const f of ["Feedforward", "CNN", "RNN", "GAN"] as const) {
    const a = { ...copy(s.architectures[0]), family: f, layers: template(f) };
    assert.equal(validateArchitecture(a, "Clasificación binaria"), null);
    assert.ok(parameterCounts(a, 8).every(Number.isFinite));
  }
});
test("los modelos semilla se relacionan con resultados y proyectos existentes", () => {
  const s = seedStore();
  for (const m of s.models) {
    const r = s.runs.find((r) => r.id === m.runId)!;
    assert.ok(r);
    assert.equal(m.projectId, r.projectId);
    assert.equal(r.status, "Completado");
    assert.ok(r.evaluation);
  }
});
test("configuraciones inválidas no inician simulaciones", () => {
  const { s } = fixture();
  for (const epochs of [0, -1, 101, NaN, 1.5])
    assert.throws(() =>
      createRun(s.projects[0], s.datasets[0], s.architectures[0], {
        epochs,
        batch: 16,
        optimizer: "Adam",
        learningRate: 0.005,
      }),
    );
});
