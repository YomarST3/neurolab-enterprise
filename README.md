# NeuroLab Enterprise - Prototipo simulado

Aplicación local con **React, TypeScript y Vite**, 10 módulos, perfiles ficticios y servicios Mock. La demo no necesita backend, PostgreSQL ni motores de aprendizaje automático.

## Iniciar

Haz doble clic en `C:\proyectos\AZURE\start_neurolab.bat` y abre **http://127.0.0.1:8000**. Selecciona **Alex Vance - Administrador** para presentar todas las acciones. Mantén la ventana del servidor abierta.

Guía de exposición: [DEMO_MANANA.md](C:/proyectos/AZURE/DEMO_MANANA.md).

También puedes iniciar desde `neurolab-enterprise/apps/web`:

```powershell
npm.cmd ci
npm.cmd run build
npm.cmd run preview
```

Para desarrollo: `npm.cmd run dev`. Mantén un solo servidor en el puerto 8000. La aplicación React requiere un servidor HTTP; no se inicia abriendo el HTML directamente.

## Flujo y módulos

Login ficticio → proyecto → dataset → arquitectura → entrenamiento simulado → evaluación → modelo → reporte.

- M01: indicadores, actividad y alertas derivados del estado.
- M02: crear, editar, eliminar, buscar, filtrar y consultar proyectos, integrantes, roles, estados e historial.
- M03: simulador de neurona, activaciones, estructura, familias y glosario.
- M04: plantillas Feedforward/CNN/RNN/GAN, capas editables, topología y validación local.
- M05: ejemplos, metadatos de archivo, vista previa sintética, EDA, limpieza y partición 70/15/15.
- M06: cinco fases simuladas, progreso, logs, cancelación, reintento e historial.
- M07: curvas interactivas, matriz coherente y comparación de ejecuciones del mismo dataset.
- M08: versiones relacionadas con entrenamientos, estados, aprobación, comparación e historial.
- M09: vista previa y exportación real de PDF/CSV con los datos de la ejecución elegida.
- M10: usuarios ficticios, roles, permisos configurables, límites, preferencias y auditoría local.

## Persistencia y alcance

Los datos se conservan bajo `neurolab_demo_v2` en LocalStorage; la sesión usa SessionStorage. Una simulación continúa al cambiar de módulo. Si recargas o cierras la página durante la ejecución, se conserva como cancelada y permite reintento.

Cada entrenamiento toma copias de su proyecto, dataset, arquitectura e hiperparámetros. Los modelos y reportes apuntan a esa ejecución y no cambian al editar los recursos originales.

Seleccionar un CSV registra su nombre y tamaño, sin analizar el contenido. Filas, columnas y estadísticas se identifican como sintéticas. CNN/RNN/GAN y sus parámetros son representaciones simplificadas. Los permisos no representan seguridad real y los manifiestos JSON no contienen pesos entrenados.

## Código y verificación

`src/domain.ts`: entidades, semillas, validación y motor de simulación.
`src/services/`: servicios Mock, almacenamiento, permisos y exportaciones.
`src/components/`: módulos y componentes de interfaz.
`src/tests/`: pruebas de consistencia, permisos y navegador.

Desde `apps/web`:

```powershell
npm.cmd run build
npm.cmd test
npm.cmd run test:e2e
```

Las pruebas de navegador usan Edge instalado y necesitan el servidor local iniciado. Ejecutan contextos aislados sin modificar tus datos habituales. `package-lock.json` conserva las versiones instaladas.

La interfaz y documentación anteriores se conservan en `apps/web/legacy/`. El backend e infraestructura anteriores se mantienen como referencia futura y no intervienen en la demo.
