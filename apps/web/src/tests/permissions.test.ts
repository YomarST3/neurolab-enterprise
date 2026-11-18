import { test } from "node:test";
import assert from "node:assert/strict";
import {
  ROLES,
  availableModelTransitions,
  canAccessModule,
  defaultPermissions,
  normalizePermissions,
} from "../domain";
test("cada perfil tiene un alcance distinto y conserva consulta de módulos técnicos", () => {
  const p = defaultPermissions();
  assert.ok(Object.values(p.Administrador).every(Boolean));
  assert.deepEqual(
    Object.keys(p["Responsable de proyecto"]).filter(
      (k) => p["Responsable de proyecto"][k as keyof typeof p.Administrador],
    ),
    ["projects"],
  );
  assert.deepEqual(
    Object.keys(p["Ingeniero de IA"]).filter(
      (k) => p["Ingeniero de IA"][k as keyof typeof p.Administrador],
    ),
    ["datasets", "architectures", "training", "models"],
  );
  assert.equal(p.Revisor.approve, true);
  assert.ok(Object.values(p.Lector).every((v) => !v));
  for (const role of ROLES) {
    for (const path of [
      "/projects",
      "/datasets",
      "/architectures",
      "/training",
      "/evaluation",
      "/models",
      "/reports",
    ])
      assert.equal(canAccessModule(path, p[role]), true);
    assert.equal(canAccessModule("/ADMIN/", p[role]), role === "Administrador");
  }
});
test("la migración separa responsables e ingenieros y conserva concesiones explícitas", () => {
  const legacy = Object.fromEntries(
    ROLES.map((role, i) => [
      role,
      { edit: i < 3, approve: i === 0 || i === 3, admin: i === 0 },
    ]),
  );
  assert.deepEqual(normalizePermissions(legacy), defaultPermissions());
  legacy.Lector.edit = true;
  const migrated = normalizePermissions(legacy);
  assert.equal(migrated.Lector.projects, true);
  assert.equal(migrated.Lector.training, true);
  const custom = defaultPermissions();
  custom.Revisor.datasets = true;
  assert.deepEqual(normalizePermissions(custom), custom);
});
test("los cambios de estado solo ofrecen las transiciones permitidas para cada perfil", () => {
  const p = defaultPermissions();
  assert.deepEqual(availableModelTransitions("En revisión", p.Revisor), [
    "Aprobado",
    "Retirado",
  ]);
  assert.deepEqual(
    availableModelTransitions("En revisión", p["Ingeniero de IA"]),
    ["Borrador"],
  );
  assert.deepEqual(
    availableModelTransitions("Borrador", p["Ingeniero de IA"]),
    ["En revisión"],
  );
  for (const role of ["Lector", "Responsable de proyecto"] as const)
    for (const status of [
      "Borrador",
      "En revisión",
      "Aprobado",
      "Retirado",
    ] as const)
      assert.deepEqual(availableModelTransitions(status, p[role]), []);
});
