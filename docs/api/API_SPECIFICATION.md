# NeuroLab Enterprise — Especificación de API REST
**Versión 1.0 • Contratos y Endpoints (/api/v1)**

---

## 1. Endpoints de Proyectos

### `GET /api/v1/projects`
- **Descripción:** Lista todos los proyectos a los que el usuario tiene acceso.
- **Respuesta 200 OK:**
```json
[
  {
    "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
    "name": "Detección de Arritmias Cardíacas (MLP)",
    "description": "Clasificación binaria mediante red Feedforward.",
    "owner_id": "usr_01",
    "owner_name": "Dr. Alex Vance",
    "status": "active",
    "tags": ["Salud", "Feedforward", "Semana 11"],
    "created_at": "2026-11-17T09:00:00Z"
  }
]
```

### `POST /api/v1/projects`
- **Descripción:** Crea un nuevo contenedor de proyecto.
- **Cuerpo de Solicitud:**
```json
{
  "name": "Detección de Fraude Bancario",
  "description": "Modelo MLP para clasificación binaria de transacciones.",
  "tags": ["Finanzas", "MLP"]
}
```
- **Respuesta 201 Created.**

---

## 2. Endpoints de Datasets & Arquitecturas

### `POST /api/v1/projects/{id}/datasets`
- **Descripción:** Registra metadatos de un dataset preprocesado con `input_shape` y partición automática 70/15/15.
- **Cuerpo:**
```json
{
  "name": "Arrhythmia_ECG_Cleaned.csv",
  "input_shape": 8,
  "target_column": "has_arrhythmia",
  "total_rows": 750,
  "metadata_json": {
    "splits": { "train": 525, "val": 112, "test": 113 }
  }
}
```

### `POST /api/v1/projects/{id}/architectures`
- **Descripción:** Valida y persiste la topología de la red neuronal.
- **Cuerpo:**
```json
{
  "name": "MLP-Enterprise-V1",
  "family": "Feedforward",
  "config_json": {
    "layers": [
      { "id": "l1", "type": "Dense", "units": 16, "activation": "relu" },
      { "id": "l2", "type": "Dropout", "rate": 0.2 },
      { "id": "l3", "type": "Dense", "units": 1, "activation": "sigmoid" }
    ],
    "input_shape": [8],
    "output_shape": [1],
    "total_params": 289
  }
}
```

---

## 3. Endpoints de Entrenamiento & Telemetría

### `POST /api/v1/projects/{id}/training-jobs`
- **Descripción:** Valida la compatibilidad del dataset y arquitectura, y encola la ejecución del entrenamiento.
- **Cuerpo:**
```json
{
  "architecture_id": "arch_01",
  "dataset_id": "ds_01",
  "hyperparameters": {
    "epochs": 25,
    "batch_size": 16,
    "optimizer": "Adam",
    "learning_rate": 0.005,
    "loss_function": "binary_crossentropy"
  }
}
```
- **Respuesta 201:** `{"job_id": "job_123", "status": "QUEUED"}`

### `GET /api/v1/training-jobs/{id}`
- **Descripción:** Consulta el estado persistido y métricas de un trabajo de entrenamiento.

### `POST /api/v1/training-jobs/{id}/cancel`
- **Descripción:** Envía una solicitud de cancelación cooperativa al worker de entrenamiento.

### `GET /api/v1/training-jobs/{id}/events`
- **Descripción:** Canal de streaming SSE (*Server-Sent Events*) para observar el progreso y métricas época por época en tiempo real sin recargar la página.

---

## 4. Model Registry & Auditoría

### `GET /api/v1/projects/{id}/models`
- **Descripción:** Lista los modelos registrados con su versión inmutable, checksum SHA-256 y estado en el ciclo de vida.

### `POST /api/v1/models/{id}/status`
- **Descripción:** Actualiza el estado del modelo (`Borrador` → `En Revisión` → `Aprobado` → `Retirado`). Requiere rol `Revisor` o `Administrador`.

### `GET /api/v1/projects/{id}/audit-events`
- **Descripción:** Consulta el historial inmutable de auditoría para trazabilidad de gobierno.
