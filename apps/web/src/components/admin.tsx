import { useState } from "react";
import { Pencil, Plus, Save } from "lucide-react";
import {
  ROLES,
  PERMISSIONS,
  ROLE_DESCRIPTIONS,
  copy,
  isActive,
  time,
  uid,
  type Role,
  type User,
} from "../domain";
import { mockAdminService, useDemo } from "../services/mock";
import { Badge, Card, Field, Modal, Stats, useAction } from "./ui";
function UserForm({ initial, close }: { initial: User; close: () => void }) {
  const [draft, setDraft] = useState(copy(initial)),
    action = useAction();
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        if (
          await action(
            () => mockAdminService.saveUser(draft),
            "Usuario ficticio guardado.",
          )
        )
          close();
      }}
    >
      <div className="notice">
        Usa nombres y correos ficticios. No se enviarán invitaciones ni se
        crearán cuentas reales.
      </div>
      <Field label="Nombre de ejemplo">
        <input
          required
          value={draft.name}
          onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
        />
      </Field>
      <Field label="Correo ficticio">
        <input
          type="email"
          required
          placeholder="usuario@demo.neurolab"
          value={draft.email}
          onChange={(e) => setDraft((d) => ({ ...d, email: e.target.value }))}
        />
      </Field>
      <Field label="Rol demostrativo">
        <select
          value={draft.role}
          onChange={(e) =>
            setDraft((d) => ({ ...d, role: e.target.value as Role }))
          }
        >
          {ROLES.map((r) => (
            <option key={r}>{r}</option>
          ))}
        </select>
      </Field>
      <label className="check">
        <input
          type="checkbox"
          checked={draft.active}
          onChange={(e) =>
            setDraft((d) => ({ ...d, active: e.target.checked }))
          }
        />
        Usuario activo
      </label>
      <div className="modal-actions">
        <button className="btn" type="button" onClick={close}>
          Cancelar
        </button>
        <button className="btn primary" type="submit">
          Guardar usuario
        </button>
      </div>
    </form>
  );
}
export function Admin() {
  const { data, can } = useDemo(),
    action = useAction();
  const [edit, setEdit] = useState<User>(),
    [settings, setSettings] = useState(copy(data.settings)),
    [filter, setFilter] = useState("");
  const logs = data.audit.filter((a) =>
    `${a.actor} ${a.action} ${a.detail}`
      .toLowerCase()
      .includes(filter.toLowerCase()),
  );
  const active = data.runs.filter(isActive).length;
  return (
    <>
      <div className="notice warning">
        Administración y permisos exclusivamente demostrativos. El perfil global
        activo determina los controles de la interfaz; los roles por proyecto se
        registran como configuración ilustrativa. No existe autenticación ni
        seguridad de servidor.
      </div>
      <Stats
        items={[
          {
            label: "Usuarios ficticios",
            value: data.users.length,
            detail: `${data.users.filter((u) => u.active).length} activos`,
          },
          {
            label: "Simulaciones activas",
            value: `${active} / ${data.settings.maxConcurrent}`,
          },
          {
            label: "Memoria ilustrativa",
            value: `${256 + active * 128} MB`,
            detail: `Límite ficticio ${data.settings.memory} MB`,
          },
          {
            label: "Eventos conservados",
            value: data.audit.length,
            detail: "Hasta 500 eventos locales",
          },
        ]}
      />
      <Card
        title="Usuarios y perfiles"
        actions={
          <button
            className="btn primary"
            disabled={!can("admin")}
            onClick={() =>
              setEdit({
                id: uid("user"),
                name: "",
                email: "",
                role: "Lector",
                active: true,
              })
            }
          >
            <Plus size={16} /> Crear usuario ficticio
          </button>
        }
      >
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Usuario</th>
                <th>Correo ficticio</th>
                <th>Rol</th>
                <th>Estado</th>
                <th>Acción</th>
              </tr>
            </thead>
            <tbody>
              {data.users.map((u) => (
                <tr key={u.id}>
                  <td>
                    <strong>{u.name}</strong>
                  </td>
                  <td>{u.email}</td>
                  <td>{u.role}</td>
                  <td>
                    <Badge>{u.active ? "Activo" : "Inactivo"}</Badge>
                  </td>
                  <td>
                    <button
                      className="btn small-btn"
                      disabled={!can("admin")}
                      onClick={() => setEdit(copy(u))}
                    >
                      <Pencil size={14} /> Editar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
      <div className="two-col">
        <Card
          title="Permisos demostrativos por perfil"
          className="permissions-card"
          subtitle="Todos los perfiles pueden consultar y exportar. Cada permiso habilita únicamente sus acciones correspondientes."
        >
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Rol</th>
                  {PERMISSIONS.map((p) => (
                    <th key={p.key}>{p.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ROLES.map((role) => (
                  <tr key={role}>
                    <td>
                      <strong>{role}</strong>
                      <small className="muted block">
                        {ROLE_DESCRIPTIONS[role]}
                      </small>
                    </td>
                    {PERMISSIONS.map((p) => (
                      <td key={p.key}>
                        <input
                          type="checkbox"
                          aria-label={`${p.label}: ${role}`}
                          disabled={
                            role === "Administrador" && p.key === "admin"
                          }
                          checked={settings.permissions[role][p.key]}
                          onChange={(e) =>
                            setSettings((s) => ({
                              ...s,
                              permissions: {
                                ...s.permissions,
                                [role]: {
                                  ...s.permissions[role],
                                  [p.key]: e.target.checked,
                                },
                              },
                            }))
                          }
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="muted small">
            Guarda las preferencias para aplicar los cambios al menú, las rutas
            y las acciones. Para demostrar otro perfil, cierra sesión y
            selecciona su usuario. El permiso de administración controla el
            acceso a este apartado.
          </p>
          <button
            className="btn"
            onClick={() =>
              action(
                () => mockAdminService.saveSettings(settings),
                "Permisos guardados y aplicados.",
              )
            }
          >
            <Save size={15} /> Guardar permisos
          </button>
        </Card>{" "}
        <Card title="Preferencias y límites ficticios">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void action(
                () => mockAdminService.saveSettings(settings),
                "Preferencias guardadas.",
              );
            }}
          >
            <Field label="Nombre de la organización">
              <input
                value={settings.organization}
                disabled={!can("admin")}
                onChange={(e) =>
                  setSettings((s) => ({ ...s, organization: e.target.value }))
                }
              />
            </Field>
            <div className="two-col">
              <Field label="Máximo de épocas (1–100)">
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={settings.maxEpochs}
                  disabled={!can("admin")}
                  onChange={(e) =>
                    setSettings((s) => ({ ...s, maxEpochs: +e.target.value }))
                  }
                />
              </Field>
              <Field label="Simulaciones simultáneas (1–4)">
                <input
                  type="number"
                  min="1"
                  max="4"
                  value={settings.maxConcurrent}
                  disabled={!can("admin")}
                  onChange={(e) =>
                    setSettings((s) => ({
                      ...s,
                      maxConcurrent: +e.target.value,
                    }))
                  }
                />
              </Field>
            </div>
            <Field label="Memoria ficticia (MB)">
              <input
                type="number"
                min="256"
                step="256"
                value={settings.memory}
                disabled={!can("admin")}
                onChange={(e) =>
                  setSettings((s) => ({ ...s, memory: +e.target.value }))
                }
              />
            </Field>
            <label className="check">
              <input
                type="checkbox"
                checked={settings.compact}
                disabled={!can("admin")}
                onChange={(e) =>
                  setSettings((s) => ({ ...s, compact: e.target.checked }))
                }
              />
              Tablas compactas
            </label>
            <button
              className="btn primary"
              type="submit"
              disabled={!can("admin")}
            >
              <Save size={15} /> Guardar preferencias
            </button>
          </form>
        </Card>
      </div>
      <Card title="Estado de servicios simulados">
        <div className="three-col">
          {[
            ["Interfaz React", "Disponible localmente"],
            ["Servicios Mock", `${active} simulaciones en curso`],
            ["Persistencia", "LocalStorage del navegador"],
          ].map(([t, d]) => (
            <div className="notice" key={t}>
              <span className="live-dot" />
              <strong>{t}</strong>
              <p className="muted small">{d}</p>
            </div>
          ))}
        </div>
        <p className="muted small">
          FastAPI, PostgreSQL, workers y TensorFlow corresponden a fases futuras
          y no intervienen en esta demo.
        </p>
      </Card>
      <Card
        title="Auditoría de demostración"
        subtitle="Historial local de acciones. Este registro no representa un sistema de auditoría seguro."
      >
        <Field label="Buscar eventos">
          <input
            type="search"
            value={filter}
            placeholder="Usuario, acción o detalle…"
            onChange={(e) => setFilter(e.target.value)}
          />
        </Field>
        <div className="audit-scroll">
          <div className="timeline">
            {logs.length ? (
              logs.map((a) => (
                <div key={a.id}>
                  <div className="row between">
                    <strong>{a.action.replaceAll("_", " ")}</strong>
                    <small className="muted">{time(a.at)}</small>
                  </div>
                  <p>{a.detail}</p>
                  <small className="muted">
                    {a.actor} ·{" "}
                    {data.projects.find((p) => p.id === a.projectId)?.name ||
                      "Global / proyecto eliminado"}
                  </small>
                </div>
              ))
            ) : (
              <p className="muted">No hay eventos con este filtro.</p>
            )}
          </div>
        </div>
      </Card>
      {edit && (
        <Modal
          title={
            data.users.some((u) => u.id === edit.id)
              ? "Editar usuario ficticio"
              : "Crear usuario ficticio"
          }
          close={() => setEdit(undefined)}
        >
          <UserForm initial={edit} close={() => setEdit(undefined)} />
        </Modal>
      )}
    </>
  );
}
