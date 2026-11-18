import { time, type Model, type Run } from "../domain";

export interface ReportOptions {
  includeCharts: boolean;
  includeLogs: boolean;
  notes: string;
}
export interface ReportArtifact {
  format: "PDF" | "CSV";
  blob: Blob;
  filename: string;
  createdAt: string;
  project: string;
  dataset: string;
  version: string;
  runId: string;
  pages?: number;
  csv?: { metadata: string[]; headers: string[]; rows: string[][] };
}
export const defaultReportOptions: ReportOptions = {
  includeCharts: true,
  includeLogs: false,
  notes: "",
};
export function downloadReport(artifact: ReportArtifact) {
  const url = URL.createObjectURL(artifact.blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = artifact.filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export const mockReportService = {
  csv(run: Run): ReportArtifact {
    const createdAt = new Date().toISOString();
    const metadata = [
      "Prototipo demostrativo - Datos simulados. Sin entrenamiento real.",
      `Proyecto: ${run.project.name.replace(/[\r\n]/g, " ")}`,
      `Dataset: ${run.dataset.name.replace(/[\r\n]/g, " ")}`,
      `Ejecucion: ${run.id}`,
      `Generado: ${time(createdAt)}`,
    ];
    const headers = ["epoch", "loss", "val_loss", "accuracy", "val_accuracy"];
    const rows = run.metrics.map((m) =>
      [m.epoch, m.loss, m.valLoss, m.accuracy, m.valAccuracy].map(String),
    );
    const content =
      "\ufeff" +
      metadata.map((m) => "# " + m).join("\r\n") +
      "\r\n" +
      headers.join(",") +
      "\r\n" +
      rows.map((row) => row.join(",")).join("\r\n");
    return {
      format: "CSV",
      blob: new Blob([content], { type: "text/csv;charset=utf-8" }),
      filename: `DEMO_metricas_${run.id}.csv`,
      createdAt,
      project: run.project.name,
      dataset: run.dataset.name,
      version: "Métricas por época",
      runId: run.id,
      csv: { metadata, headers, rows },
    };
  },
  manifest(run: Run, model: Model) {
    const blob = new Blob(
      [
        JSON.stringify(
          {
            simulated: true,
            notice:
              "Prototipo demostrativo - Datos simulados. Sin entrenamiento real.",
            contains_trained_weights: false,
            model,
            runId: run.id,
            project: run.project,
            dataset: run.dataset,
            architecture: run.architecture,
            hyperparameters: run.config,
            evaluation: run.evaluation,
          },
          null,
          2,
        ),
      ],
      { type: "application/json" },
    );
    const url = URL.createObjectURL(blob),
      a = document.createElement("a");
    a.href = url;
    a.download = `DEMO_${model.version}_${model.id}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  },
  async pdf(
    run: Run,
    model?: Model,
    options = defaultReportOptions,
  ): Promise<ReportArtifact> {
    const { buildStyledPdf } = await import("./reportPdf");
    return buildStyledPdf(run, model, options);
  },
};
