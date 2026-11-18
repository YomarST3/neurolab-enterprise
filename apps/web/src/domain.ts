export const ROLES = [
  "Administrador",
  "Responsable de proyecto",
  "Ingeniero de IA",
  "Revisor",
  "Lector",
] as const;
export type Role = (typeof ROLES)[number];
export type Family = "Feedforward" | "CNN" | "RNN" | "GAN";
export type Problem =
  | "Clasificación binaria"
  | "Clasificación multiclase"
  | "Regresión"
  | "Generación";
export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  active: boolean;
}
export interface Project {
  id: string;
  name: string;
  description: string;
  family: Family;
  problem: Problem;
  tags: string[];
  status: "Borrador" | "Activo" | "Completado" | "Archivado";
  members: { userId: string; role: Role }[];
  createdAt: string;
}
export interface Column {
  name: string;
  type: "Numérico" | "Categoría";
  min: number;
  max: number;
  mean: number;
  std: number;
  nulls: number;
}
export interface Dataset {
  id: string;
  projectId: string;
  name: string;
  rows: number;
  bytes: number;
  format: string;
  columns: Column[];
  target: string;
  preview: Record<string, string | number>[];
  cleaning: { impute: boolean; normalize: boolean; duplicates: boolean };
  createdAt: string;
  source: "Ejemplo" | "Archivo demostrativo";
  preprocessed: boolean;
}
export interface Layer {
  id: string;
  type:
    | "Dense"
    | "Dropout"
    | "Conv2D"
    | "MaxPooling2D"
    | "Flatten"
    | "LSTM"
    | "SimpleRNN";
  units: number;
  activation: string;
  rate: number;
  kernel: number;
}
export interface Architecture {
  id: string;
  projectId: string;
  name: string;
  family: Family;
  layers: Layer[];
  createdAt: string;
}
export interface Metric {
  epoch: number;
  loss: number;
  valLoss: number;
  accuracy: number;
  valAccuracy: number;
}
export type RunStatus =
  | "En cola"
  | "Preparando"
  | "Entrenando"
  | "Calculando métricas"
  | "Completado"
  | "Cancelado";
export interface Evaluation {
  accuracy: number;
  precision: number;
  recall: number;
  f1: number;
  loss: number;
  mae: number;
  matrix: number[][];
  labels: string[];
  samples: number;
}
export interface Run {
  id: string;
  projectId: string;
  dataset: Dataset;
  architecture: Architecture;
  project: Project;
  config: {
    epochs: number;
    batch: number;
    optimizer: string;
    learningRate: number;
  };
  status: RunStatus;
  metrics: Metric[];
  evaluation?: Evaluation;
  logs: string[];
  startedAt: string;
  endedAt?: string;
  stageTicks: number;
}
export type ModelStatus = "Borrador" | "En revisión" | "Aprobado" | "Retirado";
export interface Model {
  id: string;
  projectId: string;
  runId: string;
  name: string;
  version: string;
  status: ModelStatus;
  createdAt: string;
  history: { at: string; status: ModelStatus; actor: string }[];
  notes: string;
}
export interface Audit {
  id: string;
  at: string;
  actor: string;
  projectId?: string;
  action: string;
  detail: string;
}
export const PERMISSIONS = [
  { key: "projects", label: "Gestionar proyectos" },
  { key: "datasets", label: "Editar datasets" },
  { key: "architectures", label: "Diseñar redes" },
  { key: "training", label: "Entrenar" },
  { key: "models", label: "Registrar modelos" },
  { key: "approve", label: "Aprobar / retirar" },
  { key: "admin", label: "Administrar" },
] as const;
export type Permission = (typeof PERMISSIONS)[number]["key"];
export type RolePermissions = Record<Permission, boolean>;
export const ROLE_DESCRIPTIONS: Record<Role, string> = {
  Administrador: "Gestiona todos los módulos, usuarios y permisos.",
  "Responsable de proyecto":
    "Gestiona proyectos, integrantes y estados. Consulta el trabajo técnico y sus resultados.",
  "Ingeniero de IA":
    "Prepara datasets, diseña redes, ejecuta entrenamientos y registra versiones de modelos.",
  Revisor:
    "Consulta la información técnica y aprueba o retira versiones de modelos.",
  Lector: "Consulta, compara y exporta información, sin modificar registros.",
};
export const defaultPermissions = (): Record<Role, RolePermissions> =>
  Object.fromEntries(
    ROLES.map((role) => [
      role,
      Object.fromEntries(
        PERMISSIONS.map(({ key }) => [
          key,
          role === "Administrador" ||
            (role === "Responsable de proyecto" && key === "projects") ||
            (role === "Ingeniero de IA" &&
              ["datasets", "architectures", "training", "models"].includes(
                key,
              )) ||
            (role === "Revisor" && key === "approve"),
        ]),
      ),
    ]),
  ) as Record<Role, RolePermissions>;

