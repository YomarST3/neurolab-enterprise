import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { Eye, LockKeyhole } from "lucide-react";
import type { Permission } from "../domain";
import { useDemo } from "../services/mock";

export function PermissionAction({
  permission,
  children,
}: {
  permission: Permission;
  children: ReactNode;
}) {
  const { can } = useDemo();
  return can(permission) ? children : null;
}
export function ConsultationNotice({ permission }: { permission: Permission }) {
  const { can, user } = useDemo();
  if (can(permission)) return null;
  return (
    <div className="consultation-notice">
      <Eye size={16} />
      <div>
        <strong>Vista de consulta</strong>
        <span>
          {user?.role}: puedes revisar la información guardada en este apartado.
        </span>
      </div>
    </div>
  );
}
export function RequirePermission({
  permission,
  children,
}: {
  permission: Permission;
  children: ReactNode;
}) {
  const { can } = useDemo();
  return can(permission) ? (
    children
  ) : (
    <section className="card access-denied" role="alert">
      <LockKeyhole size={32} />
      <h2>Acceso restringido</h2>
      <p>
        Tu perfil no tiene acceso a este apartado. Puedes continuar consultando
        los módulos disponibles en el menú.
      </p>
      <Link className="btn primary" to="/dashboard">
        Volver al dashboard
      </Link>
    </section>
  );
}
