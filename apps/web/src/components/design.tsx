import { useContext, useState } from "react";
import { Link } from "react-router-dom";
import { Plus, Save, Trash2, Upload, ArrowDown, Layers } from "lucide-react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import {
  copy,
  layer,
  makeDataset,
  now,
  parameterCounts,
  sampleSpecs,
  splitRows,
  template,
  uid,
  validateArchitecture,
  type Architecture,
  type Dataset,
  type Family,
  type Layer,
} from "../domain";
import {
  mockArchitectureService,
  mockDatasetService,
  useDemo,
} from "../services/mock";
import { PermissionAction, ConsultationNotice } from "./access";
import {
  Badge,
  Card,
  Empty,
  Field,
  NotifyContext,
  Stats,
  useAction,
} from "./ui";
const familyInfo: Record<
  Family,
  { title: string; description: string; structure: string; example: string }
> = {
  Feedforward: {
    title: "Feedforward / MLP",
    description:
      "La información avanza desde las entradas hasta la salida, sin ciclos.",
    structure: "Entrada → Dense → Dense → Salida",
    example: "Tablas, clasificación y regresión.",
  },
  CNN: {
    title: "Convolucional / CNN",
    description:
      "Los filtros detectan patrones locales; pooling reduce la resolución.",
    structure: "Imagen → Conv2D → Pooling → Flatten → Dense",
    example: "Imágenes y reconocimiento de objetos.",
  },
  RNN: {
    title: "Recurrente / RNN",
    description:
      "Procesa secuencias conservando información de pasos anteriores. LSTM incorpora memoria y compuertas.",
    structure: "Secuencia → LSTM → Dense → Salida",
    example: "Series temporales, texto y señales.",
  },
  GAN: {
    title: "Generativa adversaria / GAN",
    description:
      "Un generador propone muestras y un discriminador intenta distinguirlas de ejemplos reales.",
    structure: "Ruido → Generador ⇄ Discriminador",
    example: "Síntesis de imágenes y generación de datos.",
  },
};
export function Fundamentals() {
  const [tab, setTab] = useState("Neurona interactiva"),
    [inputs, setInputs] = useState([0.8, -0.5, 1.2]),
    [weights, setWeights] = useState([1.5, 2, -1.2]),
    [bias, setBias] = useState(-0.3),
    [activation, setActivation] = useState("Sigmoid");
  const z = inputs.reduce((s, x, i) => s + x * weights[i], bias);
  const fn = (x: number) =>
    activation === "ReLU"
      ? Math.max(0, x)
      : activation === "Tanh"
        ? Math.tanh(x)
        : 1 / (1 + Math.exp(-x));
  const soft = [z, 0.5, -0.5].map((x) => Math.exp(x - Math.max(z, 0.5, -0.5))),
    sum = soft.reduce((a, b) => a + b, 0);
  const curve = Array.from({ length: 61 }, (_, i) => {
    const x = (i - 30) / 10;
    return { x, y: fn(x) };
  });
  return (
    <>
      <div className="tabs">
        {[
          "Neurona interactiva",
          "Activaciones",
          "Familias de redes",
          "Glosario",
        ].map((t) => (
          <button
            className={tab === t ? "active" : ""}
            key={t}
            onClick={() => setTab(t)}
          >
            {t}
          </button>
        ))}
      </div>
      {tab === "Neurona interactiva" && (
        <>
          <div className="notice">
            Una red neuronal es un conjunto de neuronas artificiales conectadas
            que transforma entradas en salidas. Su importancia en IA está en
            aprender patrones para clasificación, predicción y generación. Aquí
            solo se demuestra el cálculo de una neurona.
          </div>
          <div className="two-col">
            <Card
              title="Entradas, pesos y sesgo"
              subtitle="Mueve los controles para observar el cálculo en tiempo real."
            >
              {inputs.map((v, i) => (
                <div className="two-col" key={i}>
                  <Field label={`Entrada x${i + 1}: ${v.toFixed(1)}`}>
                    <input
                      type="range"
                      min="-2"
                      max="2"
                      step="0.1"
                      value={v}
                      onChange={(e) =>
                        setInputs(
                          inputs.map((x, j) => (j === i ? +e.target.value : x)),
                        )
                      }
                    />
                  </Field>
                  <Field label={`Peso w${i + 1}: ${weights[i].toFixed(1)}`}>
                    <input
                      type="range"
                      min="-3"
                      max="3"
                      step="0.1"
                      value={weights[i]}
                      onChange={(e) =>
                        setWeights(
                          weights.map((x, j) =>
                            j === i ? +e.target.value : x,
                          ),
                        )
                      }
                    />
                  </Field>
                </div>
              ))}
              <Field label={`Sesgo b: ${bias.toFixed(1)}`}>
                <input
                  type="range"
                  min="-3"
                  max="3"
                  step="0.1"
                  value={bias}
                  onChange={(e) => setBias(+e.target.value)}
                />
              </Field>
              <Field label="Función de activación">
                <select
                  value={activation}
                  onChange={(e) => setActivation(e.target.value)}
                >
                  {["ReLU", "Sigmoid", "Tanh", "Softmax"].map((v) => (
                    <option key={v}>{v}</option>
                  ))}
                </select>
              </Field>
            </Card>
            <Card title="Cálculo de la neurona">
              <div className="formula">
                z = Σ(wᵢ × xᵢ) + b = <strong>{z.toFixed(3)}</strong>
              </div>
              <svg
                viewBox="0 0 450 170"
                className="neuron-diagram"
                role="img"
                aria-label="Tres entradas con pesos conectadas a suma y activación"
              >
                {[35, 85, 135].map((y, i) => (
                  <g key={i}>
                    <line
                      x1="60"
                      y1={y}
                      x2="200"
                      y2="85"
                      stroke="#22d3ee"
                      strokeWidth="2"
                    />
                    <circle
                      cx="40"
                      cy={y}
                      r="19"
                      fill="var(--surface)"
                      stroke="#22d3ee"
                    />
                    <text
                      x="40"
                      y={y + 5}
                      textAnchor="middle"
                      fill="var(--text)"
                    >
                      x{i + 1}
                    </text>
                  </g>
                ))}
                <line
                  x1="220"
                  y1="85"
                  x2="395"
                  y2="85"
                  stroke="#818cf8"
                  strokeWidth="3"
                />
                <circle
                  cx="210"
                  cy="85"
                  r="26"
                  fill="var(--surface)"
                  stroke="#22d3ee"
                />
                <text
                  x="210"
                  y="92"
                  textAnchor="middle"
                  fill="#22d3ee"
                  fontSize="24"
                >
                  Σ
                </text>
                <circle
                  cx="325"
                  cy="85"
                  r="28"
                  fill="var(--surface)"
                  stroke="#818cf8"
                />
                <text x="325" y="90" textAnchor="middle" fill="var(--text)">
                  g(z)
                </text>
                <circle cx="410" cy="85" r="19" fill="#34d399" />
                <text x="410" y="90" textAnchor="middle" fill="#102118">
                  y
                </text>
              </svg>
              <div className="output-value">
                {activation === "Softmax"
                  ? soft.map((x) => (x / sum).toFixed(3)).join(" / ")
                  : fn(z).toFixed(4)}
              </div>
              <p className="muted small">
                {activation === "Softmax"
                  ? "Probabilidades sobre el vector [z, 0.5, −0.5]. Su suma es 1."
                  : `Salida de la neurona aplicando ${activation} a z.`}
              </p>
            </Card>
          </div>
          <Card title="Estructura de una red">
            <div className="three-col">
              {[
                ["Entrada", "Recibe las características del dataset."],
                [
                  "Capas ocultas",
                  "Combinan entradas mediante pesos, sesgos y activaciones.",
                ],
                ["Salida", "Representa una clase, valor o contenido generado."],
              ].map(([t, d]) => (
                <div className="notice" key={t}>
                  <h3>{t}</h3>
                  <p className="muted">{d}</p>
                </div>
              ))}
            </div>
            <p className="muted small">
              Las conexiones transportan señales ponderadas. El entrenamiento
              real ajustaría pesos y sesgos; este prototipo no entrena modelos.
            </p>
          </Card>
        </>
      )}
      {tab === "Activaciones" && (
        <div className="two-col">
          <Card title="Explora las funciones">
            <Field label="Activación">
              <select
                value={activation}
                onChange={(e) => setActivation(e.target.value)}
              >
                {["ReLU", "Sigmoid", "Tanh", "Softmax"].map((v) => (
                  <option key={v}>{v}</option>
                ))}
              </select>
            </Field>
            {activation === "Softmax" ? (
              <div className="notice">
                Softmax convierte un vector de valores en probabilidades:
                exp(zᵢ) / Σexp(zⱼ). Pruébala en la neurona interactiva.
              </div>
            ) : (
              <div className="chart">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={curve}>
                    <CartesianGrid stroke="var(--border)" />
                    <XAxis dataKey="x" stroke="var(--muted)" />
                    <YAxis stroke="var(--muted)" />
                    <Tooltip contentStyle={{ background: "var(--card)" }} />
                    <Line dataKey="y" stroke="#22d3ee" dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </Card>
          <Card title="Cuándo utilizar cada función">
            <div className="timeline">
              {[
                [
                  "ReLU",
                  "max(0,z). Habitual en capas ocultas; conserva valores positivos.",
                ],
                [
                  "Sigmoid",
                  "1/(1+exp(−z)). Salida entre 0 y 1, útil en clasificación binaria.",
                ],
                [
                  "Tanh",
                  "Salida entre −1 y 1; común en estructuras recurrentes.",
                ],
                [
                  "Softmax",
                  "Probabilidades que suman 1; salida de clasificación multiclase.",
                ],
              ].map(([n, d]) => (
                <div key={n}>
                  <h3>{n}</h3>
                  <p className="muted">{d}</p>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}
      {tab === "Familias de redes" && (
        <div className="two-col">
          {Object.entries(familyInfo).map(([k, v]) => (
            <Card title={v.title} key={k}>
              <p>{v.description}</p>
              <div className="formula small">{v.structure}</div>
              <p className="muted">{v.example}</p>
              <Link className="text-link" to="/architectures">
                Explorar diseñador →
              </Link>
            </Card>
          ))}
        </div>
      )}
      {tab === "Glosario" && (
        <div className="two-col">
          {[
            ["Peso", "Controla cuánto influye una entrada en la neurona."],
            [
              "Sesgo",
              "Desplaza la suma ponderada y permite ajustar el umbral de activación.",
            ],
            ["Época", "Un recorrido por los datos de entrenamiento."],
            ["Batch size", "Cantidad de ejemplos procesados en cada lote."],
            [
              "Learning rate",
              "Tamaño de los pasos de actualización de parámetros.",
            ],
            [
              "Backpropagation",
              "Calcula gradientes del error para ajustar los pesos.",
            ],
            [
              "Overfitting",
              "Un modelo se adapta demasiado al entrenamiento y generaliza peor.",
            ],
            [
              "Train / Validation / Test",
              "Datos para ajustar, elegir configuración y evaluar, respectivamente.",
            ],
          ].map(([t, d]) => (
            <Card title={t} key={t}>
              <p className="muted">{d}</p>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
function Topology({
  arch,
  inputs,
  selected,
  select,
}: {
  arch: Architecture;
  inputs: number;
  selected: string;
  select: (id: string) => void;
}) {
  const cols = [
    { id: "input", type: "Entrada", units: inputs },
    ...arch.layers,
  ];
  const width = Math.max(640, cols.length * 120);
  const x = (i: number) =>
    55 + (i * (width - 110)) / Math.max(1, cols.length - 1);
  const ys = (units: number) =>
    Array.from(
      { length: Math.min(5, units || 1) },
      (_, i) => 65 + (i * 120) / Math.max(1, Math.min(5, units || 1) - 1),
    );
  return (
    <div className="topology-scroll">
      <svg
        viewBox={`0 0 ${width} 260`}
        style={{ minWidth: Math.min(width, 700) }}
        role="img"
        aria-label={`Diagrama de arquitectura ${arch.family}`}
      >
        {cols
          .slice(1)
          .flatMap((c, i) =>
            ys(cols[i].units).flatMap((a, j) =>
              ys(c.units).map((b, k) => (
                <line
                  key={`${i}-${j}-${k}`}
                  x1={x(i)}
                  y1={a}
                  x2={x(i + 1)}
                  y2={b}
                  stroke="#22d3ee"
                  strokeOpacity=".13"
                />
              )),
            ),
          )}
        {cols.map((c, i) => (
          <g
            key={c.id}
            onClick={() => i && select(c.id)}
            style={{ cursor: i ? "pointer" : "default" }}
          >
            {ys(c.units).map((y, j) => (
              <circle
                key={j}
                cx={x(i)}
                cy={y}
                r="12"
                fill={selected === c.id ? "#22d3ee" : "var(--surface)"}
                stroke={i ? "#818cf8" : "#22d3ee"}
                strokeWidth="2"
              />
            ))}
            <text
              x={x(i)}
              y="225"
              textAnchor="middle"
              fill="var(--text)"
              fontSize="12"
            >
              {c.type}
            </text>
            <text
              x={x(i)}
              y="245"
              textAnchor="middle"
              fill="var(--muted)"
              fontSize="11"
            >
              {c.units} unidades
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}
function ArchitectureConsultation({
  architectures,
  inputs,
}: {
  architectures: Architecture[];
  inputs: number;
}) {
  const [id, setId] = useState(architectures[0]?.id || ""),
    [selected, setSelected] = useState(architectures[0]?.layers[0]?.id || "");
  const arch = architectures.find((a) => a.id === id) || architectures[0];
  if (!arch)
    return (
      <>
        <ConsultationNotice permission="architectures" />
        <Empty title="Sin arquitecturas guardadas">
          Todavía no hay diseños registrados para este proyecto.
        </Empty>
      </>
    );
  const counts = parameterCounts(arch, inputs),
    active = arch.layers.find((l) => l.id === selected) || arch.layers[0];
  return (
    <>
      <ConsultationNotice permission="architectures" />
      <Card title="Arquitecturas guardadas">
        <Field label="Consultar arquitectura">
          <select
            value={arch.id}
            onChange={(e) => {
              setId(e.target.value);
              setSelected(
                architectures.find((a) => a.id === e.target.value)?.layers[0]
                  ?.id || "",
              );
            }}
          >
            {architectures.map((a) => (
              <option value={a.id} key={a.id}>
                {a.name} · {a.family}
              </option>
            ))}
          </select>
        </Field>
        <Stats
          items={[
            { label: "Familia", value: arch.family },
            { label: "Capas", value: arch.layers.length },
            { label: "Entradas", value: inputs },
            {
              label: "Parámetros ilustrativos",
              value: counts.reduce((a, b) => a + b, 0),
            },
          ]}
        />
        <Topology
          arch={arch}
          inputs={inputs}
          selected={active?.id || ""}
          select={setSelected}
        />
        <p className="muted small">{familyInfo[arch.family].description}</p>
      </Card>
      <Card title="Especificación de capas">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Capa</th>
                <th>Tipo</th>
                <th>Unidades / propiedades</th>
                <th>Activación</th>
                <th>Parámetros</th>
              </tr>
            </thead>
            <tbody>
              {arch.layers.map((l, i) => (
                <tr key={l.id}>
                  <td>{i + 1}</td>
                  <td>{l.type}</td>
                  <td>
                    {l.type === "Dropout"
                      ? `Rate ${l.rate}`
                      : l.type === "Conv2D"
                        ? `${l.units} filtros · kernel ${l.kernel}`
                        : l.units}
                  </td>
                  <td>
                    {["Dropout", "Flatten", "MaxPooling2D"].includes(l.type)
                      ? "—"
                      : l.activation}
                  </td>
                  <td>{counts[i]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
      <Card title="Configuración registrada">
        <details>
          <summary>Consultar JSON de la arquitectura</summary>
          <pre className="logs">{JSON.stringify(arch, null, 2)}</pre>
        </details>
      </Card>
    </>
  );
}
export function Architectures() {
  const { data, can } = useDemo(),
    action = useAction(),
    notify = useContext(NotifyContext);
  const project = data.projects.find((p) => p.id === data.activeProjectId),
    saved = data.architectures.filter((a) => a.projectId === project?.id);
  const make = (): Architecture => {
    const layers = template(
      project?.family || "Feedforward",
      project?.problem === "Clasificación multiclase" ? 3 : 1,
    );
    if (project?.problem === "Regresión") layers.at(-1)!.activation = "linear";
    return {
      id: uid("arch"),
      projectId: project?.id || "",
      name: "Mi arquitectura v1",
      family: project?.family || "Feedforward",
      layers,
      createdAt: now(),
    };
  };
  const [arch, setArch] = useState<Architecture>(() =>
      copy(saved[0] || make()),
    ),
    [selected, setSelected] = useState(arch.layers[0]?.id || ""),
    [addType, setAddType] = useState<Layer["type"]>("Dense"),
    [dirty, setDirty] = useState(false);
  if (!project)
    return (
      <Empty title="Selecciona un proyecto disponible">
        <Link to="/projects">Ir a Proyectos →</Link>
      </Empty>
    );
  const ds = data.datasets.find((d) => d.projectId === project.id),
    inputs = ds ? ds.columns.length - 1 : 8,
    counts = parameterCounts(arch, inputs),
    active = arch.layers.find((l) => l.id === selected),
    error = validateArchitecture(arch, project.problem);
  if (!can("architectures"))
    return <ArchitectureConsultation architectures={saved} inputs={inputs} />;
  const patch = (update: Partial<Architecture>) => {
    setArch((a) => ({ ...a, ...update }));
    setDirty(true);
  };
  const changeLayer = (updates: Partial<Layer>) =>
    patch({
      layers: arch.layers.map((l) =>
        l.id === selected ? { ...l, ...updates } : l,
      ),
    });
  return (
    <>
      <Card
        title="Biblioteca de arquitecturas"
        actions={
          <button
            className="btn"
            disabled={!can("architectures")}
            onClick={() => {
              const a = make();
              setArch(a);
              setSelected(a.layers[0].id);
              setDirty(true);
            }}
          >
            <Plus size={16} /> Nuevo diseño
          </button>
        }
      >
        <div className="row wrap">
          <Field label="Abrir diseño guardado">
            <select
              value={saved.some((a) => a.id === arch.id) ? arch.id : ""}
              onChange={(e) => {
                const a = saved.find((a) => a.id === e.target.value);
                if (a) {
                  setArch(copy(a));
                  setSelected(a.layers[0].id);
                  setDirty(false);
                }
              }}
            >
              <option value="">Diseño nuevo sin guardar</option>
              {saved.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name} · {a.family}
                </option>
              ))}
            </select>
          </Field>
          <Badge>{dirty ? "Cambios sin guardar" : "Guardado"}</Badge>
        </div>
      </Card>
      <div className="designer">
        <Card title="Capas" subtitle="Selecciona una capa para editarla.">
          <div className="layer-list">
            {arch.layers.map((l, i) => (
              <button
                className={`layer-button ${selected === l.id ? "selected" : ""}`}
                key={l.id}
                onClick={() => setSelected(l.id)}
              >
                <Layers size={16} />
                <span>
                  <strong>
                    {i + 1}. {l.type}
                  </strong>
                  <small>
                    {l.type === "Dropout"
                      ? `rate ${l.rate}`
                      : `${l.units} · ${l.activation}`}
                  </small>
                </span>
                <small>{counts[i]} p.</small>
              </button>
            ))}
          </div>
          <Field label="Tipo de capa a añadir">
            <select
              value={addType}
              onChange={(e) => setAddType(e.target.value as Layer["type"])}
            >
              {[
                "Dense",
                "Dropout",
                ...(arch.family === "CNN"
                  ? ["Conv2D", "MaxPooling2D", "Flatten"]
                  : []),
                ...(arch.family === "RNN" ? ["LSTM", "SimpleRNN"] : []),
              ].map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </Field>
          <button
            className="btn full"
            disabled={!can("architectures") || arch.layers.length >= 10}
            onClick={() => {
              const l = layer(addType, addType === "Dropout" ? 1 : 8);
              const layers = [...arch.layers];
              layers.splice(Math.max(0, layers.length - 1), 0, l);
              patch({ layers });
              setSelected(l.id);
            }}
          >
            <Plus size={16} /> Añadir capa
          </button>
        </Card>
        <Card
          title="Topología neuronal"
          subtitle={`${inputs} entradas · ${counts.reduce((a, b) => a + b, 0).toLocaleString()} parámetros ilustrativos`}
        >
          <div className="two-col">
            <Field label="Nombre del diseño">
              <input
                value={arch.name}
                disabled={!can("architectures")}
                onChange={(e) => patch({ name: e.target.value })}
              />
            </Field>
            <Field label="Familia de red">
              <select
                value={arch.family}
                disabled={!can("architectures")}
                onChange={(e) => {
                  const f = e.target.value as Family;
                  const layers = template(
                    f,
                    project.problem === "Clasificación multiclase" ? 3 : 1,
                  );
                  if (project.problem === "Regresión" && f !== "GAN")
                    layers.at(-1)!.activation = "linear";
                  patch({ family: f, layers });
                  setSelected(layers[0].id);
                }}
              >
                {Object.keys(familyInfo).map((f) => (
                  <option key={f}>{f}</option>
                ))}
              </select>
            </Field>
          </div>
          <Topology
            arch={arch}
            inputs={inputs}
            selected={selected}
            select={setSelected}
          />
          <div className="notice">
            <strong>{familyInfo[arch.family].title}</strong>
            <p className="muted small">{familyInfo[arch.family].description}</p>
            <p className="muted small">
              {arch.family === "GAN"
                ? "Vista conceptual del generador. El discriminador y su interacción se ilustran en Fundamentos; no se ejecuta entrenamiento adversario."
                : "Representación simplificada. Los parámetros de CNN/RNN son ilustrativos, sin validar tensores reales."}
            </p>
          </div>
          {error && <div className="notice warning">{error}</div>}
          <button
            className="btn primary"
            disabled={!can("architectures")}
            onClick={async () => {
              if (
                await action(
                  () => mockArchitectureService.save(arch),
                  "Arquitectura guardada y disponible para entrenar.",
                )
              )
                setDirty(false);
            }}
          >
            <Save size={16} /> Guardar arquitectura
          </button>
        </Card>
        <Card title="Propiedades de capa">
          {!active ? (
            <Empty title="Selecciona una capa" />
          ) : (
            <>
              <Badge>{active.type}</Badge>
              <Field label="Unidades / filtros">
                <input
                  type="number"
                  min="1"
                  max="512"
                  value={active.units}
                  disabled={
                    !can("architectures") ||
                    ["Dropout", "Flatten", "MaxPooling2D"].includes(active.type)
                  }
                  onChange={(e) => changeLayer({ units: +e.target.value })}
                />
              </Field>
              <Field label="Activación">
                <select
                  value={active.activation}
                  disabled={
                    !can("architectures") ||
                    ["Dropout", "Flatten", "MaxPooling2D"].includes(active.type)
                  }
                  onChange={(e) => changeLayer({ activation: e.target.value })}
                >
                  {["relu", "sigmoid", "softmax", "tanh", "linear"].map((v) => (
                    <option key={v}>{v}</option>
                  ))}
                </select>
              </Field>
              {active.type === "Dropout" && (
                <Field label="Dropout rate">
                  <input
                    type="number"
                    min="0"
                    max="0.99"
                    step="0.05"
                    value={active.rate}
                    onChange={(e) => changeLayer({ rate: +e.target.value })}
                    disabled={!can("architectures")}
                  />
                </Field>
              )}
              {active.type === "Conv2D" && (
                <Field label="Kernel">
                  <select
                    value={active.kernel}
                    disabled={!can("architectures")}
                    onChange={(e) => changeLayer({ kernel: +e.target.value })}
                  >
                    {[1, 3, 5].map((n) => (
                      <option key={n}>{n}</option>
                    ))}
                  </select>
                </Field>
              )}
              <div className="row wrap">
                <button
                  className="btn small-btn"
                  disabled={
                    !can("architectures") || arch.layers[0]?.id === selected
                  }
                  onClick={() => {
                    const a = [...arch.layers],
                      i = a.findIndex((l) => l.id === selected);
                    [a[i - 1], a[i]] = [a[i], a[i - 1]];
                    patch({ layers: a });
                  }}
                >
                  ↑ Subir
                </button>
                <button
                  className="btn small-btn"
                  disabled={
                    !can("architectures") || arch.layers.at(-1)?.id === selected
                  }
                  onClick={() => {
                    const a = [...arch.layers],
                      i = a.findIndex((l) => l.id === selected);
                    [a[i + 1], a[i]] = [a[i], a[i + 1]];
                    patch({ layers: a });
                  }}
                >
                  <ArrowDown size={13} /> Bajar
                </button>
              </div>
              <button
                className="btn danger full"
                disabled={!can("architectures") || arch.layers.length <= 2}
                onClick={() => {
                  const layers = arch.layers.filter((l) => l.id !== selected);
                  patch({ layers });
                  setSelected(layers[0].id);
                }}
              >
                <Trash2 size={15} /> Eliminar capa
              </button>
              <p className="muted small">
                Máximo 10 capas para mantener legible la demostración.
              </p>
            </>
          )}
        </Card>
      </div>
      <Card
        title="Configuración exportable"
        actions={
          <button
            className="btn small-btn"
            onClick={() =>
              action(async () => {
                await navigator.clipboard.writeText(
                  JSON.stringify(arch, null, 2),
                );
                notify("Configuración copiada.");
              })
            }
          >
            Copiar JSON
          </button>
        }
      >
        <details>
          <summary>Ver configuración simulada</summary>
          <pre className="logs">{JSON.stringify(arch, null, 2)}</pre>
        </details>
      </Card>
    </>
  );
}
export function Datasets() {
  const { data, can } = useDemo(),
    action = useAction();
  const project = data.projects.find((p) => p.id === data.activeProjectId),
    saved = data.datasets.filter((d) => d.projectId === project?.id);
  const [draft, setDraft] = useState<Dataset | undefined>(() =>
      saved[0] ? copy(saved[0]) : undefined,
    ),
    [busy, setBusy] = useState(false),
    [dirty, setDirty] = useState(false);
  if (!project)
    return (
      <Empty title="Selecciona un proyecto disponible">
        <Link to="/projects">Ir a Proyectos →</Link>
      </Empty>
    );
  const patch = (v: Partial<Dataset>) => {
    setDraft((d) => (d ? { ...d, ...v } : d));
    setDirty(true);
  };
  const split = draft ? splitRows(draft.rows) : undefined;
  return (
    <>
      <Card
        title="Biblioteca de datasets"
        subtitle={
          can("datasets")
            ? "Elige un ejemplo o representa una importación de archivo. Guarda antes de entrenar."
            : "Consulta los datasets guardados del proyecto activo."
        }
        actions={
          <PermissionAction permission="datasets">
            <label className={`btn ${!can("datasets") ? "disabled" : ""}`}>
              <Upload size={16} /> Seleccionar CSV
              <input
                aria-label="Seleccionar archivo CSV"
                className="sr-only"
                type="file"
                accept=".csv"
                disabled={!can("datasets")}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (!f) return;
                  if (!f.name.toLowerCase().endsWith(".csv")) {
                    void action(() => {
                      throw new Error("Selecciona un archivo CSV.");
                    });
                    return;
                  }
                  const key =
                    project.problem === "Regresión"
                      ? "housing"
                      : project.problem === "Clasificación multiclase"
                        ? "iris"
                        : "ecg";
                  setDraft(
                    makeDataset(project.id, key, {
                      name: f.name,
                      size: f.size,
                    }),
                  );
                  setDirty(true);
                  e.target.value = "";
                }}
              />
            </label>
          </PermissionAction>
        }
      >
        <PermissionAction permission="datasets">
          <div className="sample-grid">
            {sampleSpecs.map((s) => (
              <button
                key={s.key}
                className="sample-button"
                disabled={!can("datasets")}
                onClick={() => {
                  setDraft(makeDataset(project.id, s.key));
                  setDirty(true);
                }}
              >
                <DatabaseIcon />
                <strong>{s.name.replace("_Demo.csv", "")}</strong>
                <span>
                  {s.rows} filas · {s.features.length} variables
                </span>
              </button>
            ))}
          </div>
        </PermissionAction>
        {!!saved.length && (
          <Field label="Datasets guardados de este proyecto">
            <select
              value={saved.some((d) => d.id === draft?.id) ? draft?.id : ""}
              onChange={(e) => {
                const d = saved.find((d) => d.id === e.target.value);
                if (d) {
                  setDraft(copy(d));
                  setDirty(false);
                }
              }}
            >
              {can("datasets") && (
                <option value="">Ejemplo nuevo sin guardar</option>
              )}
              {saved.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </Field>
        )}
      </Card>
      <ConsultationNotice permission="datasets" />
      {!draft ? (
        <Empty
          title={
            can("datasets")
              ? "Selecciona un dataset de demostración"
              : "Sin datasets guardados"
          }
        >
          Todavía no hay un dataset seleccionado para este proyecto.
        </Empty>
      ) : (
        <>
          <div className="notice warning">
            <strong>
              {draft.source === "Archivo demostrativo"
                ? "Importación demostrativa: el archivo no se ha analizado."
                : "Dataset de ejemplo con datos sintéticos."}
            </strong>
            <p className="small">
              {draft.source === "Archivo demostrativo"
                ? "Solo se utiliza el nombre y tamaño del archivo. Filas, columnas, vista previa y estadísticas se generan como ejemplo y no describen su contenido real."
                : "Todas las estadísticas y registros de esta pantalla son ilustrativos."}
            </p>
          </div>
          <Stats
            items={[
              {
                label: "Nombre / formato",
                value: draft.format,
                detail: draft.name,
              },
              {
                label: "Tamaño registrado",
                value: `${(draft.bytes / 1024).toFixed(1)} KB`,
                detail:
                  draft.source === "Archivo demostrativo"
                    ? "Tamaño real del archivo seleccionado"
                    : "Tamaño ilustrativo",
              },
              {
                label: "Filas sintéticas",
                value: draft.rows,
                detail: `${draft.columns.length - 1} entradas + objetivo`,
              },
              {
                label: "Partición",
                value: "70 / 15 / 15",
                detail: `${split!.train} train · ${split!.val} val · ${split!.test} test`,
              },
            ]}
          />
          <div className="two-col">
            <Card
              title={
                can("datasets")
                  ? "Configuración del dataset"
                  : "Configuración guardada del dataset"
              }
              actions={<Badge>{dirty ? "Sin guardar" : "Guardado"}</Badge>}
            >
              <Field label="Variable objetivo">
                {can("datasets") ? (
                  <select
                    value={draft.target}
                    disabled={!can("datasets")}
                    onChange={(e) => patch({ target: e.target.value })}
                  >
                    {draft.columns.map((c) => (
                      <option key={c.name}>{c.name}</option>
                    ))}
                  </select>
                ) : (
                  <div className="read-value">{draft.target}</div>
                )}
              </Field>
              <h3>Limpieza y preprocesamiento simulados</h3>
              {(
                [
                  ["impute", "Imputar valores nulos"],
                  ["normalize", "Normalizar variables numéricas"],
                  ["duplicates", "Eliminar duplicados"],
                ] as const
              ).map(([key, label]) =>
                can("datasets") ? (
                  <label className="check" key={key}>
                    <input
                      type="checkbox"
                      disabled={!can("datasets")}
                      checked={draft.cleaning[key]}
                      onChange={(e) =>
                        patch({
                          cleaning: {
                            ...draft.cleaning,
                            [key]: e.target.checked,
                          },
                          preprocessed: false,
                        })
                      }
                    />
                    {label}
                  </label>
                ) : (
                  <div className="read-setting" key={key}>
                    <span>{label}</span>
                    <Badge>
                      {draft.cleaning[key] ? "Activado" : "Desactivado"}
                    </Badge>
                  </div>
                ),
              )}
              <PermissionAction permission="datasets">
                <div className="row wrap">
                  <button
                    className="btn"
                    disabled={busy || !can("datasets")}
                    onClick={async () => {
                      setBusy(true);
                      await new Promise((r) => setTimeout(r, 650));
                      patch({ preprocessed: true });
                      setBusy(false);
                    }}
                  >
                    {busy ? "Simulando limpieza…" : "Simular preprocesamiento"}
                  </button>
                  <button
                    className="btn primary"
                    disabled={busy || !can("datasets")}
                    onClick={async () => {
                      if (
                        await action(
                          () => mockDatasetService.save(draft),
                          "Dataset guardado y disponible para entrenar.",
                        )
                      )
                        setDirty(false);
                    }}
                  >
                    <Save size={16} /> Guardar dataset
                  </button>
                </div>
              </PermissionAction>
              {draft.preprocessed && (
                <div className="notice">
                  Preprocesamiento simulado listo. La selección de opciones se
                  conservará con el dataset.
                </div>
              )}
            </Card>
            <Card title="Distribución sintética del objetivo">
              <div className="chart">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={[
                      "Grupo A",
                      "Grupo B",
                      ...(project.problem === "Clasificación multiclase"
                        ? ["Grupo C"]
                        : []),
                    ].map((name, i, arr) => ({
                      name,
                      registros:
                        Math.floor(draft.rows / arr.length) +
                        (i === 0 ? draft.rows % arr.length : 0),
                    }))}
                  >
                    <CartesianGrid stroke="var(--border)" />
                    <XAxis dataKey="name" stroke="var(--muted)" />
                    <YAxis stroke="var(--muted)" />
                    <Tooltip contentStyle={{ background: "var(--card)" }} />
                    <Bar
                      isAnimationActive={false}
                      dataKey="registros"
                      fill="#22d3ee"
                      radius={[5, 5, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="split-bar">
                <span style={{ width: "70%" }}>Train 70%</span>
                <span style={{ width: "15%" }}>Val 15%</span>
                <span style={{ width: "15%" }}>Test 15%</span>
              </div>
              <p className="muted small">
                Distribución ilustrativa. En regresión, los grupos representan
                intervalos ficticios.
              </p>
            </Card>
          </div>
          <Card title="Vista previa de registros sintéticos">
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    {draft.columns.map((c) => (
                      <th key={c.name}>{c.name}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {draft.preview.map((r, i) => (
                    <tr key={i}>
                      {draft.columns.map((c) => (
                        <td key={c.name}>{r[c.name]}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
          <Card title="Estadísticas descriptivas simuladas">
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Columna</th>
                    <th>Tipo</th>
                    <th>Mínimo</th>
                    <th>Máximo</th>
                    <th>Media</th>
                    <th>Desv.</th>
                    <th>Nulos</th>
                  </tr>
                </thead>
                <tbody>
                  {draft.columns.map((c) => (
                    <tr key={c.name}>
                      <td>
                        {c.name}{" "}
                        {c.name === draft.target && <Badge>Objetivo</Badge>}
                      </td>
                      <td>{c.type}</td>
                      <td>{c.min}</td>
                      <td>{c.max}</td>
                      <td>{c.mean}</td>
                      <td>{c.std}</td>
                      <td>
                        {draft.preprocessed && draft.cleaning.impute
                          ? 0
                          : c.nulls}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}
    </>
  );
}
function DatabaseIcon() {
  return (
    <svg
      width="23"
      height="23"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      aria-hidden="true"
    >
      <ellipse cx="12" cy="5" rx="8" ry="3" />
      <path d="M4 5v14c0 4 16 4 16 0V5M4 12c0 4 16 4 16 0" />
    </svg>
  );
}
