import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Download,
  Eye,
  FileText,
  Play,
  Plus,
  Save,
  Square,
} from "lucide-react";
import {
  isActive,
  pct,
  splitRows,
  time,
  type Model,
  type ModelStatus,
  type Run,
  availableModelTransitions,
} from "../domain";
import { PermissionAction, ConsultationNotice } from "./access";
import {
  mockModelService,
  mockTrainingService,
  useDemo,
} from "../services/mock";
import {
  defaultReportOptions,
  mockReportService,
  type ReportArtifact,
} from "../services/reports";
import { ReportPreview } from "./reportPreview";
import {
  Badge,
  Card,
  Curves,
  Empty,
  Field,
  Modal,
  Stats,
  useAction,
} from "./ui";
const shortId = (id: string) => id.slice(0, 12);
const result = (r: Run) =>
  !r.evaluation
    ? "—"
    : r.evaluation.matrix.length
      ? pct(r.evaluation.accuracy)
      : `MAE ${r.evaluation.mae}`;
function RunSelect({
  runs,
  value,
  onChange,
  label = "Ejecución guardada",
}: {
  runs: Run[];
  value: string;
  onChange: (id: string) => void;
  label?: string;
}) {
  return (
    <Field label={label}>
      <select value={value} onChange={(e) => onChange(e.target.value)}>
        {runs.map((r, i) => (
          <option key={r.id} value={r.id}>
            {i + 1}. {r.architecture.name} · {r.status} · {shortId(r.id)} ·{" "}
            {time(r.startedAt)}
          </option>
        ))}
      </select>
    </Field>
  );
}
export function Training() {
  const { data, can } = useDemo(),
    action = useAction();
  const p = data.projects.find((p) => p.id === data.activeProjectId),
    datasets = data.datasets.filter((d) => d.projectId === p?.id),
    arches = data.architectures.filter((a) => a.projectId === p?.id),
    runs = data.runs.filter((r) => r.projectId === p?.id);
  const [ds, setDs] = useState(datasets[0]?.id || ""),
    [arch, setArch] = useState(arches[0]?.id || ""),
    [config, setConfig] = useState<Run["config"]>({
      epochs: 15,
      batch: 16,
      optimizer: "Adam",
      learningRate: 0.005,
    }),
    [runId, setRunId] = useState(runs[0]?.id || ""),
    [tick, setTick] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setTick(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  if (!p)
    return (
      <Empty title="Selecciona un proyecto disponible">
        <Link to="/projects">Ir a Proyectos →</Link>
      </Empty>
    );
  const run = runs.find((r) => r.id === runId) || runs[0],
    last = run?.metrics.at(-1),
    elapsed = run
      ? Math.max(
          0,
          Math.round(
            ((run.endedAt ? new Date(run.endedAt).getTime() : tick) -
              new Date(run.startedAt).getTime()) /
              1000,
          ),
        )
      : 0;
  const change = (patch: Partial<Run["config"]>) =>
    setConfig((c) => ({ ...c, ...patch }));
  return (
    <>
      <div className="notice">
        Entrenamiento 100 % simulado en el navegador.{" "}
        {can("training")
          ? "Puedes navegar entre módulos mientras avanza. Si recargas durante una ejecución, se conserva como interrumpida y puedes reintentar."
          : "Aquí puedes consultar el progreso, los resultados y el historial de las ejecuciones guardadas."}
      </div>
      <ConsultationNotice permission="training" />
      <div className={can("training") ? "two-col" : ""}>
        <PermissionAction permission="training">
          <Card
            title="Configurar simulación"
            subtitle="Solo se muestran recursos guardados del proyecto activo."
          >
            <Field label="Dataset">
              <select value={ds} onChange={(e) => setDs(e.target.value)}>
                <option value="">Selecciona un dataset…</option>
                {datasets.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name} · {d.columns.length - 1} entradas
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Arquitectura">
              <select value={arch} onChange={(e) => setArch(e.target.value)}>
                <option value="">Selecciona una arquitectura…</option>
                {arches.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name} · {a.family}
                  </option>
                ))}
              </select>
            </Field>
            {(!datasets.length || !arches.length) && (
              <div className="notice warning">
                Guarda primero un <Link to="/datasets">dataset</Link> y una{" "}
                <Link to="/architectures">arquitectura</Link>.
              </div>
            )}
            <div className="two-col">
              <Field label={`Épocas (máximo ${data.settings.maxEpochs})`}>
                <input
                  type="number"
                  min="1"
                  max={data.settings.maxEpochs}
                  value={config.epochs}
                  onChange={(e) => change({ epochs: +e.target.value })}
                />
              </Field>
              <Field label="Batch size">
                <select
                  value={config.batch}
                  onChange={(e) => change({ batch: +e.target.value })}
                >
                  {[8, 16, 32, 64, 128].map((n) => (
                    <option key={n}>{n}</option>
                  ))}
                </select>
              </Field>
              <Field label="Optimizador">
                <select
                  value={config.optimizer}
                  onChange={(e) => change({ optimizer: e.target.value })}
                >
                  {["Adam", "SGD", "RMSprop"].map((v) => (
                    <option key={v}>{v}</option>
                  ))}
                </select>
              </Field>
              <Field label="Learning rate">
                <input
                  type="number"
                  min="0.00001"
                  max="1"
                  step="0.001"
                  value={config.learningRate}
                  onChange={(e) => change({ learningRate: +e.target.value })}
                />
              </Field>
            </div>
            <button
              className="btn primary full"
              disabled={!can("training") || !ds || !arch}
              onClick={() =>
                action(() => {
                  const id = mockTrainingService.start(p.id, ds, arch, config);
                  setRunId(id);
                }, "Simulación iniciada. Puedes continuar navegando.")
              }
            >
              <Play size={16} /> Iniciar entrenamiento simulado
            </button>
          </Card>
        </PermissionAction>
        <Card
          title="Consola de ejecución"
          actions={run && <Badge>{run.status}</Badge>}
        >
          {!run ? (
            <Empty
              title={
                can("training")
                  ? "Lista para tu primera simulación"
                  : "Sin ejecuciones registradas"
              }
            >
              Aquí podrás consultar el progreso y los resultados de las
              simulaciones de este proyecto.
            </Empty>
          ) : (
            <>
              <RunSelect runs={runs} value={run.id} onChange={setRunId} />
              <div className="row between">
                <span>
                  Época {run.metrics.length} / {run.config.epochs}
                </span>
                <strong>
                  {Math.round((run.metrics.length / run.config.epochs) * 100)}%
                </strong>
              </div>
              <progress max={run.config.epochs} value={run.metrics.length} />
              <div className="metric-grid">
                <div>
                  <small>Loss simulada</small>
                  <strong>{last?.loss.toFixed(4) || "—"}</strong>
                </div>
                <div>
                  <small>Accuracy ilustrativa</small>
                  <strong>{last ? pct(last.accuracy) : "—"}</strong>
                </div>
                <div>
                  <small>Tiempo transcurrido</small>
                  <strong>{elapsed}s</strong>
                </div>
                <div>
                  <small>Validation loss</small>
                  <strong>{last?.valLoss.toFixed(4) || "—"}</strong>
                </div>
              </div>
              <div className="row wrap">
                <PermissionAction permission="training">
                  <button
                    className="btn danger"
                    disabled={!can("training") || !isActive(run)}
                    onClick={() =>
                      action(
                        () => mockTrainingService.cancel(run.id),
                        "Simulación cancelada.",
                      )
                    }
                  >
                    <Square size={14} /> Cancelar
                  </button>
                  <button
                    className="btn"
                    disabled={!can("training") || isActive(run)}
                    onClick={() =>
                      action(
                        () => setRunId(mockTrainingService.retry(run.id)),
                        "Nueva ejecución creada con la configuración guardada.",
                      )
                    }
                  >
                    Reintentar
                  </button>
                </PermissionAction>
                <Link className="btn" to="/evaluation">
                  Ver métricas →
                </Link>
              </div>
              <pre className="logs" aria-label="Logs de simulación">
                {run.logs.slice(-8).join("\n")}
              </pre>
            </>
          )}
        </Card>
      </div>
      {run && (
        <Card
          title="Curvas de la ejecución seleccionada"
          subtitle={`${run.dataset.name} · ${run.architecture.name} · ${run.config.optimizer}, lr=${run.config.learningRate}, batch=${run.config.batch}`}
        >
          <Curves run={run} />
        </Card>
      )}
      <Card title="Historial de simulaciones">
        {!runs.length ? (
          <Empty />
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Inicio</th>
                  <th>Dataset / arquitectura</th>
                  <th>Estado</th>
                  <th>Épocas</th>
                  <th>Resultado</th>
                  <th>Acción</th>
                </tr>
              </thead>
              <tbody>
                {runs.map((r) => (
                  <tr key={r.id}>
                    <td>
                      {time(r.startedAt)}
                      <small className="muted block">{shortId(r.id)}</small>
                    </td>
                    <td>
                      {r.dataset.name}
                      <small className="muted block">
                        {r.architecture.name}
                      </small>
                    </td>
                    <td>
                      <Badge>{r.status}</Badge>
                    </td>
                    <td>
                      {r.metrics.length}/{r.config.epochs}
                    </td>
                    <td>{result(r)}</td>
                    <td>
                      <button
                        className="btn small-btn"
                        onClick={() => setRunId(r.id)}
                      >
                        Consultar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </>
  );
}
function EvaluationStats({ run }: { run: Run }) {
  const e = run.evaluation;
  if (!e) return null;
  return (
    <Stats
      items={
        e.matrix.length
          ? [
              { label: "Accuracy ficticia", value: pct(e.accuracy) },
              { label: "Precision macro", value: pct(e.precision) },
              { label: "Recall macro", value: pct(e.recall) },
              { label: "F1 macro", value: pct(e.f1) },
            ]
          : [
              { label: "Loss ficticia", value: e.loss.toFixed(4) },
              { label: "MAE ilustrativo", value: e.mae.toFixed(3) },
              { label: "Muestras sintéticas", value: e.samples },
              { label: "Problema", value: run.project.problem },
            ]
      }
    />
  );
}
function Confusion({ run }: { run: Run }) {
  const ev = run.evaluation;
  if (!ev) return null;
  return (
    <Card
      title={
        ev.matrix.length
          ? "Matriz de confusión demostrativa"
          : "Evaluación ilustrativa"
      }
      subtitle={`${ev.samples} muestras sintéticas del test set · ${run.dataset.name}`}
    >
      {ev.matrix.length ? (
        <div className="table-wrap">
          <table className="confusion">
            <thead>
              <tr>
                <th>Real ↓ / Predicción →</th>
                {ev.labels.map((l) => (
                  <th key={l}>{l}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ev.matrix.map((row, i) => (
                <tr key={i}>
                  <th>{ev.labels[i]}</th>
                  {row.map((v, j) => (
                    <td key={j} className={i === j ? "diagonal" : ""}>
                      {v}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="notice">
          La matriz de confusión y la accuracy de clasificación no se aplican a
          esta demostración de{" "}
          {run.architecture.family === "GAN" ? "generación" : "regresión"}. Se
          muestran loss y MAE ilustrativos.
        </div>
      )}
      <p className="muted small">
        La matriz y los indicadores de clasificación se calculan a partir de los
        mismos conteos sintéticos.
      </p>
    </Card>
  );
}
export function Evaluation() {
  const { data, can } = useDemo();
  const runs = data.runs.filter(
      (r) => r.projectId === data.activeProjectId && r.status === "Completado",
    ),
    [id, setId] = useState(runs[0]?.id || ""),
    [compareId, setCompareId] = useState("");
  const run = runs.find((r) => r.id === id) || runs[0],
    compare = runs.find((r) => r.id === compareId && r.id !== run?.id);
  if (!run)
    return (
      <Empty title="Aún no hay entrenamientos completados">
        <Link className="btn primary" to="/training">
          {can("training") ? "Iniciar simulación →" : "Consultar historial →"}
        </Link>
      </Empty>
    );
  return (
    <>
      <Card title="Resultados de simulación">
        <div className="two-col">
          <RunSelect
            runs={runs}
            value={run.id}
            onChange={(v) => {
              setId(v);
              setCompareId("");
            }}
          />
          <Field label="Comparar con otra ejecución">
            <select
              value={compareId}
              onChange={(e) => setCompareId(e.target.value)}
            >
              <option value="">Sin comparación</option>
              {runs
                .filter(
                  (r) =>
                    r.id !== run.id &&
                    r.project.problem === run.project.problem &&
                    r.dataset.id === run.dataset.id,
                )
                .map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.architecture.name} · {shortId(r.id)}
                  </option>
                ))}
            </select>
          </Field>
        </div>
        <p className="muted small">
          Dataset: {run.dataset.name} · Arquitectura: {run.architecture.name} ·
          Proyecto: {run.project.name}. Solo se comparan ejecuciones del mismo
          dataset y problema.
        </p>
      </Card>
      <EvaluationStats run={run} />
      <Card
        title="Curvas interactivas"
        subtitle="Pasa el cursor para consultar valores por época. Pulsa una leyenda para identificar cada serie."
      >
        <Curves run={run} compare={compare} />
      </Card>
      {compare && (
        <Card title="Comparación de ejecuciones">
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Ejecución</th>
                  <th>Arquitectura</th>
                  <th>Épocas</th>
                  <th>Optimizador</th>
                  <th>Resultado</th>
                  <th>Val loss</th>
                </tr>
              </thead>
              <tbody>
                {[run, compare].map((r) => (
                  <tr key={r.id}>
                    <td>{shortId(r.id)}</td>
                    <td>{r.architecture.name}</td>
                    <td>{r.config.epochs}</td>
                    <td>{r.config.optimizer}</td>
                    <td>{result(r)}</td>
                    <td>{r.evaluation?.loss.toFixed(4)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
      <Confusion run={run} />
      <Card title="Observaciones técnicas">
        <p>
          La diferencia final entre Training y Validation es de{" "}
          {(
            (run.metrics.at(-1)!.accuracy - run.metrics.at(-1)!.valAccuracy) *
            100
          ).toFixed(1)}{" "}
          puntos porcentuales en el indicador ilustrativo.
        </p>
        <p className="muted">
          Estas curvas muestran una evolución diseñada para la exposición. No
          validan un modelo real ni garantizan resultados. El test set tiene{" "}
          {splitRows(run.dataset.rows).test} registros sintéticos y no participa
          en la curva de entrenamiento.
        </p>
        <div className="row">
          <Link className="btn primary" to="/models">
            {can("models") ? "Registrar modelo →" : "Consultar registro →"}
          </Link>
          <Link className="btn" to="/reports">
            Ver reporte
          </Link>
        </div>
      </Card>
    </>
  );
}
function RegisterForm({
  runs,
  close,
  count,
}: {
  runs: Run[];
  close: () => void;
  count: number;
}) {
  const action = useAction();
  const [id, setId] = useState(runs[0]?.id || ""),
    [name, setName] = useState(`${runs[0]?.project.name || "Modelo"} · demo`),
    [version, setVersion] = useState(`v1.${count}.0`),
    [notes, setNotes] = useState("Modelo demostrativo sin pesos entrenados.");
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        if (
          await action(
            () => mockModelService.save(id, name, version, notes),
            "Versión registrada como Borrador.",
          )
        )
          close();
      }}
    >
      <RunSelect
        runs={runs}
        value={id}
        onChange={setId}
        label="Entrenamiento completado de origen"
      />
      <Field label="Nombre del modelo">
        <input
          required
          value={name}
          maxLength={100}
          onChange={(e) => setName(e.target.value)}
        />
      </Field>
      <Field label="Versión (v1.0.0)">
        <input
          required
          pattern="v[0-9]+\.[0-9]+\.[0-9]+"
          value={version}
          onChange={(e) => setVersion(e.target.value)}
        />
      </Field>
      <Field label="Observaciones">
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} />
      </Field>
      <div className="notice">
        Se conservará la relación con el entrenamiento y su configuración. No se
        generarán pesos reales.
      </div>
      <div className="modal-actions">
        <button type="button" className="btn" onClick={close}>
          Cancelar
        </button>
        <button type="submit" className="btn primary">
          <Save size={15} /> Registrar versión
        </button>
      </div>
    </form>
  );
}
export function Models() {
  const { data, can } = useDemo(),
    action = useAction(),
    models = data.models.filter((m) => m.projectId === data.activeProjectId),
    runs = data.runs.filter(
      (r) => r.projectId === data.activeProjectId && r.status === "Completado",
    );
  const [register, setRegister] = useState(false),
    [detailId, setDetailId] = useState(""),
    [compareIds, setCompareIds] = useState<string[]>([]);
  const detail = models.find((m) => m.id === detailId),
    detailRun = data.runs.find((r) => r.id === detail?.runId);
  return (
    <>
      {!can("approve") && <ConsultationNotice permission="models" />}
      <Card
        title="Versiones de modelos"
        subtitle="Registro simulado con trazabilidad a una ejecución guardada."
        actions={
          <PermissionAction permission="models">
            <button
              className="btn primary"
              disabled={!runs.length}
              onClick={() => setRegister(true)}
            >
              <Plus size={16} /> Registrar versión
            </button>
          </PermissionAction>
        }
      >
        {!models.length ? (
          <Empty title="Sin versiones registradas">
            {can("models")
              ? "Completa un entrenamiento y registra su versión demostrativa."
              : "Todavía no hay versiones de modelos registradas para este proyecto."}
          </Empty>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Comparar</th>
                  <th>Modelo / versión</th>
                  <th>Origen</th>
                  <th>Resultado</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {models.map((m) => {
                  const r = data.runs.find((r) => r.id === m.runId);
                  const transitions = availableModelTransitions(m.status, {
                    models: can("models"),
                    approve: can("approve"),
                  });
                  return (
                    <tr key={m.id}>
                      <td>
                        <input
                          type="checkbox"
                          aria-label={`Comparar ${m.name} ${m.version}`}
                          checked={compareIds.includes(m.id)}
                          disabled={
                            !compareIds.includes(m.id) && compareIds.length >= 2
                          }
                          onChange={(e) =>
                            setCompareIds(
                              e.target.checked
                                ? [...compareIds, m.id]
                                : compareIds.filter((id) => id !== m.id),
                            )
                          }
                        />
                      </td>
                      <td>
                        <strong>{m.name}</strong>
                        <small className="accent block">{m.version}</small>
                      </td>
                      <td>
                        {r?.architecture.name}
                        <small className="muted block">
                          {shortId(m.runId)}
                        </small>
                      </td>
                      <td>{r ? result(r) : "—"}</td>
                      <td>
                        <Badge>{m.status}</Badge>
                      </td>
                      <td>
                        <div className="row wrap">
                          <button
                            className="btn small-btn"
                            onClick={() => setDetailId(m.id)}
                          >
                            Detalles
                          </button>
                          {r && (
                            <button
                              className="icon-btn"
                              aria-label={`Descargar manifiesto ${m.version}`}
                              onClick={() =>
                                action(
                                  () => mockReportService.manifest(r, m),
                                  "Manifiesto JSON descargado. No contiene pesos reales.",
                                )
                              }
                            >
                              <Download size={16} />
                            </button>
                          )}
                        </div>
                        {!!transitions.length && (
                          <select
                            aria-label={`Cambiar estado ${m.name} ${m.version}`}
                            value=""
                            onChange={(e) => {
                              const status = e.target.value as ModelStatus;
                              if (
                                confirm(
                                  `¿Cambiar ${m.version} de ${m.status} a ${status}? Acción demostrativa.`,
                                )
                              )
                                void action(
                                  () => mockModelService.status(m.id, status),
                                  "Estado de la versión actualizado.",
                                );
                            }}
                          >
                            <option value="">Cambiar estado…</option>
                            {transitions.map((s) => (
                              <option key={s} value={s}>
                                {s}
                              </option>
                            ))}
                          </select>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <p className="muted small">
          Selecciona hasta dos versiones para compararlas. Los manifiestos son
          JSON demostrativos sin archivos binarios ni pesos entrenados.
        </p>
      </Card>
      {compareIds.length === 2 && (
        <Card title="Comparación de modelos">
          <div className="two-col">
            {compareIds.map((id) => {
              const m = models.find((m) => m.id === id)!;
              const r = data.runs.find((r) => r.id === m.runId)!;
              return (
                <div className="notice" key={id}>
                  <h3>
                    {m.name} {m.version}
                  </h3>
                  <Badge>{m.status}</Badge>
                  <p>
                    {r.dataset.name} · {r.architecture.family}
                  </p>
                  <p className="muted small">
                    {r.architecture.name} · {r.config.epochs} épocas ·{" "}
                    {r.config.optimizer}
                  </p>
                  <strong>Resultado simulado: {result(r)}</strong>
                </div>
              );
            })}
          </div>
          <p className="muted small">
            La comparación es descriptiva. Si cambian datasets o problemas, los
            resultados no son directamente comparables.
          </p>
        </Card>
      )}
      {register && can("models") && (
        <Modal
          title="Registrar modelo simulado"
          close={() => setRegister(false)}
        >
          <RegisterForm
            runs={runs}
            count={models.length}
            close={() => setRegister(false)}
          />
        </Modal>
      )}
      {detail && detailRun && (
        <Modal
          title={`${detail.name} · ${detail.version}`}
          close={() => setDetailId("")}
        >
          <Badge>{detail.status}</Badge>
          <p>{detail.notes}</p>
          <p className="muted small">
            Origen: {detailRun.id}
            <br />
            Dataset: {detailRun.dataset.name}
            <br />
            Arquitectura: {detailRun.architecture.name}
            <br />
            Resultado: {result(detailRun)}
          </p>
          <h3>Historial de la versión</h3>
          <div className="timeline">
            {detail.history.map((h, i) => (
              <div key={i}>
                <strong>{h.status}</strong>
                <p className="muted small">
                  {h.actor} · {time(h.at)}
                </p>
              </div>
            ))}
          </div>
          <button
            className="btn"
            onClick={() =>
              action(
                () => mockReportService.manifest(detailRun, detail),
                "Manifiesto descargado.",
              )
            }
          >
            <Download size={16} /> Descargar manifiesto demo
          </button>
        </Modal>
      )}
    </>
  );
}
export function Reports() {
  const { data } = useDemo(),
    action = useAction();
  const runs = data.runs.filter(
      (r) => r.projectId === data.activeProjectId && r.status === "Completado",
    ),
    [id, setId] = useState(runs[0]?.id || ""),
    [modelId, setModelId] = useState(""),
    [busy, setBusy] = useState(false),
    [options, setOptions] = useState({ ...defaultReportOptions }),
    [preview, setPreview] = useState<ReportArtifact>();
  const run = runs.find((r) => r.id === id) || runs[0],
    models = data.models.filter((m) => m.runId === run?.id),
    model = models.find((m) => m.id === modelId) || models[0];
  if (!run)
    return (
      <Empty title="Sin simulaciones completadas para generar reportes">
        <Link to="/training">Ir a Entrenamientos →</Link>
      </Empty>
    );
  const split = splitRows(run.dataset.rows);
  return (
    <>
      <Card
        title="Preparar reporte de simulación"
        subtitle="Selecciona el contenido, revisa el archivo final y confirma su descarga desde la vista previa."
      >
        <div className="two-col">
          <RunSelect
            runs={runs}
            value={run.id}
            onChange={(v) => {
              setId(v);
              setModelId("");
            }}
          />
          <Field label="Versión de modelo incluida">
            <select
              value={model?.id || ""}
              onChange={(e) => setModelId(e.target.value)}
            >
              {!models.length && (
                <option value="">Sin versión registrada</option>
              )}
              {models.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} {m.version} · {m.status}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <div className="report-options">
          <div>
            <h3>Personaliza tu documento</h3>
            <p className="muted small">
              El informe incluye resumen, dataset, arquitectura, resultados y
              registro del modelo.
            </p>
            <label className="check">
              <input
                type="checkbox"
                checked={options.includeCharts}
                onChange={(e) =>
                  setOptions((o) => ({ ...o, includeCharts: e.target.checked }))
                }
              />{" "}
              Incluir curvas y gráficos de aprendizaje
            </label>
            <label className="check">
              <input
                type="checkbox"
                checked={options.includeLogs}
                onChange={(e) =>
                  setOptions((o) => ({ ...o, includeLogs: e.target.checked }))
                }
              />{" "}
              Añadir anexo con los logs de todas las épocas
            </label>
          </div>
          <Field
            label="Observaciones adicionales para el PDF"
            hint="Opcional. Se añadirán al informe que verás antes de descargar."
          >
            <textarea
              rows={3}
              maxLength={1000}
              placeholder="Escribe una observación para tu presentación…"
              value={options.notes}
              onChange={(e) =>
                setOptions((o) => ({ ...o, notes: e.target.value }))
              }
            />
          </Field>
        </div>
        <div className="report-export-actions">
          <button
            className="btn primary"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              await action(async () =>
                setPreview(await mockReportService.pdf(run, model, options)),
              );
              setBusy(false);
            }}
          >
            <Eye size={16} />
            {busy ? "Preparando vista previa…" : "Vista previa PDF"}
          </button>
          <button
            className="btn"
            disabled={busy}
            onClick={() => setPreview(mockReportService.csv(run))}
          >
            <Eye size={16} /> Vista previa CSV
          </button>
          <span className="muted small">
            <FileText size={14} /> Revisa primero. Descarga cuando esté listo.
          </span>
        </div>
      </Card>
      <div className="report-summary-label">
        <span className="eyebrow">RESUMEN DEL CONTENIDO</span>
        <p className="muted small">
          Para ver el diseño final y sus páginas, abre la vista previa del PDF.
        </p>
      </div>
      <article className="report-preview">
        <header className="report-header">
          <div>
            <span className="eyebrow">NEUROLAB ENTERPRISE</span>
            <h2>Informe de simulación</h2>
            <span className="report-demo">
              Prototipo demostrativo — Datos simulados
            </span>
          </div>
          <div>
            <strong>{model?.version || "Sin versión"}</strong>
            <p>{time(run.endedAt || run.startedAt)}</p>
          </div>
        </header>
        <section>
          <h3>01 / Proyecto y dataset</h3>
          <div className="two-col">
            <div>
              <h2>{run.project.name}</h2>
              <p>{run.project.description}</p>
              <p>{run.project.problem}</p>
            </div>
            <div>
              <strong>{run.dataset.name}</strong>
              <p>
                {run.dataset.rows} filas sintéticas ·{" "}
                {run.dataset.columns.length - 1} entradas
              </p>
              <p>Objetivo: {run.dataset.target}</p>
              <p>
                Train {split.train} / Val {split.val} / Test {split.test}
              </p>
            </div>
          </div>
        </section>
        <section>
          <h3>02 / Arquitectura y entrenamiento</h3>
          <p>
            <strong>{run.architecture.name}</strong> · {run.architecture.family}
          </p>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Capa</th>
                  <th>Tipo</th>
                  <th>Unidades</th>
                  <th>Activación</th>
                </tr>
              </thead>
              <tbody>
                {run.architecture.layers.map((l, i) => (
                  <tr key={l.id}>
                    <td>{i + 1}</td>
                    <td>{l.type}</td>
                    <td>{l.units}</td>
                    <td>{l.activation}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p>
            {run.config.epochs} épocas · batch {run.config.batch} ·{" "}
            {run.config.optimizer} · learning rate {run.config.learningRate}
          </p>
        </section>
        <section>
          <h3>03 / Resultados ficticios</h3>
          <EvaluationStats run={run} />
          <Curves run={run} />
        </section>
        <section>
          <h3>04 / Registro, historial y observaciones</h3>
          <p>
            {model
              ? `${model.name} ${model.version} · ${model.status}`
              : "Sin modelo registrado para esta ejecución."}
          </p>
          <p>{model?.notes || "Resultados exclusivos de demostración."}</p>
          {model?.history.map((h, i) => (
            <p className="small" key={i}>
              {time(h.at)} · {h.status} · {h.actor}
            </p>
          ))}
          <details>
            <summary>Historial completo de ejecución</summary>
            <pre className="logs">{run.logs.join("\n")}</pre>
          </details>
          <p className="small">
            No existe entrenamiento real ni validación clínica o comercial. Los
            resultados y las curvas son ilustrativos. Ejecución: {run.id}.
          </p>
        </section>
      </article>
      {preview && (
        <ReportPreview artifact={preview} close={() => setPreview(undefined)} />
      )}
    </>
  );
}
