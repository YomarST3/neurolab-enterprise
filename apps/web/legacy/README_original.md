# 🧠 NeuroLab Enterprise
### Plataforma Enterprise de Redes Neuronales Artificiales
**Aplicación práctica de las operaciones de la Semana 11**  
*React + TypeScript + API Python + TensorFlow/Keras + PostgreSQL*  
*Versión 1.0 • Octubre / Noviembre 2026*

---

## 📋 Resumen del Proyecto

**NeuroLab Enterprise** es una plataforma web modular diseñada bajo estándares empresariales para concebir, diseñar, entrenar, evaluar, versionar y gobernar modelos de redes neuronales artificiales.

El sistema da cumplimiento riguroso a las cuatro operaciones de aprendizaje de la **Semana 11** (*"Define la estructura y crea una red neuronal artificial"*):
1. **Definir la red neuronal y su importancia en IA:** Fichas conceptuales, neurona artificial con suma ponderada interactiva $z = \sum (w_i \cdot x_i) + b$, pesos, sesgos y funciones de activación (ReLU, Sigmoide, Softmax, Tanh).
2. **Describir su estructura:** Neuronas, capas ocultas, conexiones y funciones de activación.
3. **Identificar tipos de redes:** Catálogo comparativo y constructor para **Feedforward (MLP)**, **Convolucionales (CNN)**, **Recurrentes (RNN/LSTM)** y **Generativas Adversarias (GAN)**.
4. **Crear una red neuronal con TensorFlow y Keras:** Asistente de compilación, ejecución con máquina de estados finitos (`QUEUED` → `PREPARING` → `RUNNING` → `COMPLETED` / `CANCELLED`), telemetría en tiempo real y preservación del Test Set (15%) para evaluación imparcial.

---

## 🚀 Inicio Rápido (Ejecución Inmediata)

El sistema está configurado en **Modo Simulado / Autónomo** para garantizar una ejecución inmediata sin dependencias complejas ni configuraciones externas.

### Opción 1: Abrir Directamente en el Navegador (0 segundos de espera)
Basta con abrir el archivo de la interfaz web en cualquier navegador moderno (Google Chrome, Microsoft Edge, Firefox):
```bash
# Ubicación del archivo:
neurolab-enterprise/apps/web/index.html
```
*Haz doble clic sobre `index.html` o arrástralo a tu navegador favorito.*

### Opción 2: Ejecutar el Servidor Python Completo (API REST + Frontend)
Si deseas ejecutar la API backend con base de datos SQLite/PostgreSQL y servidor web unificado:
```bash
cd neurolab-enterprise
python services/api/run_server.py
```
Accede desde tu navegador a:
- 🌐 **Plataforma Web:** `http://127.0.0.1:8000`
- 📡 **Endpoint de Salud e Infraestructura:** `http://127.0.0.1:8000/api/v1/health`
- 📊 **Listado de Proyectos:** `http://127.0.0.1:8000/api/v1/projects`

---

## 🧭 Secuencia Operativa Paso a Paso (Guía para Demostración)

La barra superior de la aplicación cuenta con un asistente interactivo que guía la demostración técnica en 6 pasos cronológicos:

| Orden | Módulo Responsable | Acción Principal del Usuario | Insumo Generado |
|:---:|:---|:---|:---|
| **1°** | **M02. Proyectos de IA** | Seleccionar o crear proyecto con descripción del problema. | Workspace activo e ID de proyecto. |
| **2°** | **M05. Datasets (EDA)** | Ingesta de CSV, análisis exploratorio y partición 70/15/15. | `input_shape` rígido y Test Set aislado. |
| **3°** | **M04. Arquitectura** | Diseñar capas, unidades y funciones de activación. | Grafo y JSON de arquitectura validada. |
| **4°** | **M06. Entrenamientos** | Configurar hiperparámetros (épocas, batch, Adam) e iniciar. | Ajuste de pesos y telemetría de época. |
| **5°** | **M07. Métricas** | Visualizar curvas Loss/Accuracy y evaluar sobre Test Set. | Matriz de confusión e inferencia en vivo. |
| **6°** | **M08 / M09. Registro & PDF** | Aprobar versión inmutable y exportar ficha técnica en PDF. | Artefacto SHA-256 e informe formal. |

---

