# Guía de Presentación Operativa Paso a Paso
**NeuroLab Enterprise | Protocolo de Evaluación Técnica y Demostración**

Para realizar una presentación 100% funcional y fluida ante evaluadores o jurados técnicos, sigue la **secuencia cronológica estricta** definida en el Documento Maestro:

---

## Secuencia Operativa para Demostración

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   PASO 1     │ ──> │   PASO 2     │ ──> │   PASO 3     │
│ M02 Proyectos│     │ M05 Datasets │     │ M04 Diseñador│
└──────────────┘     └──────────────┘     └──────────────┘
                                                 │
                                                 ▼
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   PASO 6     │ <── │   PASO 5     │ <── │   PASO 4     │
│ M08/M09 Docs │     │ M07 Métricas │     │ M06 Entrenar │
└──────────────┘     └──────────────┘     └──────────────┘
```

---

### PASO 1: M02 — Módulo de Proyectos (Creación del Workspace)
1. Inicia sesión en la plataforma (o verifica en la cabecera que el usuario activo sea `Dr. Alex Vance` con rol `Administrador`).
2. En la barra superior, haz clic en el botón de la secuencia **"1° M02 Proyectos"**.
3. Selecciona el proyecto **"Detección de Arritmias Cardíacas (MLP)"** o presiona **"+ Crear Nuevo Proyecto"** para definir un nuevo contenedor con problema y etiquetas.
4. *Insumo generado:* **ID de Proyecto y Workspace activo**.

---

### PASO 2: M05 — Módulo de Datasets (Ingesta y Análisis Primario)
> *¡Componente Primario y Fundamental! Los modelos de Deep Learning son tan buenos como los datos sobre los que se entrenan.*
1. En la barra de secuencia, haz clic en **"2° M05 Dataset (EDA)"**.
2. Observa el dataset activo `Arrhythmia_ECG_Cleaned.csv` o carga tu propio archivo CSV con el botón **"📁 Cargar CSV Propio"**.
3. Revisa el **Análisis Exploratorio (EDA) automático**:
   - Detección de `input_shape = 8` características independientes.
   - Detección de variable objetivo `has_arrhythmia`.
   - Resumen estadístico de cada columna (mínimo, máximo, media, desviación estándar y nulos imputados).
   - Partición automática obligatoria: **Train 70% (525)**, **Validation 15% (112)** y **Test 15% (113)**.
4. *Insumo generado:* **Metadatos, dimensiones rígidas (`input_shape`) y Test Set aislado**.

---

### PASO 3: M04 — Diseñador de Arquitecturas (Construcción de la Red)
1. En la barra de secuencia, haz clic en **"3° M04 Arquitectura"**.
2. Observa cómo la capa de entrada se adaptó rígidamente a las 8 características del dataset (`input_shape=[8]`).
3. Muestra el selector de familia: **Feedforward (MLP)** para datos tabulares.
4. Inspecciona y añade capas (`Dense`, `Dropout`) mediante el botón **"+ Añadir Capa"**.
5. Muestra la previsualización interactiva del grafo topológico en el panel derecho y el código equivalente en **TensorFlow / Keras** generado automáticamente.
6. Presiona **"Guardar Arquitectura"**.
7. *Insumo generado:* **Grafo y JSON de arquitectura validada con 289 parámetros**.

---

### PASO 4: M06 — Módulo de Entrenamientos (Ejecución del Aprendizaje)
1. En la barra de secuencia, haz clic en **"4° M06 Entrenamiento"**.
2. Verifica la vinculación de insumos: **Dataset (Paso 2) + Arquitectura (Paso 3)**.
3. Configura los hiperparámetros:
   - Épocas: `25`
   - Batch size: `16`
   - Optimizador: `Adam`
   - Learning rate: `0.005`
4. Presiona el botón verde **"▶ Iniciar Entrenamiento"**.
5. Observa la máquina de estados: `PREPARING` → `RUNNING`.
6. Destaca la telemetría en tiempo real: contador de épocas, barra de progreso porcentual, reducción de Loss y aumento de Accuracy sin recargar la pantalla.
7. *Insumo generado:* **Pesos ajustados y convergencia del modelo**.

---

### PASO 5: M07 — Evaluación y Métricas (Visualización en Tiempo Real)
1. En la barra de secuencia, haz clic en **"5° M07 Métricas"**.
2. Analiza las **Curvas de Aprendizaje**:
   - Curva roja (`Train Loss`) descendiendo suavemente.
   - Curva amarilla (`Val Loss`) convergiendo sin indicios de sobreajuste (*overfitting*).
   - Curvas de precisión (`Train Acc` y `Val Acc`) superando el 95%.
3. Muestra la **Evaluación Imparcial** ejecutada sobre las 113 muestras retenidas del **Test Set**:
   - `Test Accuracy: 95.6%`
   - `Precision: 96.2%`
   - `Recall: 94.8%`
4. Explica la **Matriz de Confusión**:
   - 58 Verdaderos Negativos (Sanos identificados correctamente).
   - 50 Verdaderos Positivos (Arritmias detectadas).
   - Solo 2 Falsos Positivos y 3 Falsos Negativos.
5. Realiza una prueba en el **Módulo de Inferencia en Tiempo Real**: mueve los controles deslizantes del paciente (elevación ST o ritmo cardíaco) para ver cómo la red predice en vivo la condición cardíaca con su barra de confianza porcentual.
6. *Insumo generado:* **Validación científica imparcial y diagnóstico interactivo**.

---

### PASO 6: M08 / M09 — Registro de Modelos y Reportes (Versionado y Exportación)
1. En la barra de secuencia, haz clic en **"6° M08/M09 Registro & PDF"**.
2. En el **Model Registry (M08)**:
   - Presiona **"+ Registrar Versión de Modelo"** para crear una versión inmutable (`v1.0.0`) con su checksum criptográfico SHA-256.
   - Demuestra el cambio de estado de ciclo de vida (`Borrador` → `En Revisión` → `Aprobado` para producción).
   - Descarga el archivo de artefactos con el botón **"💾 Descargar"**.
3. Navega al módulo **M09. Reportes & PDF**:
   - Muestra la ficha técnica formal con la identificación del proyecto, especificación del dataset, topología de capas y métricas alcanzadas.
   - Presiona **"📄 Exportar Informe Formal en PDF"** para abrir el asistente de impresión/guardado en PDF.
   - Presiona **"📥 Exportar Historial en CSV"** para descargar la telemetría tabular.
4. *Insumo generado:* **Artefacto versionado, trazabilidad inmutable y reporte formal en PDF**.
