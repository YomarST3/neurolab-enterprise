import { test } from "node:test";
import assert from "node:assert/strict";
import { seedStore } from "../domain";
import { defaultReportOptions, mockReportService } from "../services/reports";

test("preparar CSV conserva las filas de la ejecución y no necesita descargar", async () => {
  const run = seedStore().runs[0];
  const artifact = mockReportService.csv(run);
  assert.equal(artifact.format, "CSV");
  assert.equal(artifact.csv!.rows.length, run.metrics.length);
  assert.equal(artifact.runId, run.id);
  assert.equal(artifact.csv!.rows[0][1], String(run.metrics[0].loss));
  const text = await artifact.blob.text();
  assert.ok(text.includes("Datos simulados"));
  assert.ok(text.includes(artifact.csv!.headers.join(",")));
  for (const row of artifact.csv!.rows) assert.ok(text.includes(row.join(",")));
});

test("preparar PDF entrega un archivo final inmutable para revisar antes de descargar", async () => {
  const s = seedStore(),
    run = s.runs[0],
    model = s.models.find((m) => m.runId === run.id);
  const artifact = await mockReportService.pdf(run, model);
  assert.equal(artifact.format, "PDF");
  assert.equal(artifact.blob.type, "application/pdf");
  assert.equal(artifact.project, run.project.name);
  assert.equal(artifact.version, model?.version);
  assert.ok(artifact.pages! >= 3);
  assert.equal(
    new TextDecoder().decode((await artifact.blob.arrayBuffer()).slice(0, 5)),
    "%PDF-",
  );
  const bytes = await artifact.blob.arrayBuffer();
  run.project.name = "Editado después de generar";
  assert.notEqual(artifact.project, run.project.name);
  assert.deepEqual(await artifact.blob.arrayBuffer(), bytes);
  const withLogs = await mockReportService.pdf(run, model, {
    ...defaultReportOptions,
    includeLogs: true,
  });
  assert.ok(withLogs.pages! > artifact.pages!);
});