## 🏛️ Desglose de los 10 Módulos Funcionales

- **M01. Inicio / Dashboard:** Tarjetas de resumen de proyectos, entrenamientos activos, tasa media de acierto, monitoreo de infraestructura (CPU, memoria, cuotas de workers).
- **M02. Gestión de Proyectos de IA:** Listado, búsqueda, creación de contenedores y asignación de roles RBAC (Administrador, Responsable, Ingeniero IA, Revisor, Lector).
- **M03. Fundamentos Neuronales (Semana 11):** Fichas didácticas, simulador interactivo de neurona artificial con controles deslizantes para entradas, pesos y sesgo, visualizador SVG, fórmulas matemáticas y glosario.
- **M04. Diseñador de Arquitecturas:** Selector de familias (Feedforward, CNN, RNN, GAN), editor dinámico de capas, cálculo automático de parámetros, vista previa del grafo SVG y exportación a código Python/Keras.
- **M05. Datasets (Componente Primario y Fundamental):** Biblioteca de datasets (Cardiopatía ECG, Iris, Housing, Churn), cargador de archivos CSV propios, análisis exploratorio de datos (EDA) automático y partición en Train (70%), Val (15%) y Test (15%).
- **M06. Entrenamientos:** Consola de ejecución, máquina de estados (`QUEUED` → `PREPARING` → `RUNNING` → `COMPLETED` / `CANCELLED`), ajuste de hiperparámetros y cancelación cooperativa con registro de logs.
- **M07. Evaluación y Métricas:** Curvas interactivas de Loss y Accuracy época a época, evaluación imparcial sobre el Test Set retenido, matriz de confusión con TP/TN/FP/FN y módulo de inferencia en tiempo real para predecir casos nuevos.
- **M08. Registro de Modelos (Model Registry):** Catálogo centralizado de versiones inmutables (`v1.0.0`), ciclo de vida de producción (`Borrador` → `En Revisión` → `Aprobado` → `Retirado`), checksum SHA-256 y descarga de artefactos.
- **M09. Reportes y Documentación:** Motor de generación de fichas técnicas formales, exportación profesional a PDF apta para comités o sustentaciones y descarga de métricas en CSV.
- **M10. Administración, Seguridad y Auditoría:** Matriz de control de acceso basada en roles (RBAC), registro de auditoría (*Audit Trail*) inmutable en tiempo real y monitoreo de cuotas de recursos.

---

## 📂 Estructura del Repositorio

```
neurolab-enterprise/
├── apps/
│   └── web/                     # Interfaz de usuario (React / Standalone)
│       ├── index.html           # Aplicación completa autónoma y simulada
│       ├── package.json         # Especificación de paquetes TypeScript/Vite
│       └── src/
│           ├── types/           # Interfaces TypeScript según Sección 8
│           └── features/        # Módulos organizados por dominio (M01-M10)
├── services/
│   └── api/                     # Backend API (Python / Flask / FastAPI)
│       ├── app/
│       │   ├── core/            # Configuración, base de datos y seguridad
│       │   ├── models/          # Entidades SQLAlchemy (9 tablas)
│       │   ├── schemas/         # Esquemas Pydantic de validación
│       │   ├── repositories/    # Reglas de negocio y auditoría
│       │   └── flask_app.py     # Endpoints REST y canal SSE
│       ├── tests/               # Suite automatizada de pruebas unitarias
│       └── run_server.py        # Lanzador del servidor API y estáticos
├── workers/
│   └── training/                # Worker asíncrono con cancelación cooperativa
│       └── worker.py
├── infra/
│   ├── docker/                  # Dockerfiles y docker-compose.yml
│   ├── migrations/              # DDL SQL de PostgreSQL para las 9 tablas
│   └── monitoring/              # Configuración Prometheus
├── docs/
│   ├── architecture/            # Documento de arquitectura y diagramas
│   ├── api/                     # Especificación detallada de endpoints
│   └── operations/              # Guía paso a paso para presentación
└── README.md
```

---

## 🧪 Pruebas Automatizadas

Para validar las reglas de negocio, endpoints y persistencia de auditoría:
```bash
python -m unittest neurolab-enterprise/services/api/tests/test_api.py
```
*Resultado: 5 pruebas ejecutadas exitosamente en 0.05s.*
