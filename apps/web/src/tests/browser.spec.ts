import { test, expect, type Page } from "@playwright/test";
import fs from "node:fs/promises";
import { seedStore } from "../domain";
const nav = (page: Page, text: string) =>
  page
    .getByRole("navigation", { name: "Módulos" })
    .getByRole("link", { name: text })
    .click();
async function login(page: Page, id = "u0") {
  await page.goto("/");
  await page.getByLabel("Usuario de demostración").selectOption(id);
  await page
    .getByRole("button", { name: "Iniciar sesión demostrativa" })
    .click();
  await expect(
    page.getByRole("heading", { name: "Dashboard", exact: true }),
  ).toBeVisible();
}
test("recorrido completo: proyecto → dataset → arquitectura → entrenamiento → modelo → PDF/CSV", async ({
  page,
}, info) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("dialog", (d) => d.accept());
  await page.goto("/");
  await page
    .getByRole("button", { name: "Iniciar sesión demostrativa" })
    .click();
  await expect(page.getByRole("alert")).toContainText("Selecciona un usuario");
  await page.screenshot({ path: info.outputPath("login.png"), fullPage: true });
  await login(page);
  await page.screenshot({
    path: info.outputPath("dashboard.png"),
    fullPage: true,
  });
  await nav(page, "Proyectos de IA");
  await page
    .getByRole("button", { name: "Crear proyecto", exact: true })
    .click();
  await page.getByLabel("Nombre del proyecto").fill("Demo de presentación");
  await page
    .getByLabel("Descripción", { exact: true })
    .fill("Flujo completo con datos ficticios.");
  await page
    .getByLabel("Etiquetas (separadas por comas)")
    .fill("Semana 11, Exposición");
  await page.getByRole("button", { name: "Guardar proyecto" }).click();
  await expect(
    page.getByRole("cell", { name: /Demo de presentación/ }).first(),
  ).toBeVisible();
  await nav(page, "Dashboard");
  await expect(
    page
      .locator(".stat")
      .filter({ hasText: "Proyectos registrados" })
      .locator(".stat-value"),
  ).toHaveText("5");
  await nav(page, "Datasets y EDA");
  await page.locator(".sample-button").first().click();
  await page.getByRole("button", { name: "Simular preprocesamiento" }).click();
  await expect(
    page.getByText("Preprocesamiento simulado listo.", { exact: false }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Guardar dataset" }).click();
  await nav(page, "Arquitecturas");
  await page.getByLabel("Nombre del diseño").fill("MLP Presentación");
  await page.getByLabel("Unidades / filtros").fill("24");
  await page.getByRole("button", { name: "Añadir capa" }).click();
  await page.getByRole("button", { name: "Guardar arquitectura" }).click();
  await page.screenshot({
    path: info.outputPath("architecture.png"),
    fullPage: true,
  });
  await nav(page, "Entrenamientos");
  await page.getByLabel(/Épocas \(máximo/).fill("5");
  await page.getByLabel("Batch size").selectOption("32");
  await page.getByLabel("Optimizador", { exact: true }).selectOption("SGD");
  await page.getByLabel("Learning rate").fill("0.01");
  await page
    .getByRole("button", { name: "Iniciar entrenamiento simulado" })
    .click();
  await page.getByRole("button", { name: "Cancelar", exact: true }).click();
  await expect(
    page.locator(".card-head .badge").filter({ hasText: "Cancelado" }),
  ).toBeVisible();
  await page.waitForTimeout(1200);
  await expect(
    page.locator(".card-head .badge").filter({ hasText: "Cancelado" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Reintentar", exact: true }).click();
  await nav(page, "Fundamentos");
  await expect
    .poll(
      () =>
        page.evaluate(
          () =>
            JSON.parse(localStorage.getItem("neurolab_demo_v2")!).runs[0]
              .status,
        ),
      { timeout: 15000 },
    )
    .toBe("Completado");
  await nav(page, "Evaluación y métricas");
  await expect(
    page.getByRole("heading", { name: "Matriz de confusión demostrativa" }),
  ).toBeVisible();
  const snapshot = await page.evaluate(() => {
    const d = JSON.parse(localStorage.getItem("neurolab_demo_v2")!);
    return d.runs[0];
  });
  expect(snapshot.config).toEqual({
    epochs: 5,
    batch: 32,
    optimizer: "SGD",
    learningRate: 0.01,
  });
  expect(snapshot.architecture.name).toBe("MLP Presentación");
  expect(snapshot.metrics).toHaveLength(5);
  await nav(page, "Registro de modelos");
  await page
    .getByRole("button", { name: "Registrar versión", exact: true })
    .click();
  await page.getByLabel("Nombre del modelo").fill("Modelo de exposición");
  await page
    .getByRole("button", { name: "Registrar versión", exact: true })
    .last()
    .click();
  await page
    .getByLabel("Cambiar estado Modelo de exposición v1.0.0")
    .selectOption("En revisión");
  await page
    .getByLabel("Cambiar estado Modelo de exposición v1.0.0")
    .selectOption("Aprobado");
  await expect(
    page.locator("tr").filter({ hasText: "Modelo de exposición" }),
  ).toContainText("Aprobado");
  await nav(page, "Reportes");
  await expect(page.locator(".report-preview")).toContainText(
    "Demo de presentación",
  );
  await expect(page.locator(".report-preview")).toContainText(
    "MLP Presentación",
  );
  await expect(page.locator(".report-preview")).toContainText(
    "Modelo de exposición",
  );
  await page.screenshot({
    path: info.outputPath("report.png"),
    fullPage: true,
  });
  const downloads: string[] = [];
  page.on("download", (d) => downloads.push(d.suggestedFilename()));
  await page.getByRole("button", { name: "Vista previa CSV" }).click();
  const csvPreview = page.getByRole("dialog", { name: "Vista previa del CSV" });
  await expect(csvPreview).toBeVisible();
  await expect(csvPreview.locator(".csv-sheet")).toContainText(
    "Demo de presentación",
  );
  await expect(csvPreview.locator("tbody tr")).toHaveCount(5);
  expect(downloads).toHaveLength(0);
  const csvPromise = page.waitForEvent("download");
  await csvPreview.getByRole("button", { name: "Descargar CSV" }).click();
  const csv = await fs.readFile(await (await csvPromise).path(), "utf8");
  expect(csv).toContain("Datos simulados");
  expect(csv).toContain("Demo de presentación");
  expect(csv).toContain("5,");
  await csvPreview.getByRole("button", { name: "Volver a editar" }).click();
  await page
    .getByLabel("Observaciones adicionales para el PDF")
    .fill("Informe preparado para la exposición académica.");
  await page.getByRole("button", { name: "Vista previa PDF" }).click();
  const pdfPreview = page.getByRole("dialog", { name: "Vista previa del PDF" });
  await expect(pdfPreview.locator(".document-stage")).toHaveAttribute(
    "data-ready",
    "true",
  );
  expect(downloads).toHaveLength(1);
  await page.screenshot({ path: info.outputPath("pdf-preview-desktop.png") });
  await fs.writeFile(
    info.outputPath("pdf-first-page.png"),
    Buffer.from(
      await pdfPreview
        .getByTestId("pdf-page")
        .evaluate(
          (el) =>
            (el as HTMLCanvasElement).toDataURL("image/png").split(",")[1],
        ),
      "base64",
    ),
  );
  await pdfPreview.getByRole("button", { name: "Página siguiente" }).click();
  await expect(pdfPreview.locator(".page-counter")).toContainText("Página 2");
  await expect(pdfPreview.locator(".document-stage")).toHaveAttribute(
    "data-ready",
    "true",
  );
  await pdfPreview.getByRole("button", { name: "Aumentar zoom" }).click();
  await expect(pdfPreview.locator(".document-stage")).toHaveAttribute(
    "data-ready",
    "true",
  );
  await pdfPreview
    .getByRole("button", { name: "Ajustar página al ancho" })
    .click();
  await expect(pdfPreview.locator(".document-stage")).toHaveAttribute(
    "data-ready",
    "true",
  );
  const pdfPromise = page.waitForEvent("download");
  await pdfPreview.getByRole("button", { name: "Descargar PDF" }).click();
  const pdf = await fs.readFile(await (await pdfPromise).path());
  expect(pdf.subarray(0, 5).toString()).toBe("%PDF-");
  expect(pdf.length).toBeGreaterThan(5000);
  await fs.writeFile(info.outputPath("report.pdf"), pdf);
  await pdfPreview.getByRole("button", { name: "Cerrar vista previa" }).click();
  await page.reload();
  await expect(page.locator(".report-preview")).toContainText(
    "Demo de presentación",
  );
  await expect(page.locator(".report-preview")).toContainText(
    "Modelo de exposición",
  );
  expect(errors).toEqual([]);
});
test("los 10 módulos abren; roles, usuarios, familias y móvil responden", async ({
  page,
}, info) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await login(page);
  for (const [name, heading] of [
    ["Proyectos de IA", "Proyectos de IA"],
    ["Fundamentos", "Fundamentos"],
    ["Arquitecturas", "Arquitecturas"],
    ["Datasets y EDA", "Datasets y EDA"],
    ["Entrenamientos", "Entrenamientos"],
    ["Evaluación y métricas", "Evaluación y métricas"],
    ["Registro de modelos", "Registro de modelos"],
    ["Reportes", "Reportes"],
    ["Administración", "Administración"],
  ]) {
    await nav(page, name);
    await expect(
      page.getByRole("heading", { name: heading, exact: true }),
    ).toBeVisible();
  }
  await page.getByRole("button", { name: "Crear usuario ficticio" }).click();
  await page.getByLabel("Nombre de ejemplo").fill("Usuario de prueba");
  await page.getByLabel("Correo ficticio").fill("prueba@demo.neurolab");
  await page
    .getByLabel("Rol demostrativo", { exact: true })
    .selectOption("Lector");
  await page.getByRole("button", { name: "Guardar usuario" }).click();
  await expect(
    page.getByRole("cell", { name: "Usuario de prueba", exact: true }),
  ).toBeVisible();
  await nav(page, "Arquitecturas");
  for (const family of ["CNN", "RNN", "GAN", "Feedforward"]) {
    await page.getByLabel("Familia de red").selectOption(family);
    await expect(
      page.getByRole("img", { name: `Diagrama de arquitectura ${family}` }),
    ).toBeVisible();
  }
  await page.getByRole("button", { name: "Guardar arquitectura" }).click();
  await nav(page, "Datasets y EDA");
  await page.getByLabel("Seleccionar archivo CSV").setInputFiles({
    name: "demo.csv",
    mimeType: "text/csv",
    buffer: Buffer.from("a,b\n1,0\n"),
  });
  await expect(
    page.getByText("Importación demostrativa: el archivo no se ha analizado."),
  ).toBeVisible();
  await page.getByRole("button", { name: "Guardar dataset" }).click();
  await page
    .getByRole("button", { name: "Cerrar sesión", exact: true })
    .click();
  await login(page, "u4");
  await nav(page, "Proyectos de IA");
  await expect(
    page.getByRole("button", { name: "Crear proyecto", exact: true }),
  ).toHaveCount(0);
  await expect(
    page
      .getByRole("navigation", { name: "Módulos" })
      .getByRole("link", { name: "Administración" }),
  ).toHaveCount(0);
  await page.goto("/#/admin");
  await expect(
    page.getByRole("heading", { name: "Acceso restringido" }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Volver al dashboard" }).click();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "Abrir navegación" }).click();
  await nav(page, "Dashboard");
  await expect(
    page.getByRole("heading", { name: "Dashboard", exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await expect
    .poll(() =>
      page
        .locator(".sidebar")
        .evaluate((el) => el.getBoundingClientRect().right),
    )
    .toBeLessThanOrEqual(0);
  await page.screenshot({
    path: info.outputPath("mobile.png"),
    fullPage: true,
  });
  for (const name of [
    "Proyectos de IA",
    "Fundamentos",
    "Arquitecturas",
    "Datasets y EDA",
    "Entrenamientos",
    "Evaluación y métricas",
    "Registro de modelos",
    "Reportes",
  ]) {
    await page.getByRole("button", { name: "Abrir navegación" }).click();
    await nav(page, name);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
  await page.getByRole("button", { name: "Activar modo claro" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  expect(errors).toEqual([]);
});

test("vista previa sin descarga, navegación móvil y anexo opcional", async ({
  page,
}, info) => {
  const downloads: string[] = [],
    errors: string[] = [];
  page.on("download", (d) => downloads.push(d.suggestedFilename()));
  page.on("pageerror", (e) => errors.push(e.message));
  await login(page);
  await nav(page, "Reportes");
  await page.getByRole("button", { name: "Vista previa PDF" }).click();
  const preview = page.getByRole("dialog", { name: "Vista previa del PDF" });
  await expect(preview.locator(".document-stage")).toHaveAttribute(
    "data-ready",
    "true",
  );
  const basePages = Number(
    (await preview.locator(".page-counter").innerText()).match(/de (\d+)/)![1],
  );
  expect(basePages).toBeGreaterThanOrEqual(3);
  expect(downloads).toHaveLength(0);
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(preview.locator(".document-stage")).toHaveAttribute(
    "data-ready",
    "true",
  );
  await expect
    .poll(() =>
      preview
        .getByTestId("pdf-page")
        .evaluate((el) => el.getBoundingClientRect().width),
    )
    .toBeLessThan(390);
  await page.screenshot({ path: info.outputPath("pdf-preview-mobile.png") });
  await preview.getByRole("button", { name: "Página siguiente" }).click();
  await expect(preview.locator(".page-counter")).toContainText("Página 2");
  await expect(preview.locator(".document-stage")).toHaveAttribute(
    "data-ready",
    "true",
  );
  await page.keyboard.press("Escape");
  await expect(preview).not.toBeVisible();
  expect(downloads).toHaveLength(0);
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page
    .getByLabel("Añadir anexo con los logs de todas las épocas")
    .check();
  await page.getByRole("button", { name: "Vista previa PDF" }).click();
  await expect(preview.locator(".document-stage")).toHaveAttribute(
    "data-ready",
    "true",
  );
  const pagesWithLogs = Number(
    (await preview.locator(".page-counter").innerText()).match(/de (\d+)/)![1],
  );
  expect(pagesWithLogs).toBeGreaterThan(basePages);
  await preview
    .getByRole("button", { name: `Ver página ${pagesWithLogs}`, exact: true })
    .click();
  await expect(preview.locator(".document-stage")).toHaveAttribute(
    "data-ready",
    "true",
  );
  const annexImage = Buffer.from(
    await preview
      .getByTestId("pdf-page")
      .evaluate(
        (el) => (el as HTMLCanvasElement).toDataURL("image/png").split(",")[1],
      ),
    "base64",
  );
  expect(annexImage.length).toBeGreaterThan(10000);
  await fs.writeFile(info.outputPath("pdf-annex.png"), annexImage);
  const downloaded = page.waitForEvent("download");
  await preview.getByRole("button", { name: "Descargar PDF" }).click();
  await fs.writeFile(
    info.outputPath("report-with-logs.pdf"),
    await fs.readFile(await (await downloaded).path()),
  );
  expect(downloads).toHaveLength(1);
  expect(errors).toEqual([]);
});

for (const profile of [
  {
    id: "u0",
    name: "Administrador",
    projects: true,
    technical: true,
    approve: true,
    admin: true,
  },
  {
    id: "u1",
    name: "Responsable de proyecto",
    projects: true,
    technical: false,
    approve: false,
    admin: false,
  },
  {
    id: "u2",
    name: "Ingeniero de IA",
    projects: false,
    technical: true,
    approve: false,
    admin: false,
  },
  {
    id: "u3",
    name: "Revisor",
    projects: false,
    technical: false,
    approve: true,
    admin: false,
  },
  {
    id: "u4",
    name: "Lector",
    projects: false,
    technical: false,
    approve: false,
    admin: false,
  },
])
  test(`perfil ${profile.name}: solo muestra sus acciones y respeta rutas`, async ({
    page,
  }, info) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("dialog", (d) => d.accept());
    await login(page, profile.id);
    const navigation = page.getByRole("navigation", { name: "Módulos" });
    await expect(
      navigation.getByRole("link", { name: "Administración" }),
    ).toHaveCount(profile.admin ? 1 : 0);
    await expect(
      page.getByRole("link", { name: "Nuevo proyecto", exact: true }),
    ).toHaveCount(profile.projects ? 1 : 0);
    await expect(
      page.getByRole("link", { name: "Entrenar", exact: true }),
    ).toHaveCount(profile.technical ? 1 : 0);
    await nav(page, "Proyectos de IA");
    await expect(
      page.getByRole("button", { name: "Crear proyecto", exact: true }),
    ).toHaveCount(profile.projects ? 1 : 0);
    await expect(page.getByRole("button", { name: /^Editar / })).toHaveCount(
      profile.projects ? 4 : 0,
    );
    await expect(page.getByRole("button", { name: /^Eliminar / })).toHaveCount(
      profile.projects ? 4 : 0,
    );
    await expect(
      page.getByRole("button", { name: "Abrir", exact: true }),
    ).toHaveCount(4);
    await nav(page, "Datasets y EDA");
    await expect(page.getByLabel("Seleccionar archivo CSV")).toHaveCount(
      profile.technical ? 1 : 0,
    );
    await expect(
      page.getByRole("button", { name: "Guardar dataset" }),
    ).toHaveCount(profile.technical ? 1 : 0);
    await expect(
      page.getByRole("button", { name: "Simular preprocesamiento" }),
    ).toHaveCount(profile.technical ? 1 : 0);
    await expect(
      page.locator(".stat").filter({ hasText: "Nombre / formato" }),
    ).toContainText("Arrhythmia_ECG_Demo.csv");
    await nav(page, "Arquitecturas");
    await expect(
      page.getByRole("button", { name: "Nuevo diseño" }),
    ).toHaveCount(profile.technical ? 1 : 0);
    await expect(page.getByRole("button", { name: "Añadir capa" })).toHaveCount(
      profile.technical ? 1 : 0,
    );
    await expect(
      page.getByRole("button", { name: "Guardar arquitectura" }),
    ).toHaveCount(profile.technical ? 1 : 0);
    await expect(
      page.getByRole("img", { name: "Diagrama de arquitectura Feedforward" }),
    ).toBeVisible();
    await nav(page, "Entrenamientos");
    await expect(
      page.getByRole("heading", { name: "Configurar simulación" }),
    ).toHaveCount(profile.technical ? 1 : 0);
    await expect(
      page.getByRole("button", { name: "Iniciar entrenamiento simulado" }),
    ).toHaveCount(profile.technical ? 1 : 0);
    await expect(
      page.getByRole("button", { name: "Cancelar", exact: true }),
    ).toHaveCount(profile.technical ? 1 : 0);
    await expect(
      page.getByRole("button", { name: "Reintentar", exact: true }),
    ).toHaveCount(profile.technical ? 1 : 0);
    await expect(
      page.getByRole("heading", { name: "Historial de simulaciones" }),
    ).toBeVisible();
    await page
      .getByLabel("Proyecto activo", { exact: true })
      .selectOption("p1");
    await nav(page, "Registro de modelos");
    await expect(
      page.getByRole("button", { name: "Registrar versión", exact: true }),
    ).toHaveCount(profile.technical ? 1 : 0);
    const status = page.getByLabel(/Cambiar estado/);
    await expect(status).toHaveCount(
      profile.technical || profile.approve ? 1 : 0,
    );
    if (profile.technical || profile.approve) {
      await expect(status.locator('option[value="Aprobado"]')).toHaveCount(
        profile.approve ? 1 : 0,
      );
      await expect(status.locator('option[value="Borrador"]')).toHaveCount(
        profile.technical ? 1 : 0,
      );
    }
    if (profile.id === "u3") {
      await status.selectOption("Aprobado");
      await expect(page.locator("tbody")).toContainText("Aprobado");
    }
    if (profile.id === "u4")
      await page.screenshot({
        path: info.outputPath("lector-modelos.png"),
        fullPage: true,
      });
    await nav(page, "Evaluación y métricas");
    await expect(
      page.getByRole("link", { name: "Registrar modelo →", exact: true }),
    ).toHaveCount(profile.technical ? 1 : 0);
    await nav(page, "Reportes");
    await expect(
      page.getByRole("button", { name: "Vista previa PDF" }),
    ).toBeVisible();
    if (!profile.admin) {
      await page.goto("/#/admin");
      await expect(
        page.getByRole("heading", { name: "Acceso restringido" }),
      ).toBeVisible();
      await expect(
        page.getByRole("button", { name: "Crear usuario ficticio" }),
      ).toHaveCount(0);
      await expect(
        page.getByRole("cell", { name: "alex@demo.neurolab", exact: true }),
      ).toHaveCount(0);
      await page.getByRole("link", { name: "Volver al dashboard" }).click();
    }
    expect(errors).toEqual([]);
  });

test("un permiso granular cambia los controles sin habilitar otras funciones", async ({
  page,
}) => {
  await login(page);
  await nav(page, "Administración");
  await page.getByLabel("Editar datasets: Lector", { exact: true }).check();
  await page
    .getByRole("button", { name: "Guardar permisos", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Cerrar sesión", exact: true })
    .click();
  await login(page, "u4");
  await nav(page, "Datasets y EDA");
  await expect(
    page.getByRole("button", { name: "Guardar dataset" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Guardar dataset" }).click();
  await expect(page.getByRole("status")).toContainText("Dataset guardado");
  await nav(page, "Proyectos de IA");
  await expect(
    page.getByRole("button", { name: "Crear proyecto", exact: true }),
  ).toHaveCount(0);
  await nav(page, "Arquitecturas");
  await expect(
    page.getByRole("button", { name: "Guardar arquitectura" }),
  ).toHaveCount(0);
  await expect(
    page
      .getByRole("navigation", { name: "Módulos" })
      .getByRole("link", { name: "Administración" }),
  ).toHaveCount(0);
});

test("la sesión anterior migra sus permisos sin perder proyectos ni modelos", async ({
  page,
}) => {
  const saved = seedStore();
  saved.projects[0].name = "Proyecto conservado durante migración";
  const legacy = {
    ...saved,
    settings: {
      ...saved.settings,
      permissions: Object.fromEntries(
        [
          "Administrador",
          "Responsable de proyecto",
          "Ingeniero de IA",
          "Revisor",
          "Lector",
        ].map((role, i) => [
          role,
          { edit: i < 3, approve: i === 0 || i === 3, admin: i === 0 },
        ]),
      ),
    },
  };
  await page.addInitScript((value) => {
    localStorage.setItem("neurolab_demo_v2", JSON.stringify(value));
  }, legacy);
  await login(page, "u2");
  await nav(page, "Proyectos de IA");
  await expect(
    page.getByRole("cell", { name: /Proyecto conservado durante migración/ }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Crear proyecto", exact: true }),
  ).toHaveCount(0);
  await nav(page, "Entrenamientos");
  await expect(
    page.getByRole("button", { name: "Iniciar entrenamiento simulado" }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => JSON.parse(localStorage.getItem("neurolab_demo_v2")!).models.length,
    ),
  ).toBe(saved.models.length);
});
