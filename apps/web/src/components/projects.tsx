import { useState } from "react";
import { Link } from "react-router-dom";
import { Plus, Pencil, Trash2, ArrowUpRight } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import {
  ROLES,
  copy,
  isActive,
  now,
  pct,
  time,
  uid,
  type Family,
  type Problem,
  type Project,
} from "../domain";
import { mockProjectService, useDemo } from "../services/mock";
import { PermissionAction, ConsultationNotice } from "./access";
import { Badge, Card, Empty, Field, Modal, Stats, useAction } from "./ui";
export function Dashboard() {
  const { data } = useDemo();
  const completed = data.runs.filter((r) => r.status === "Completado");
  const average = completed
    .filter((r) => r.evaluation?.matrix.length)
    .reduce((s, r, _, arr) => s + r.evaluation!.accuracy / arr.length, 0);
  const activity = data.projects.map((p) => ({
    name: p.name.slice(0, 16),
    entrenamientos: data.runs.filter((r) => r.projectId === p.id).length,
    modelos: data.models.filter((m) => m.projectId === p.id).length,
  }));
  return (
    <>
      <Stats
        items={[
          {
            label: "Proyectos registrados",
            value: data.projects.length,
            detail: `${data.projects.filter((p) => p.status === "Activo").length} activos`,
          },
          {
            label: "Entrenamientos",
            value: data.runs.length,
            detail: `${completed.length} completados · ${data.runs.filter(isActive).length} en curso`,
          },
          {
            label: "Modelos registrados",
            value: data.models.length,
            detail: `${data.models.filter((m) => m.status === "Aprobado").length} aprobados`,
          },
          {
            label: "Accuracy media ficticia",
            value: average ? pct(average) : "—",
            detail: "Solo ejecuciones de clasificación completadas",
          },
        ]}
      />
      <div className="two-col">
        <Card
          title="Actividad por proyecto"
          subtitle="Los gráficos se actualizan con tus acciones."
        >
          <div className="chart">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={activity}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis
                  dataKey="name"
                  stroke="var(--muted)"
                  tick={{ fontSize: 10 }}
                />
                <YAxis allowDecimals={false} stroke="var(--muted)" />
                <Tooltip
                  contentStyle={{
                    background: "var(--card)",
                    border: "1px solid var(--border)",
                    color: "var(--text)",
                  }}
                />
                <Bar
                  isAnimationActive={false}
                  dataKey="entrenamientos"
                  name="Entrenamientos"
                  fill="#22d3ee"
                  radius={[4, 4, 0, 0]}
                />
                <Bar
                  isAnimationActive={false}
                  dataKey="modelos"
                  name="Modelos"
                  fill="#818cf8"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card
          title="Estado del laboratorio"
          subtitle="Recursos ilustrativos, calculados a partir de las simulaciones."
        >
          <div className="resource">
            <span>CPU ficticia</span>
            <strong>{12 + data.runs.filter(isActive).length * 18}%</strong>
            <progress
              max="100"
              value={12 + data.runs.filter(isActive).length * 18}
            />
          </div>
          <div className="resource">
            <span>Memoria ficticia</span>
            <strong>
              {256 + data.runs.filter(isActive).length * 128} /{" "}
              {data.settings.memory} MB
            </strong>
            <progress
              max={data.settings.memory}
              value={256 + data.runs.filter(isActive).length * 128}
            />
          </div>
          <div className="notice">
            <strong>
              {data.runs.filter(isActive).length} /{" "}
              {data.settings.maxConcurrent} simulaciones activas
            </strong>
            <p className="muted small">
              Motor: temporizadores JavaScript. Sin backend ni TensorFlow.
            </p>
          </div>
          <div className="row wrap">
            <PermissionAction permission="projects">
              <Link className="btn primary" to="/projects">
                <Plus size={16} /> Nuevo proyecto
              </Link>
            </PermissionAction>
            <PermissionAction permission="training">
              <Link className="btn" to="/training">
                Entrenar <ArrowUpRight size={15} />
              </Link>
            </PermissionAction>
          </div>
        </Card>
      </div>
      <Card
        title="Entrenamientos recientes"
        actions={
          <Link className="text-link" to="/training">
            Ver historial →
          </Link>
        }
      >
        {!data.runs.length ? (
          <Empty />
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Proyecto</th>
                  <th>Arquitectura / dataset</th>
                  <th>Estado</th>
                  <th>Épocas</th>
                  <th>Resultado ficticio</th>
                </tr>
              </thead>
              <tbody>
                {data.runs.slice(0, 6).map((r) => (
                  <tr key={r.id}>
                    <td>
                      {r.project.name}
                      <small className="muted block">{time(r.startedAt)}</small>
                    </td>
                    <td>
                      {r.architecture.name}
                      <small className="muted block">{r.dataset.name}</small>
                    </td>
                    <td>
                      <Badge>{r.status}</Badge>
                    </td>
                    <td>
                      {r.metrics.length}/{r.config.epochs}
                    </td>
                    <td>
                      {r.evaluation
                        ? r.evaluation.matrix.length
                          ? pct(r.evaluation.accuracy)
                          : `MAE ${r.evaluation.mae}`
                        : "En progreso"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
      <div className="two-col">
        <Card title="Alertas y próximos pasos">
          {data.models.some((m) => m.status === "En revisión") && (
            <div className="notice warning">
              Hay {data.models.filter((m) => m.status === "En revisión").length}{" "}
              versión(es) pendientes de revisión.{" "}
              <Link to="/models">Revisar modelos →</Link>
            </div>
          )}
          {data.runs.some((r) => r.status === "Cancelado") && (
            <div className="notice">
              Hay simulaciones canceladas que puedes reintentar desde
              Entrenamientos.
            </div>
          )}
          <div className="notice">
            Usa la barra del recorrido para presentar el flujo de principio a
            fin. Todas las cifras son demostrativas.
          </div>
        </Card>
        <Card title="Últimas acciones">
          <div className="timeline">
            {data.audit.slice(0, 4).map((a) => (
              <div key={a.id}>
                <strong>{a.action.replaceAll("_", " ")}</strong>
                <p className="muted small">{a.detail}</p>
                <small className="muted">
                  {time(a.at)} · {a.actor}
                </small>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </>
  );
}
function ProjectForm({
  initial,
  close,
}: {
  initial: Project;
  close: () => void;
}) {
  const { data } = useDemo(),
    action = useAction();
  const [draft, setDraft] = useState(copy(initial));
  const set = (patch: Partial<Project>) =>
    setDraft((d) => ({ ...d, ...patch }));
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        if (
          await action(
            () => mockProjectService.save(draft),
            "Proyecto guardado. El dashboard ya está actualizado.",
          )
        )
          close();
      }}
    >
      <Field label="Nombre del proyecto">
        <input
          required
          maxLength={100}
          value={draft.name}
          onChange={(e) => set({ name: e.target.value })}
        />
      </Field>
      <Field label="Descripción">
        <textarea
          rows={3}
          value={draft.description}
          onChange={(e) => set({ description: e.target.value })}
        />
      </Field>
      <div className="two-col">
        <Field label="Tipo de problema">
          <select
            value={draft.problem}
            onChange={(e) => set({ problem: e.target.value as Problem })}
          >
            {[
              "Clasificación binaria",
              "Clasificación multiclase",
              "Regresión",
              "Generación",
            ].map((v) => (
              <option key={v}>{v}</option>
            ))}
          </select>
        </Field>
        <Field label="Familia recomendada">
          <select
            value={draft.family}
            onChange={(e) => set({ family: e.target.value as Family })}
          >
            {["Feedforward", "CNN", "RNN", "GAN"].map((v) => (
              <option key={v}>{v}</option>
            ))}
          </select>
        </Field>
      </div>
      <div className="two-col">
        <Field label="Estado">
          <select
            value={draft.status}
            onChange={(e) =>
              set({ status: e.target.value as Project["status"] })
            }
          >
            {["Borrador", "Activo", "Completado", "Archivado"].map((v) => (
              <option key={v}>{v}</option>
            ))}
          </select>
        </Field>
        <Field label="Etiquetas (separadas por comas)">
          <input
            value={draft.tags.join(", ")}
            onChange={(e) =>
              set({ tags: e.target.value.split(",").map((s) => s.trim()) })
            }
          />
        </Field>
      </div>
      <h3>Integrantes y roles de demostración</h3>
      <div className="member-list">
        {data.users
          .filter((u) => u.active)
          .map((u) => {
            const m = draft.members.find((m) => m.userId === u.id);
            return (
              <div className="member" key={u.id}>
                <label className="check">
                  <input
                    type="checkbox"
                    checked={!!m}
                    onChange={(e) =>
                      set({
                        members: e.target.checked
                          ? [...draft.members, { userId: u.id, role: u.role }]
                          : draft.members.filter((x) => x.userId !== u.id),
                      })
                    }
                  />
                  {u.name}
                </label>
                {m && (
                  <select
                    aria-label={`Rol de ${u.name}`}
                    value={m.role}
                    onChange={(e) =>
                      set({
                        members: draft.members.map((x) =>
                          x.userId === u.id
                            ? { ...x, role: e.target.value as typeof m.role }
                            : x,
                        ),
                      })
                    }
                  >
                    {ROLES.map((r) => (
                      <option key={r}>{r}</option>
                    ))}
                  </select>
                )}
              </div>
            );
          })}
      </div>
      <div className="modal-actions">
        <button type="button" className="btn" onClick={close}>
          Cancelar
        </button>
        <button className="btn primary" type="submit">
          Guardar proyecto
        </button>
      </div>
    </form>
  );
}
export function Projects() {
  const { data, can, user } = useDemo(),
    action = useAction();
  const [search, setSearch] = useState(""),
    [family, setFamily] = useState("Todas"),
    [status, setStatus] = useState("Todos"),
    [edit, setEdit] = useState<Project>(),
    [details, setDetails] = useState<string>();
  const selected = data.projects.find((p) => p.id === details);
  const filtered = data.projects.filter(
    (p) =>
      `${p.name} ${p.tags.join(" ")}`
        .toLowerCase()
        .includes(search.toLowerCase()) &&
      (family === "Todas" || p.family === family) &&
      (status === "Todos" || p.status === status),
  );
  return (
    <>
      <ConsultationNotice permission="projects" />
      <Card
        title="Tus proyectos de inteligencia artificial"
        subtitle="Cada proyecto conserva su propio dataset, arquitectura e historial."
        actions={
          <PermissionAction permission="projects">
            <button
              className="btn primary"
              onClick={() =>
                setEdit({
                  id: uid("project"),
                  name: "",
                  description: "",
                  family: "Feedforward",
                  problem: "Clasificación binaria",
                  tags: [],
                  status: "Activo",
                  members: user ? [{ userId: user.id, role: user.role }] : [],
                  createdAt: now(),
                })
              }
            >
              <Plus size={16} /> Crear proyecto
            </button>
          </PermissionAction>
        }
      >
        <div className="filters">
          <Field label="Buscar">
            <input
              type="search"
              placeholder="Nombre o etiqueta…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </Field>
          <Field label="Familia">
            <select value={family} onChange={(e) => setFamily(e.target.value)}>
              {["Todas", "Feedforward", "CNN", "RNN", "GAN"].map((v) => (
                <option key={v}>{v}</option>
              ))}
            </select>
          </Field>
          <Field label="Estado">
            <select value={status} onChange={(e) => setStatus(e.target.value)}>
              {["Todos", "Borrador", "Activo", "Completado", "Archivado"].map(
                (v) => (
                  <option key={v}>{v}</option>
                ),
              )}
            </select>
          </Field>
        </div>
        {!filtered.length ? (
          <Empty title="No hay proyectos con estos filtros" />
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Proyecto</th>
                  <th>Familia / problema</th>
                  <th>Integrantes</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <strong>{p.name}</strong>
                      <div className="row wrap">
                        {p.tags.filter(Boolean).map((t) => (
                          <span className="tag" key={t}>
                            {t}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td>
                      {p.family}
                      <small className="muted block">{p.problem}</small>
                    </td>
                    <td>{p.members.length}</td>
                    <td>
                      <Badge>{p.status}</Badge>
                      {data.activeProjectId === p.id && (
                        <small className="block accent">Workspace activo</small>
                      )}
                    </td>
                    <td>
                      <div className="row wrap">
                        <button
                          className="btn small-btn"
                          onClick={() => {
                            mockProjectService.select(p.id);
                            setDetails(p.id);
                          }}
                        >
                          Abrir
                        </button>
                        <PermissionAction permission="projects">
                          <button
                            className="icon-btn"
                            aria-label={`Editar ${p.name}`}
                            onClick={() => setEdit(copy(p))}
                          >
                            <Pencil size={16} />
                          </button>
                          <button
                            className="icon-btn danger"
                            aria-label={`Eliminar ${p.name}`}
                            onClick={() => {
                              if (
                                confirm(
                                  `¿Eliminar ${p.name} y todos sus datos de demostración?`,
                                )
                              )
                                void action(
                                  () => mockProjectService.remove(p.id),
                                  "Proyecto eliminado.",
                                );
                            }}
                          >
                            <Trash2 size={16} />
                          </button>
                        </PermissionAction>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
      {selected && (
        <Card title={selected.name} subtitle={selected.description}>
          <div className="project-sections">
            {[
              {
                label: "Información general",
                value: `${selected.problem} · ${selected.status}`,
                to: "/projects",
              },
              {
                label: "Dataset",
                value: `${data.datasets.filter((d) => d.projectId === selected.id).length} registros`,
                to: "/datasets",
              },
              {
                label: "Arquitectura neuronal",
                value: `${data.architectures.filter((a) => a.projectId === selected.id).length} diseños`,
                to: "/architectures",
              },
              {
                label: "Entrenamientos",
                value: `${data.runs.filter((r) => r.projectId === selected.id).length} ejecuciones`,
                to: "/training",
              },
              {
                label: "Métricas",
                value: "Evaluación de simulaciones",
                to: "/evaluation",
              },
              {
                label: "Modelos",
                value: `${data.models.filter((m) => m.projectId === selected.id).length} versiones`,
                to: "/models",
              },
            ].map((s) => (
              <Link to={s.to} key={s.label} className="section-link">
                <strong>{s.label}</strong>
                <small className="muted">{s.value}</small>
                <ArrowUpRight size={16} />
              </Link>
            ))}
          </div>
          <h3>Integrantes</h3>
          <div className="row wrap">
            {selected.members.map((m) => (
              <span className="tag" key={m.userId}>
                {data.users.find((u) => u.id === m.userId)?.name ||
                  "Usuario eliminado"}{" "}
                · {m.role}
              </span>
            ))}
          </div>
          <h3>Historial del proyecto</h3>
          <div className="timeline">
            {data.audit
              .filter((a) => a.projectId === selected.id)
              .slice(0, 10)
              .map((a) => (
                <div key={a.id}>
                  <strong>{a.action}</strong>
                  <p className="muted small">
                    {a.detail} · {time(a.at)}
                  </p>
                </div>
              ))}
          </div>
        </Card>
      )}
      {edit && can("projects") && (
        <Modal
          title={
            data.projects.some((p) => p.id === edit.id)
              ? "Editar proyecto"
              : "Crear proyecto"
          }
          close={() => setEdit(undefined)}
        >
          <ProjectForm initial={edit} close={() => setEdit(undefined)} />
        </Modal>
      )}
    </>
  );
}
