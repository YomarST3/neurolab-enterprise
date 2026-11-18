import { useEffect, useState } from "react";
import {
  HashRouter,
  NavLink,
  Navigate,
  Route,
  Routes,
  useLocation,
  useNavigate,
  Link,
} from "react-router-dom";
import {
  Activity,
  BarChart3,
  BookOpen,
  Box,
  BrainCircuit,
  CheckCircle2,
  ChevronRight,
  Database,
  FileText,
  FolderKanban,
  LayoutDashboard,
  LogOut,
  Menu,
  Moon,
  Play,
  Settings,
  Sun,
  X,
} from "lucide-react";
import {
  mockAuthService,
  mockProjectService,
  startSimulationClock,
  useDemo,
} from "./services/mock";
import { NotifyContext, useAction, Field } from "./components/ui";
import { Dashboard, Projects } from "./components/projects";
import { Fundamentals, Architectures, Datasets } from "./components/design";
import { Training, Evaluation, Models, Reports } from "./components/operations";
import { Admin } from "./components/admin";
import { RequirePermission } from "./components/access";
import { canAccessModule, ROLE_DESCRIPTIONS } from "./domain";
const nav = [
  {
    path: "/dashboard",
    code: "M01",
    label: "Dashboard",
    icon: LayoutDashboard,
  },
  {
    path: "/projects",
    code: "M02",
    label: "Proyectos de IA",
    icon: FolderKanban,
  },
  { path: "/fundamentals", code: "M03", label: "Fundamentos", icon: BookOpen },
  {
    path: "/architectures",
    code: "M04",
    label: "Arquitecturas",
    icon: BrainCircuit,
  },
  { path: "/datasets", code: "M05", label: "Datasets y EDA", icon: Database },
  { path: "/training", code: "M06", label: "Entrenamientos", icon: Play },
  {
    path: "/evaluation",
    code: "M07",
    label: "Evaluación y métricas",
    icon: BarChart3,
  },
  { path: "/models", code: "M08", label: "Registro de modelos", icon: Box },
  { path: "/reports", code: "M09", label: "Reportes", icon: FileText },
  { path: "/admin", code: "M10", label: "Administración", icon: Settings },
];
function Login() {
  const { data } = useDemo(),
    action = useAction();
  const [id, setId] = useState(""),
    [error, setError] = useState("");
  const navigate = useNavigate();
  return (
    <main className="login-page">
      <section className="login-story">
        <div className="brand">
          <div className="brand-icon">
            <BrainCircuit />
          </div>
          <div>
            <strong>NeuroLab Enterprise</strong>
            <small>Laboratorio de inteligencia artificial</small>
          </div>
        </div>
        <div>
          <span className="eyebrow">SEMANA 11 · LABORATORIO INTERACTIVO</span>
          <h1>
            De una idea
            <br />a una red neuronal.
          </h1>
          <p>
            Diseña, explora y presenta el ciclo completo de un proyecto de IA en
            un entorno demostrativo.
          </p>
          <div className="login-features">
            {[
              "10 módulos conectados",
              "Simulaciones en el navegador",
              "Reportes PDF y CSV",
            ].map((x) => (
              <span key={x}>
                <CheckCircle2 size={17} />
                {x}
              </span>
            ))}
          </div>
        </div>
        <p className="muted small">
          Sin motores de IA ni servicios externos. Tus datos de demostración se
          guardan en este navegador.
        </p>
      </section>
      <section className="login-form">
        <div className="login-box">
          <span className="demo-label">
            Prototipo demostrativo — Datos simulados
          </span>
          <h2>Bienvenido al laboratorio</h2>
          <p className="muted">
            Selecciona un perfil ficticio para comenzar la demostración.
          </p>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              if (!id) {
                setError("Selecciona un usuario para continuar.");
                return;
              }
              if (await action(() => mockAuthService.login(id)))
                navigate("/dashboard");
            }}
          >
            <Field label="Usuario de demostración">
              <select
                value={id}
                onChange={(e) => {
                  setId(e.target.value);
                  setError("");
                }}
                aria-invalid={!!error}
              >
                <option value="">Selecciona un perfil…</option>
                {data.users
                  .filter((u) => u.active)
                  .map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} · {u.role}
                    </option>
                  ))}
              </select>
            </Field>
            {error && (
              <p className="error" role="alert">
                {error}
              </p>
            )}
            {id && (
              <div className="notice">
                <strong>{data.users.find((u) => u.id === id)?.role}</strong>
                <br />
                {ROLE_DESCRIPTIONS[data.users.find((u) => u.id === id)!.role]}
              </div>
            )}
            <button className="btn primary full" type="submit">
              Iniciar sesión demostrativa <ChevronRight size={17} />
            </button>
          </form>
          <p className="muted small">
            No se solicitan ni almacenan contraseñas. Para presentar todas las
            acciones, elige Administrador.
          </p>
        </div>
      </section>
    </main>
  );
}
function Shell() {
  const { data, user, persistenceError } = useDemo();
  const location = useLocation(),
    navigate = useNavigate();
  const [mobile, setMobile] = useState(false),
    [theme, setTheme] = useState(
      () => localStorage.getItem("neurolab_theme") || "dark",
    );
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem("neurolab_theme", theme);
  }, [theme]);
  useEffect(() => {
    setMobile(false);
  }, [location.pathname]);
  if (!user) return <Login />;
  const current = nav.find((n) => n.path === location.pathname) || nav[0];
  const p = data.projects.find((p) => p.id === data.activeProjectId),
    runs = data.runs.filter((r) => r.projectId === p?.id),
    models = data.models.filter((m) => m.projectId === p?.id);
  const steps = [
    { label: "Proyecto", path: "/projects", done: !!p },
    {
      label: "Dataset",
      path: "/datasets",
      done: data.datasets.some((d) => d.projectId === p?.id),
    },
    {
      label: "Arquitectura",
      path: "/architectures",
      done: data.architectures.some((a) => a.projectId === p?.id),
    },
    {
      label: "Entrenamiento",
      path: "/training",
      done: runs.some((r) => r.status === "Completado"),
    },
    {
      label: "Métricas",
      path: "/evaluation",
      done: runs.some((r) => r.evaluation),
    },
    { label: "Modelo", path: "/models", done: !!models.length },
    { label: "Reporte", path: "/reports", done: false },
  ];
  return (
    <div className={`app-shell ${data.settings.compact ? "compact" : ""}`}>
      <aside className={`sidebar ${mobile ? "open" : ""}`}>
        <div className="brand">
          <div className="brand-icon">
            <BrainCircuit />
          </div>
          <div>
            <strong>NeuroLab</strong>
            <small>ENTERPRISE · DEMO</small>
          </div>
          <button
            className="icon-btn mobile-only"
            aria-label="Cerrar navegación"
            onClick={() => setMobile(false)}
          >
            <X size={20} />
          </button>
        </div>
        <div className="nav-label">WORKSPACE DE INTELIGENCIA ARTIFICIAL</div>
        <nav aria-label="Módulos">
          {nav
            .filter((item) =>
              canAccessModule(item.path, data.settings.permissions[user.role]),
            )
            .map(({ path, label, code, icon: Icon }) => (
              <NavLink
                key={path}
                to={path}
                onClick={() => setMobile(false)}
                className={({ isActive }) =>
                  `nav-item ${isActive ? "active" : ""}`
                }
              >
                <Icon size={18} />
                <span>{label}</span>
                <small>{code}</small>
              </NavLink>
            ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="notice small">
            <span className="live-dot" /> Todo ocurre en tu navegador
            <br />
            <span className="muted">
              Persistencia local · Sin entrenamiento real
            </span>
          </div>
          <div className="user-pill">
            <span className="avatar">
              {user.name
                .split(" ")
                .map((s) => s[0])
                .slice(0, 2)
                .join("")}
            </span>
            <div>
              <strong>{user.name}</strong>
              <small>{user.role}</small>
            </div>
            <button
              className="icon-btn"
              title="Cerrar sesión y cambiar de usuario"
              aria-label="Cerrar sesión"
              onClick={() => {
                mockAuthService.logout();
                navigate("/dashboard");
              }}
            >
              <LogOut size={17} />
            </button>
          </div>
        </div>
      </aside>
      {mobile && (
        <button
          className="nav-backdrop"
          aria-label="Cerrar menú"
          onClick={() => setMobile(false)}
        />
      )}
      <div className="main-wrapper">
        <header className="topbar">
          <div className="row">
            <button
              className="icon-btn mobile-only"
              onClick={() => setMobile(true)}
              aria-label="Abrir navegación"
            >
              <Menu size={21} />
            </button>
            <span className="muted small">NeuroLab</span>
            <ChevronRight size={13} />
            <strong>{current.label}</strong>
          </div>
          <div className="row">
            <label className="workspace-select">
              <span className="sr-only">Proyecto activo</span>
              <select
                aria-label="Proyecto activo"
                value={p?.id || ""}
                onChange={(e) => mockProjectService.select(e.target.value)}
              >
                {!p && <option value="">Sin proyecto</option>}
                {data.projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </label>
            <button
              className="icon-btn"
              aria-label={
                theme === "dark" ? "Activar modo claro" : "Activar modo oscuro"
              }
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            >
              {theme === "dark" ? <Sun size={19} /> : <Moon size={19} />}
            </button>
          </div>
        </header>
        <div className="demo-banner">
          <span className="live-dot" />
          <span>Prototipo demostrativo — Datos simulados</span>
          <span className="muted small">
            React + TypeScript · Almacenamiento local
          </span>
        </div>
        <div className="journey" aria-label="Recorrido de demostración">
          {steps.map((s, i) => (
            <Link
              key={s.path}
              to={s.path}
              className={
                location.pathname === s.path ? "current" : s.done ? "done" : ""
              }
            >
              <span>{s.done ? "✓" : i + 1}</span>
              {s.label}
            </Link>
          ))}
        </div>
        <main className="viewport" id="main">
          <div className="page-head">
            <div>
              <span className="eyebrow">
                {current.code} / LABORATORIO DEMOSTRATIVO
              </span>
              <h1>{current.label}</h1>
              <p className="muted">
                {p ? p.name : "Selecciona un proyecto para comenzar."}
              </p>
            </div>
            <span className="badge">
              <Activity size={13} /> Simulación local
            </span>
          </div>
          {persistenceError && (
            <div className="notice warning" role="alert">
              {persistenceError}
            </div>
          )}
          <Routes>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/projects" element={<Projects />} />
            <Route path="/fundamentals" element={<Fundamentals />} />
            <Route
              path="/architectures"
              element={<Architectures key={p?.id} />}
            />
            <Route path="/datasets" element={<Datasets key={p?.id} />} />
            <Route path="/training" element={<Training key={p?.id} />} />
            <Route path="/evaluation" element={<Evaluation key={p?.id} />} />
            <Route path="/models" element={<Models key={p?.id} />} />
            <Route path="/reports" element={<Reports key={p?.id} />} />
            <Route
              path="/admin"
              element={
                <RequirePermission permission="admin">
                  <Admin />
                </RequirePermission>
              }
            />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
          <footer className="page-footer">
            {data.settings.organization} · Semana 11 · Todos los resultados son
            ilustrativos.
          </footer>
        </main>
      </div>
    </div>
  );
}
export default function App() {
  const [toast, setToast] = useState<{
    message: string;
    error: boolean;
    id: number;
  }>();
  useEffect(startSimulationClock, []);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(undefined), 5500);
    return () => clearTimeout(t);
  }, [toast]);
  return (
    <NotifyContext.Provider
      value={(message, error = false) =>
        setToast({ message, error, id: Date.now() })
      }
    >
      <HashRouter>
        <Shell />
      </HashRouter>
      {toast && (
        <div
          className={`toast ${toast.error ? "error" : ""}`}
          role={toast.error ? "alert" : "status"}
        >
          <CheckCircle2 size={18} />
          <span>{toast.message}</span>
          <button
            className="icon-btn"
            aria-label="Cerrar notificación"
            onClick={() => setToast(undefined)}
          >
            <X size={16} />
          </button>
        </div>
      )}
    </NotifyContext.Provider>
  );
}
