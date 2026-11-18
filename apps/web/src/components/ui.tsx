import {
  cloneElement,
  isValidElement,
  createContext,
  useContext,
  useEffect,
  useId,
  useRef,
  type ReactElement,
  type ReactNode,
} from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { X, Inbox } from "lucide-react";
import type { Run } from "../domain";
export const NotifyContext = createContext<
  (message: string, error?: boolean) => void
>(() => {});
export function useAction() {
  const notify = useContext(NotifyContext);
  return async (fn: () => unknown | Promise<unknown>, success?: string) => {
    try {
      await fn();
      if (success) notify(success);
      return true;
    } catch (e) {
      notify(
        e instanceof Error ? e.message : "No se pudo completar la acción.",
        true,
      );
      return false;
    }
  };
}
export function Card({
  title,
  subtitle,
  actions,
  children,
  className = "",
}: {
  title?: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`card ${className}`}>
      {(title || actions) && (
        <div className="card-head">
          <div>
            <h2>{title}</h2>
            {subtitle && <p className="muted small">{subtitle}</p>}
          </div>
          {actions}
        </div>
      )}
      {children}
    </section>
  );
}
export function Empty({
  title = "Todavía no hay registros",
  children,
}: {
  title?: string;
  children?: ReactNode;
}) {
  return (
    <div className="empty">
      <Inbox size={32} />
      <h3>{title}</h3>
      <div className="muted">
        {children || "Los registros disponibles aparecerán aquí."}
      </div>
    </div>
  );
}
export function Badge({ children }: { children: ReactNode }) {
  const s = String(children);
  return (
    <span
      className={`badge ${["Completado", "Aprobado", "Activo"].includes(s) ? "good" : ["Cancelado", "Retirado", "Inactivo"].includes(s) ? "bad" : ""}`}
    >
      {children}
    </span>
  );
}
export function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: ReactNode;
  hint?: string;
}) {
  const id = useId();
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      {isValidElement(children)
        ? cloneElement(children as ReactElement<{ id?: string }>, { id })
        : children}
      {hint && <small className="muted">{hint}</small>}
    </div>
  );
}
export function Stats({
  items,
}: {
  items: { label: string; value: ReactNode; detail?: string }[];
}) {
  return (
    <div className="stats">
      {items.map((s, i) => (
        <div className={`stat stat-${i % 4}`} key={s.label}>
          <div className="stat-label">{s.label}</div>
          <div className="stat-value">{s.value}</div>
          {s.detail && <div className="muted small">{s.detail}</div>}
        </div>
      ))}
    </div>
  );
}
export function Modal({
  title,
  children,
  close,
}: {
  title: string;
  children: ReactNode;
  close: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current!;
    d.showModal();
    return () => {
      d.close();
    };
  }, []);
  return (
    <dialog ref={ref} className="modal" onCancel={close} aria-label={title}>
      <div className="card-head">
        <h2>{title}</h2>
        <button
          className="icon-btn"
          aria-label="Cerrar diálogo"
          onClick={close}
        >
          <X size={19} />
        </button>
      </div>
      {children}
    </dialog>
  );
}
export function Curves({ run, compare }: { run: Run; compare?: Run }) {
  const data = run.metrics.map((m, i) => ({
    ...m,
    compareLoss: compare?.metrics[i]?.valLoss,
    compareAcc: compare?.metrics[i]?.valAccuracy,
  }));
  return (
    <div className="two-col">
      {(["loss", "accuracy"] as const).map((kind) => (
        <div key={kind}>
          <h3>
            {kind === "loss" ? "Loss" : "Indicador accuracy"} · Training /
            Validation
          </h3>
          <div className="chart">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="epoch" stroke="var(--muted)" />
                <YAxis stroke="var(--muted)" domain={[0, 1]} />
                <Tooltip
                  contentStyle={{
                    background: "var(--card)",
                    border: "1px solid var(--border)",
                    color: "var(--text)",
                  }}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey={kind}
                  name="Training"
                  stroke={kind === "loss" ? "#fb7185" : "#22d3ee"}
                  dot={false}
                  isAnimationActive={false}
                />
                <Line
                  type="monotone"
                  dataKey={kind === "loss" ? "valLoss" : "valAccuracy"}
                  name="Validation"
                  stroke={kind === "loss" ? "#fbbf24" : "#34d399"}
                  dot={false}
                  isAnimationActive={false}
                />
                {compare && (
                  <Line
                    dataKey={kind === "loss" ? "compareLoss" : "compareAcc"}
                    name="Comparación (val)"
                    stroke="#a78bfa"
                    strokeDasharray="5 4"
                    dot={false}
                  />
                )}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      ))}
    </div>
  );
}