/** Upgrades the former shared edit flag without resetting projects or custom grants. */
export function normalizePermissions(
  input: unknown,
): Record<Role, RolePermissions> {
  const defaults = defaultPermissions();
  if (!input || typeof input !== "object") return defaults;
  for (const role of ROLES) {
    const old = (input as Record<string, unknown>)[role];
    if (!old || typeof old !== "object") continue;
    const values = old as Record<string, unknown>;
    if (!("projects" in values) && typeof values.edit === "boolean") {
      const wasDefaultEditor = [
        "Administrador",
        "Responsable de proyecto",
        "Ingeniero de IA",
      ].includes(role);
      if (values.edit !== wasDefaultEditor)
        for (const key of [
          "projects",
          "datasets",
          "architectures",
          "training",
          "models",
        ] as const)
          defaults[role][key] = values.edit;
    }
    for (const { key } of PERMISSIONS)
      if (typeof values[key] === "boolean") defaults[role][key] = values[key];
  }
  defaults.Administrador.admin = true;
  return defaults;
}
export const canAccessModule = (path: string, permissions: RolePermissions) =>
  path.toLowerCase().replace(/\/+$/, "") !== "/admin" || permissions.admin;
export function availableModelTransitions(
  status: ModelStatus,
  permissions: Pick<RolePermissions, "models" | "approve">,
): ModelStatus[] {
  const transitions: Record<ModelStatus, ModelStatus[]> = {
    Borrador: ["En revisión"],
    "En revisión": ["Borrador", "Aprobado", "Retirado"],
    Aprobado: ["Retirado"],
    Retirado: ["Borrador"],
  };
  return transitions[status].filter((next) =>
    next === "Aprobado" || next === "Retirado"
      ? permissions.approve
      : permissions.models,
  );
}
export interface Settings {
  organization: string;
  maxEpochs: number;
  maxConcurrent: number;
  memory: number;
  compact: boolean;
  permissions: ReturnType<typeof defaultPermissions>;
}
export interface Store {
  schema: 2;
  projects: Project[];
  datasets: Dataset[];
  architectures: Architecture[];
  runs: Run[];
  models: Model[];
  users: User[];
  audit: Audit[];
  activeProjectId: string;
  settings: Settings;
}
export const uid = (prefix = "id") =>
  `${prefix}_${globalThis.crypto?.randomUUID?.() || Math.random().toString(36).slice(2)}`;
export const now = () => new Date().toISOString();
export const copy = <T>(value: T): T => JSON.parse(JSON.stringify(value));
export const splitRows = (rows: number) => {
  const train = Math.floor(rows * 0.7),
    val = Math.floor(rows * 0.15);
  return { train, val, test: rows - train - val };
};
export const isActive = (r: Run) =>
  !["Completado", "Cancelado"].includes(r.status);
export const pct = (n: number) => `${(n * 100).toFixed(1)}%`;
export const time = (s: string) =>
  new Date(s).toLocaleString("es-PE", {
    timeZone: "America/Lima",
    dateStyle: "short",
    timeStyle: "short",
  });
