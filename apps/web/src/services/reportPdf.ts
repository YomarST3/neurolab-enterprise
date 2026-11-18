import {
  parameterCounts,
  pct,
  splitRows,
  time,
  type Model,
  type Run,
} from "../domain";
import type { ReportArtifact, ReportOptions } from "./reports";

type RGB = [number, number, number];
const C = {
  navy: [19, 31, 49] as RGB,
  ink: [31, 48, 69] as RGB,
  teal: [0, 149, 166] as RGB,
  cyan: [51, 211, 225] as RGB,
  soft: [240, 245, 249] as RGB,
  line: [220, 229, 237] as RGB,
  muted: [98, 115, 135] as RGB,
  white: [255, 255, 255] as RGB,
  violet: [112, 100, 206] as RGB,
  amber: [218, 153, 43] as RGB,
  coral: [224, 93, 113] as RGB,
};

/** Generates one immutable PDF blob, shared by the preview and confirmed download. */
export async function buildStyledPdf(
  run: Run,
  model: Model | undefined,
  options: ReportOptions,
): Promise<ReportArtifact> {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "mm", format: "a4", compress: true });
  const createdAt = new Date().toISOString(),
    margin = 18,
    width = 174;
  let y = 103,
    pageTitle = "Resumen del proyecto";
  const clean = (v: unknown) =>
    String(v ?? "—")
      .replace(/[→↔]/g, " > ")
      .replace(/[–—]/g, "-")
      .replace(/[^\x20-\xFF\n]/g, "");
  const font = (size = 9, bold = false, color: RGB = C.ink) => {
    doc.setFont("helvetica", bold ? "bold" : "normal");
    doc.setFontSize(size);
    doc.setTextColor(...color);
  };
  const lines = (
    value: unknown,
    w: number,
    size = 9,
    bold = false,
  ): string[] => {
    font(size, bold);
    return doc.splitTextToSize(clean(value), w) as string[];
  };
  const label = (
    value: unknown,
    x: number,
    at: number,
    size = 9,
    bold = false,
    color: RGB = C.ink,
    align: "left" | "right" | "center" = "left",
  ) => {
    font(size, bold, color);
    doc.text(clean(value), x, at, { align });
  };
  const rect = (
    x: number,
    at: number,
    w: number,
    h: number,
    fill: RGB = C.soft,
    radius = 2,
  ) => {
    doc.setFillColor(...fill);
    doc.roundedRect(x, at, w, h, radius, radius, "F");
  };
  const rule = (x1: number, at: number, x2: number, color: RGB = C.line) => {
    doc.setDrawColor(...color);
    doc.setLineWidth(0.25);
    doc.line(x1, at, x2, at);
  };
  const logo = (x: number, at: number, size = 1) => {
    doc.setDrawColor(...C.cyan);
    doc.setLineWidth(0.4);
    const nodes = [
      [0, 2],
      [0, 9],
      [7, 0],
      [7, 6],
      [7, 12],
      [14, 4],
      [14, 10],
    ];
    for (const a of [0, 1])
      for (const b of [2, 3, 4])
        doc.line(
          x + nodes[a][0] * size,
          at + nodes[a][1] * size,
          x + nodes[b][0] * size,
          at + nodes[b][1] * size,
        );
    for (const a of [2, 3, 4])
      for (const b of [5, 6])
        doc.line(
          x + nodes[a][0] * size,
          at + nodes[a][1] * size,
          x + nodes[b][0] * size,
          at + nodes[b][1] * size,
        );
    doc.setFillColor(...C.navy);
    nodes.forEach(([a, b]) =>
      doc.circle(x + a * size, at + b * size, 1.05 * size, "FD"),
    );
  };
  const newPage = (eyebrow: string, title: string) => {
    doc.addPage();
    pageTitle = title;
    label("NEUROLAB / ENTERPRISE", margin, 18, 8, true, C.teal);
    label("INFORME DEMOSTRATIVO", 192, 18, 7, false, C.muted, "right");
    rule(margin, 24, 192);
    label(eyebrow, margin, 36, 7, true, C.teal);
    label(title, margin, 46, 21, true);
    y = 57;
  };
  const ensure = (height: number) => {
    if (y + height > 272) newPage("CONTINUACIÓN DEL INFORME", pageTitle);
  };
  const paragraph = (value: unknown, size = 9, color: RGB = C.muted) => {
    const rows = lines(value, width, size);
    for (const row of rows) {
      ensure(6);
      label(row, margin, y, size, false, color);
      y += size * 0.3528 * 1.5;
    }
    y += 4;
  };
  const section = (number: string, title: string, subtitle?: string) => {
    ensure(subtitle ? 24 : 19);
    label(number, margin, y, 8, true, C.teal);
    label(title, margin + 12, y, 13, true);
    y += 7;
    if (subtitle) {
      label(subtitle, margin + 12, y, 8, false, C.muted);
      y += 6;
    }
    y += 4;
  };
  const metricCards = (
    items: { title: string; value: string; foot: string }[],
  ) => {
    ensure(38);
    const gap = 4,
      w = (width - gap * 3) / 4;
    items.forEach((item, i) => {
      const x = margin + i * (w + gap);
      rect(x, y, w, 31);
      rect(
        x,
        y,
        1.1,
        31,
        i === 0 ? C.teal : i === 1 ? C.violet : i === 2 ? C.amber : C.coral,
        0.3,
      );
      label(item.title.toUpperCase(), x + 4, y + 7, 6.3, true, C.muted);
      label(
        item.value,
        x + 4,
        y + 18,
        item.value.length > 12 ? 13 : 21,
        true,
        i === 0 ? C.teal : C.ink,
      );
      label(item.foot, x + 4, y + 25, 6.2, false, C.muted);
    });
    y += 39;
  };
  const infoCards = (
    groups: { title: string; fields: [string, string][] }[],
  ) => {
    const gap = 6,
      w = (width - gap) / 2;
    const heights = groups.map(
      (g) =>
        14 +
        g.fields.reduce(
          (s, [, value]) => s + 4 + lines(value, w - 10, 8.5).length * 4 + 4,
          0,
        ),
    );
    const h = Math.max(...heights);
    ensure(h + 8);
    groups.forEach((g, i) => {
      const x = margin + i * (w + gap);
      rect(x, y, w, h);
      label(g.title.toUpperCase(), x + 5, y + 8, 7, true, C.teal);
      let rowY = y + 17;
      for (const [key, value] of g.fields) {
        label(key, x + 5, rowY, 6.5, true, C.muted);
        rowY += 4;
        const wrapped = lines(value, w - 10, 8.5);
        font(8.5, true);
        doc.text(wrapped, x + 5, rowY, { lineHeightFactor: 1.34 });
        rowY += wrapped.length * 4 + 4;
      }
    });
    y += h + 8;
  };
  const table = (headers: string[], rows: string[][], widths: number[]) => {
    const head = () => {
      rect(margin, y, width, 8, C.navy, 1);
      let x = margin;
      headers.forEach((h, i) => {
        label(h, x + 3, y + 5.3, 7, true, C.white);
        x += widths[i];
      });
      y += 8;
    };
    ensure(19);
    head();
    rows.forEach((row, i) => {
      const wrapped = row.map((v, j) => lines(v, widths[j] - 6, 8));
      const h = Math.max(
        8,
        Math.max(...wrapped.map((v) => v.length)) * 3.8 + 4,
      );
      if (y + h > 272) {
        newPage("CONTINUACIÓN / TABLA", pageTitle);
        head();
      }
      if (i % 2 === 0) rect(margin, y, width, h, C.soft, 0);
      let x = margin;
      wrapped.forEach((v, j) => {
        font(8, j === 0, j === 0 ? C.ink : C.muted);
        doc.text(v, x + 3, y + 5, { lineHeightFactor: 1.34 });
        x += widths[j];
      });
      y += h;
      rule(margin, y, 192);
    });
    y += 10;
  };

  // Cover: branded masthead, executive indicators and dataset summary.
  doc.setFillColor(...C.navy);
  doc.rect(0, 0, 210, 89, "F");
  doc.setFillColor(...C.teal);
  doc.rect(0, 0, 3, 89, "F");
  logo(19, 15, 0.8);
  label("NEUROLAB", 38, 19, 12, true, C.white);
  label("ENTERPRISE / LABORATORIO DE IA", 38, 24, 6, false, C.cyan);
  label("REPORTE TÉCNICO", 192, 18, 7, true, C.cyan, "right");
  label(time(createdAt), 192, 24, 7, false, C.white, "right");
  label("Informe de simulación", margin, 45, 26, true, C.white);
  const title = lines(run.project.name, width, 13, true);
  font(13, true, C.white);
  doc.text(title.slice(0, 2), margin, 58, { lineHeightFactor: 1.3 });
  rect(margin, 76, 111, 7, [29, 65, 78], 1);
  label(
    "PROTOTIPO DEMOSTRATIVO - DATOS SIMULADOS",
    margin + 3,
    80.5,
    6.7,
    true,
    C.cyan,
  );
  section("01", "Resumen ejecutivo");
  paragraph(
    run.project.description ||
      "Demostración del ciclo completo de diseño, simulación y registro de una red neuronal.",
  );
  const ev = run.evaluation;
  metricCards(
    ev?.matrix.length
      ? [
          {
            title: "Accuracy",
            value: pct(ev.accuracy),
            foot: "Evaluación ficticia",
          },
          {
            title: "Precision",
            value: pct(ev.precision),
            foot: "Promedio macro",
          },
          { title: "Recall", value: pct(ev.recall), foot: "Promedio macro" },
          { title: "F1 score", value: pct(ev.f1), foot: "Promedio macro" },
        ]
      : [
          {
            title: "Loss",
            value: ev?.loss.toFixed(4) || "-",
            foot: "Valor ficticio",
          },
          {
            title: "MAE",
            value: ev?.mae.toFixed(3) || "-",
            foot: "Valor ilustrativo",
          },
          {
            title: "Épocas",
            value: String(run.config.epochs),
            foot: "Simulación completada",
          },
          {
            title: "Muestras test",
            value: String(ev?.samples || 0),
            foot: "Registros sintéticos",
          },
        ],
  );
  infoCards([
    {
      title: "Contexto del proyecto",
      fields: [
        ["Problema", run.project.problem],
        ["Arquitectura", run.architecture.name],
        [
          "Modelo / versión",
          model ? `${model.name} / ${model.version}` : "Sin versión registrada",
        ],
      ],
    },
    {
      title: "Ficha del dataset",
      fields: [
        ["Archivo", run.dataset.name],
        [
          "Dimensiones",
          `${run.dataset.rows} filas sintéticas / ${run.dataset.columns.length - 1} entradas`,
        ],
        ["Variable objetivo", run.dataset.target],
      ],
    },
  ]);
  ensure(36);
  label("PARTICIÓN DE LOS DATOS", margin, y, 7, true, C.teal);
  y += 6;
  const split = splitRows(run.dataset.rows);
  let x = margin;
  (
    [
      ["Train", 0.7, split.train, C.teal],
      ["Validation", 0.15, split.val, C.violet],
      ["Test", 0.15, split.test, C.amber],
    ] as [string, number, number, RGB][]
  ).forEach(([name, ratio, count, color]) => {
    const w = width * ratio;
    rect(x, y, w - 0.6, 9, color, 1);
    label(
      `${Math.round(ratio * 100)}%`,
      x + w / 2,
      y + 6,
      8,
      true,
      C.white,
      "center",
    );
    label(
      `${name}: ${count}`,
      x + (name === "Train" ? 0 : 1),
      y + 15,
      6.5,
      true,
      C.muted,
    );
    x += w;
  });
  y += 26;
  paragraph(
    "Alcance: resultados sintéticos para una exposición académica. No se ejecuta entrenamiento real ni se acredita rendimiento clínico o comercial.",
    8,
  );

  // Architecture page: neural topology, layer table and configuration cards.
  newPage("02 / DISEÑO DEL EXPERIMENTO", "Arquitectura y configuración");
  paragraph(
    `${run.architecture.name} / Familia ${run.architecture.family}`,
    11,
    C.ink,
  );
  const counts = parameterCounts(
    run.architecture,
    run.dataset.columns.length - 1,
  );
  ensure(59);
  rect(margin, y, width, 49, C.navy);
  label(
    "TOPOLOGÍA NEURONAL / REPRESENTACIÓN SIMPLIFICADA",
    margin + 5,
    y + 8,
    6.5,
    true,
    C.cyan,
  );
  const nodes = [
    { type: "Entrada", units: run.dataset.columns.length - 1 },
    ...run.architecture.layers,
  ];
  const step = (width - 23) / Math.max(1, nodes.length - 1);
  const nodeX = (i: number) => margin + 11 + i * step;
  const nodeYs = (units: number) =>
    Array.from({ length: Math.min(3, units || 1) }, (_, i) => y + 19 + i * 7);
  doc.setDrawColor(47, 76, 96);
  doc.setLineWidth(0.25);
  nodes
    .slice(1)
    .forEach((n, i) =>
      nodeYs(nodes[i].units).forEach((a) =>
        nodeYs(n.units).forEach((b) => doc.line(nodeX(i), a, nodeX(i + 1), b)),
      ),
    );
  nodes.forEach((n, i) => {
    doc.setFillColor(...C.navy);
    doc.setDrawColor(...(i ? C.cyan : C.white));
    nodeYs(n.units).forEach((at) => doc.circle(nodeX(i), at, 1.65, "FD"));
    const type = n.type === "MaxPooling2D" ? "Pooling" : n.type;
    label(
      type,
      nodeX(i),
      y + 40,
      nodes.length > 8 ? 5.6 : 6.5,
      true,
      C.white,
      "center",
    );
    label(
      n.type === "Dropout" ? "Regularización" : `${n.units} unidades`,
      nodeX(i),
      y + 45,
      5.3,
      false,
      C.cyan,
      "center",
    );
  });
  y += 56;
  section("A", "Especificación de capas");
  table(
    ["CAPA", "TIPO", "UNIDADES", "ACTIVACIÓN", "PARÁMETROS"],
    run.architecture.layers.map((l, i) => [
      String(i + 1).padStart(2, "0"),
      l.type,
      ["Dropout", "Flatten", "MaxPooling2D"].includes(l.type)
        ? l.type === "Dropout"
          ? `Rate ${l.rate}`
          : "-"
        : String(l.units),
      ["Dropout", "Flatten", "MaxPooling2D"].includes(l.type)
        ? "-"
        : l.activation,
      counts[i].toLocaleString("es-PE"),
    ]),
    [17, 48, 33, 37, 39],
  );
  paragraph(
    `Total de parámetros ilustrativos: ${counts.reduce((a, b) => a + b, 0).toLocaleString("es-PE")}. Los conteos de CNN/RNN/GAN son simplificados; no se validan tensores reales.`,
    8,
  );
  ensure(63);
  section("B", "Parámetros de simulación");
  metricCards([
    {
      title: "Épocas",
      value: String(run.config.epochs),
      foot: "Iteraciones demostrativas",
    },
    {
      title: "Batch size",
      value: String(run.config.batch),
      foot: "Configuración guardada",
    },
    {
      title: "Optimizador",
      value: run.config.optimizer,
      foot: "Selección ilustrativa",
    },
    {
      title: "Learning rate",
      value: String(run.config.learningRate),
      foot: "Configuración guardada",
    },
  ]);
  paragraph(
    `Inicio: ${time(run.startedAt)} / Finalización: ${run.endedAt ? time(run.endedAt) : "En curso"}.`,
    8,
  );

  // Results page: vector charts, confusion matrix and version provenance.
  newPage("03 / EVALUACIÓN Y GOBIERNO", "Resultados y trazabilidad");
  if (options.includeCharts) {
    const chart = (
      x: number,
      at: number,
      title: string,
      keys: ["loss" | "accuracy", "valLoss" | "valAccuracy"],
      colors: [RGB, RGB],
    ) => {
      const w = 84,
        h = 58;
      rect(x, at, w, h);
      label(title, x + 5, at + 9, 10, true);
      const px = x + 13,
        py = at + 15,
        pw = w - 19,
        ph = 28;
      for (const v of [0, 0.5, 1]) {
        const yy = py + ph * (1 - v);
        rule(px, yy, px + pw);
        label(v.toFixed(1), px - 3, yy + 1, 6, false, C.muted, "right");
      }
      label("1", px, py + ph + 5, 6, false, C.muted);
      label(
        String(run.config.epochs),
        px + pw,
        py + ph + 5,
        6,
        false,
        C.muted,
        "right",
      );
      label("Época", px + pw / 2, py + ph + 5, 6, false, C.muted, "center");
      keys.forEach((key, j) => {
        doc.setDrawColor(...colors[j]);
        doc.setLineWidth(0.7);
        const point = (i: number) => [
          px + (i / Math.max(1, run.metrics.length - 1)) * pw,
          py + ph * (1 - Math.min(1, Math.max(0, run.metrics[i][key]))),
        ];
        for (let i = 1; i < run.metrics.length; i++) {
          const a = point(i - 1),
            b = point(i);
          doc.line(a[0], a[1], b[0], b[1]);
        }
        if (run.metrics.length === 1) {
          const a = point(0);
          doc.setFillColor(...colors[j]);
          doc.circle(a[0], a[1], 0.8, "F");
        }
        const lx = x + 7 + j * 37;
        doc.setDrawColor(...colors[j]);
        doc.line(lx, at + 52, lx + 5, at + 52);
        label(
          j ? "Validation" : "Training",
          lx + 7,
          at + 53,
          6.3,
          false,
          C.muted,
        );
      });
    };
    ensure(66);
    chart(
      margin,
      y,
      "Curva de pérdida / Loss",
      ["loss", "valLoss"],
      [C.coral, C.amber],
    );
    chart(
      108,
      y,
      ev?.matrix.length ? "Accuracy ilustrativa" : "Indicador ilustrativo",
      ["accuracy", "valAccuracy"],
      [C.teal, C.violet],
    );
    y += 66;
  }
  if (ev?.matrix.length) {
    section(
      "A",
      "Matriz de confusión",
      `${ev.samples} muestras sintéticas / Los indicadores se derivan de estos conteos.`,
    );
    const k = ev.matrix.length;
    if (k <= 6)
      table(
        ["REAL / PREDICHO", ...ev.labels],
        ev.matrix.map((row, i) => [ev.labels[i], ...row.map(String)]),
        [42, ...Array(k).fill(132 / k)],
      );
    else
      paragraph(
        `Matriz de ${k} clases. Consulta el módulo de Evaluación para ver todos sus conteos.`,
        8,
      );
  } else {
    section("A", "Evaluación ilustrativa");
    paragraph(
      `Loss: ${ev?.loss.toFixed(4) || "-"} / MAE: ${ev?.mae.toFixed(3) || "-"}. La matriz de confusión no se aplica a esta demostración de regresión o generación.`,
      9,
    );
  }
  section("B", "Registro de la versión");
  paragraph(
    model
      ? `${model.name} / ${model.version} / Estado: ${model.status}`
      : "Esta ejecución no tiene una versión de modelo registrada.",
    10,
    C.ink,
  );
  if (model?.history.length)
    table(
      ["FECHA", "ESTADO", "RESPONSABLE"],
      model.history.map((h) => [time(h.at), h.status, h.actor]),
      [53, 48, 73],
    );
  const notes = [model?.notes, options.notes].filter(Boolean).join("\n");
  if (notes) {
    section("C", "Observaciones");
    paragraph(notes, 8.5);
  }

  if (options.includeLogs) {
    newPage("ANEXO / HISTORIAL DE LA SIMULACIÓN", "Bitácora de ejecución");
    paragraph(
      "Registro completo de eventos y épocas de la ejecución seleccionada.",
      9,
    );
    table(
      ["N°", "EVENTO DEMOSTRATIVO"],
      run.logs.map((log, i) => [String(i + 1).padStart(2, "0"), log]),
      [14, 160],
    );
  }
  const pages = doc.getNumberOfPages();
  for (let p = 1; p <= pages; p++) {
    doc.setPage(p);
    label(`Ref. ${run.id}`, margin, 277, 5.5, false, C.muted);
    rule(margin, 281, 192);
    label("NEUROLAB ENTERPRISE", margin, 286, 6.5, true, C.teal);
    label("Datos simulados / Uso académico", margin, 290, 6, false, C.muted);
    label(
      `${String(p).padStart(2, "0")} / ${String(pages).padStart(2, "0")}`,
      192,
      287,
      8,
      true,
      C.ink,
      "right",
    );
  }
  doc.setProperties({
    title: `Informe de simulación - ${run.project.name}`,
    subject: "Prototipo demostrativo. Datos simulados.",
    author: "NeuroLab Enterprise",
    creator: "NeuroLab Enterprise / Reportes",
  });
  return {
    format: "PDF",
    blob: doc.output("blob"),
    filename: `DEMO_reporte_${run.id}.pdf`,
    createdAt,
    project: run.project.name,
    dataset: run.dataset.name,
    version: model?.version || "Sin versión",
    pages,
    runId: run.id,
  };
}