export const layer = (
  type: Layer["type"],
  units: number,
  activation = "relu",
): Layer => ({
  id: uid("layer"),
  type,
  units,
  activation,
  rate: 0.2,
  kernel: 3,
});
export function template(family: Family, outputs = 1): Layer[] {
  const out = layer("Dense", outputs, outputs > 1 ? "softmax" : "sigmoid");
  if (family === "CNN")
    return [
      layer("Conv2D", 16),
      layer("MaxPooling2D", 2),
      layer("Flatten", 1),
      layer("Dense", 32),
      out,
    ];
  if (family === "RNN")
    return [layer("LSTM", 32, "tanh"), layer("Dropout", 1), out];
  if (family === "GAN")
    return [layer("Dense", 32), layer("Dense", 64), layer("Dense", 8, "tanh")];
  return [layer("Dense", 16), layer("Dropout", 1), layer("Dense", 8), out];
}
export function parameterCounts(arch: Architecture, inputs: number) {
  let previous = inputs;
  return arch.layers.map((l) => {
    let n = 0;
    if (l.type === "Dense") {
      n = (previous + 1) * l.units;
      previous = l.units;
    }
    if (l.type === "Conv2D") {
      n = (l.kernel ** 2 * previous + 1) * l.units;
      previous = l.units;
    }
    if (l.type === "LSTM") {
      n = 4 * l.units * (previous + l.units + 1);
      previous = l.units;
    }
    if (l.type === "SimpleRNN") {
      n = l.units * (previous + l.units + 1);
      previous = l.units;
    }
    return n;
  });
}
export const sampleSpecs = [
  {
    key: "ecg",
    name: "Arrhythmia_ECG_Demo.csv",
    rows: 750,
    features: [
      "heart_rate",
      "pr_interval",
      "qrs_duration",
      "qt_interval",
      "st_elevation",
      "t_wave",
      "age",
      "systolic_bp",
    ],
    target: "has_arrhythmia",
  },
  {
    key: "iris",
    name: "Iris_Flowers_Demo.csv",
    rows: 150,
    features: ["sepal_length", "sepal_width", "petal_length", "petal_width"],
    target: "species",
  },
  {
    key: "housing",
    name: "Housing_Demo.csv",
    rows: 1200,
    features: ["income", "rooms", "age", "population", "latitude", "longitude"],
    target: "price",
  },
  {
    key: "churn",
    name: "Customer_Churn_Demo.csv",
    rows: 1000,
    features: [
      "tenure",
      "monthly_charge",
      "total_charge",
      "contracts",
      "support",
      "services",
      "age",
    ],
    target: "churn",
  },
];
export function makeDataset(
  projectId: string,
  key = "ecg",
  file?: { name: string; size: number },
): Dataset {
  const spec = sampleSpecs.find((s) => s.key === key) || sampleSpecs[0];
  const columns: Column[] = [...spec.features, spec.target].map((name, i) => ({
    name,
    type: name === "species" ? "Categoría" : "Numérico",
    min: i === spec.features.length ? 0 : i + 1,
    max:
      i === spec.features.length
        ? key === "iris"
          ? 2
          : key === "housing"
            ? 500000
            : 1
        : (i + 1) * 25,
    mean: i === spec.features.length ? 0.48 : (i + 1) * 10,
    std: (i + 1) * 2.1,
    nulls: i % 3 === 0 ? 2 : 0,
  }));
  return {
    id: uid("ds"),
    projectId,
    name: file?.name || spec.name,
    rows: spec.rows,
    bytes: file?.size ?? spec.rows * columns.length * 8,
    format: "CSV",
    columns,
    target: spec.target,
    preview: Array.from({ length: 5 }, (_, r) =>
      Object.fromEntries(
        columns.map((c, i) => [
          c.name,
          i === columns.length - 1
            ? r % (key === "iris" ? 3 : 2)
            : +(c.mean * (0.8 + r * 0.1)).toFixed(2),
        ]),
      ),
    ),
    cleaning: { impute: true, normalize: true, duplicates: true },
    createdAt: now(),
    source: file ? "Archivo demostrativo" : "Ejemplo",
    preprocessed: false,
  };
}
export function validateArchitecture(
  arch: Architecture,
  problem: Problem,
): string | null {
  if (!arch.name.trim()) return "Escribe un nombre para la arquitectura.";
  if (arch.layers.length < 2) return "Añade al menos dos capas.";
  if (
    arch.layers.some(
      (l) =>
        !Number.isFinite(l.units) ||
        l.units < 1 ||
        l.units > 512 ||
        l.rate < 0 ||
        l.rate >= 1,
    )
  )
    return "Las unidades deben estar entre 1 y 512 y dropout entre 0 y 0.99.";
  const last = arch.layers.at(-1)!;
  if (last.type !== "Dense") return "La última capa debe ser Dense.";
  if (
    arch.family === "CNN" &&
    (!arch.layers.some((l) => l.type === "Conv2D") ||
      !arch.layers.some((l) => l.type === "Flatten"))
  )
    return "La plantilla CNN necesita Conv2D y Flatten.";
  if (
    arch.family === "RNN" &&
    !arch.layers.some((l) => ["LSTM", "SimpleRNN"].includes(l.type))
  )
    return "La plantilla RNN necesita una capa recurrente.";
  if (
    arch.family !== "GAN" &&
    problem === "Clasificación binaria" &&
    (last.units !== 1 || last.activation !== "sigmoid")
  )
    return "Para clasificación binaria, usa salida Dense de 1 unidad con sigmoid.";
  if (
    arch.family !== "GAN" &&
    problem === "Clasificación multiclase" &&
    (last.units < 2 || last.activation !== "softmax")
  )
    return "Para multiclase, usa al menos 2 salidas con softmax.";
  if (
    arch.family !== "GAN" &&
    problem === "Regresión" &&
    (last.units !== 1 || last.activation !== "linear")
  )
    return "Para regresión, usa una salida con activación linear.";
  return null;
}
export function createRun(
  project: Project,
  dataset: Dataset,
  architecture: Architecture,
  config: Run["config"],
): Run {
  if (dataset.projectId !== project.id || architecture.projectId !== project.id)
    throw new Error(
      "Dataset y arquitectura deben pertenecer al proyecto activo.",
    );
  if (dataset.columns.length < 2)
    throw new Error("El dataset necesita entradas y objetivo.");
  const error = validateArchitecture(architecture, project.problem);
  if (error) throw new Error(error);
  if (
    !Number.isInteger(config.epochs) ||
    config.epochs < 1 ||
    config.epochs > 100 ||
    !Number.isFinite(config.learningRate) ||
    config.learningRate <= 0 ||
    config.learningRate > 1 ||
    ![8, 16, 32, 64, 128].includes(config.batch) ||
    !["Adam", "SGD", "RMSprop"].includes(config.optimizer)
  )
    throw new Error("Revisa épocas (1–100), batch y learning rate (0–1).");
  return {
    id: uid("run"),
    projectId: project.id,
    project: copy(project),
    dataset: copy(dataset),
    architecture: copy(architecture),
    config: copy(config),
    status: "En cola",
    metrics: [],
    logs: ["[DEMO] Solicitud simulada en cola. No se ejecuta un modelo real."],
    startedAt: now(),
    stageTicks: 0,
  };
}
export function makeEvaluation(run: Run): Evaluation {
  const last = run.metrics.at(-1)!;
  const n = splitRows(run.dataset.rows).test;
  if (
    ["Regresión", "Generación"].includes(run.project.problem) ||
    run.architecture.family === "GAN"
  )
    return {
      accuracy: 0,
      precision: 0,
      recall: 0,
      f1: 0,
      loss: last.valLoss,
      mae: +(last.valLoss * 10).toFixed(3),
      matrix: [],
      labels: [],
      samples: n,
    };
  const k =
    run.project.problem === "Clasificación multiclase"
      ? run.architecture.layers.at(-1)!.units
      : 2;
  const matrix = Array.from({ length: k }, () => Array(k).fill(0) as number[]);
  for (let i = 0; i < n; i++) {
    const actual = i % k;
    const correct = ((i * 37) % 101) / 101 < last.valAccuracy;
    matrix[actual][correct ? actual : (actual + 1) % k]++;
  }
  const accuracy = matrix.reduce((sum, row, i) => sum + row[i], 0) / n;
  const scores = matrix.map((row, i) => {
    const tp = row[i],
      predicted = matrix.reduce((s, r) => s + r[i], 0),
      actual = row.reduce((a, b) => a + b, 0);
    return { p: predicted ? tp / predicted : 0, r: actual ? tp / actual : 0 };
  });
  const precision = scores.reduce((s, v) => s + v.p, 0) / k,
    recall = scores.reduce((s, v) => s + v.r, 0) / k;
  const f1 =
    scores.reduce(
      (s, v) => s + (v.p + v.r ? (2 * v.p * v.r) / (v.p + v.r) : 0),
      0,
    ) / k;
  return {
    accuracy,
    precision,
    recall,
    f1,
    loss: last.valLoss,
    mae: 0,
    matrix,
    labels: Array.from({ length: k }, (_, i) => `Clase ${i}`),
    samples: n,
  };
}
export function advanceRun(original: Run): Run {
  if (!isActive(original)) return original;
  const run = copy(original);
  run.stageTicks++;
  if (run.status === "En cola") {
    run.status = "Preparando";
    run.logs.push(
      "[DEMO] Preparando partición 70/15/15 y arquitectura guardada.",
    );
  } else if (run.status === "Preparando") {
    run.status = "Entrenando";
    run.logs.push(
      `[DEMO] ${run.config.optimizer}, lr=${run.config.learningRate}, batch=${run.config.batch}.`,
    );
  } else if (run.status === "Entrenando") {
    const epoch = run.metrics.length + 1,
      t = epoch / run.config.epochs;
    const gain =
      run.config.optimizer === "Adam"
        ? 0.4
        : run.config.optimizer === "RMSprop"
          ? 0.37
          : 0.34;
    const m: Metric = {
      epoch,
      loss: +(0.08 + 0.75 * Math.exp(-3.2 * t)).toFixed(4),
      valLoss: +(0.11 + 0.77 * Math.exp(-2.9 * t)).toFixed(4),
      accuracy: +(0.52 + gain * (1 - Math.exp(-3.4 * t))).toFixed(4),
      valAccuracy: +(0.5 + gain * (1 - Math.exp(-3.1 * t))).toFixed(4),
    };
    run.metrics.push(m);
    run.logs.push(
      `[DEMO] Época ${epoch}/${run.config.epochs} · loss ${m.loss} · accuracy ${pct(m.accuracy)}.`,
    );
    if (epoch === run.config.epochs) run.status = "Calculando métricas";
  } else if (run.status === "Calculando métricas") {
    run.status = "Completado";
    run.evaluation = makeEvaluation(run);
    run.endedAt = now();
    run.logs.push(
      "[DEMO] Evaluación ficticia completada. Resultados listos para registro y reporte.",
    );
  }
  return run;
}
export function cancelRun(run: Run): Run {
  return isActive(run)
    ? {
        ...run,
        status: "Cancelado",
        endedAt: now(),
        logs: [
          ...run.logs,
          "[DEMO] Cancelado por el usuario. Puede reintentarse como una nueva ejecución.",
        ],
      }
    : run;
}
export function seedStore(): Store {
  const users: User[] = ROLES.map((role, i) => ({
    id: `u${i}`,
    name: [
      "Alex Vance",
      "María Torres",
      "Carlos Méndez",
      "Elena Ramos",
      "Sofía Vega",
    ][i],
    email: ["alex", "maria", "carlos", "elena", "sofia"][i] + "@demo.neurolab",
    role,
    active: true,
  }));
  const projects: Project[] = [
    "Detección de arritmias",
    "Clasificación de flores Iris",
    "Precios inmobiliarios",
    "Predicción de churn",
  ].map((name, i) => ({
    id: `p${i}`,
    name,
    description: [
      "Demostración académica con variables ECG sintéticas.",
      "Clasificación ilustrativa en tres clases de flores.",
      "Estimación ilustrativa de precios de viviendas.",
      "Clasificación de abandono de clientes con datos ficticios.",
    ][i],
    family: "Feedforward",
    problem:
      i === 1
        ? "Clasificación multiclase"
        : i === 2
          ? "Regresión"
          : "Clasificación binaria",
    tags: [["Salud", "ECG"], ["Botánica"], ["Finanzas"], ["Telecom"]][i],
    status: "Activo",
    members: [
      { userId: "u0", role: "Administrador" },
      { userId: "u2", role: "Ingeniero de IA" },
    ],
    createdAt: now(),
  }));
  const datasets = projects.map((p, i) =>
    makeDataset(p.id, sampleSpecs[i].key),
  );
  const architectures: Architecture[] = projects.map((p, i) => {
    const layers = template(p.family, i === 1 ? 3 : 1);
    if (i === 2) layers.at(-1)!.activation = "linear";
    return {
      id: `a${i}`,
      projectId: p.id,
      name: `MLP-${sampleSpecs[i].key}-v1`,
      family: p.family,
      layers,
      createdAt: now(),
    };
  });
  const runs = projects.slice(0, 2).map((p, i) => {
    let r = createRun(p, datasets[i], architectures[i], {
      epochs: 10,
      batch: 16,
      optimizer: "Adam",
      learningRate: 0.005,
    });
    while (isActive(r)) r = advanceRun(r);
    return r;
  });
  const models: Model[] = runs.map((r, i) => ({
    id: `m${i}`,
    projectId: r.projectId,
    runId: r.id,
    name: `${r.project.name} · demo`,
    version: "v1.0.0",
    status: i ? "En revisión" : "Aprobado",
    createdAt: now(),
    notes: "Versión semilla para la presentación. No contiene pesos reales.",
    history: [
      {
        at: now(),
        status: i ? "En revisión" : "Aprobado",
        actor: "Datos semilla",
      },
    ],
  }));
  return {
    schema: 2,
    projects,
    datasets,
    architectures,
    runs,
    models,
    users,
    audit: [
      {
        id: uid("audit"),
        at: now(),
        actor: "Sistema demo",
        action: "DEMO_INICIALIZADA",
        detail:
          "Datos sintéticos coherentes. No hay conexión con servicios de IA.",
      },
    ],
    activeProjectId: projects[0].id,
    settings: {
      organization: "NeuroLab Enterprise",
      maxEpochs: 100,
      maxConcurrent: 2,
      memory: 4096,
      compact: false,
      permissions: defaultPermissions(),
    },
  };
}
