/**
 * NeuroLab Enterprise - TypeScript Domain Types
 * Based on Section 8 of "Documento Maestro de Desarrollo"
 */

export type UserRole =
  | "Administrador"
  | "Responsable de proyecto"
  | "Ingeniero de IA"
  | "Revisor"
  | "Lector";

export interface User {
  id: string;
  email: string;
  display_name: string;
  status: "active" | "inactive";
  role: UserRole;
  avatar?: string;
}

export type ProjectStatus = "draft" | "active" | "archived" | "completed";

export interface Project {
  id: string;
  name: string;
  description: string;
  owner_id: string;
  owner_name?: string;
  status: ProjectStatus;
  problem_type:
    | "Clasificación Binaria"
    | "Clasificación Multiclase"
    | "Regresión"
    | "Series Temporales"
    | "Visión por Computadora";
  tags: string[];
  created_at: string;
  updated_at?: string;
}

export interface ProjectMember {
  project_id: string;
  user_id: string;
  user_name: string;
  user_email: string;
  role: UserRole;
  added_at: string;
}

export interface DatasetColumnSummary {
  name: string;
  type: "numeric" | "categorical" | "target";
  min?: number;
  max?: number;
  mean?: number;
  null_count: number;
  unique_values?: number;
}

export interface DatasetSplit {
  train_rows: number;
  val_rows: number;
  test_rows: number;
  train_ratio: number; // 0.70
  val_ratio: number; // 0.15
  test_ratio: number; // 0.15
}

export interface Dataset {
  id: string;
  project_id: string;
  name: string;
  version: string;
  storage_key: string;
  total_rows: number;
  total_columns: number;
  input_shape: number; // Features count
  target_column: string;
  target_classes?: string[];
  columns: DatasetColumnSummary[];
  splits: DatasetSplit;
  metadata_json: Record<string, any>;
  data_preview: Record<string, any>[];
  created_at: string;
}

export type NetworkFamily = "Feedforward" | "CNN" | "RNN" | "GAN";

export interface NetworkLayer {
  id: string;
  type:
    | "Dense"
    | "Conv2D"
    | "MaxPooling2D"
    | "Flatten"
    | "SimpleRNN"
    | "LSTM"
    | "Dropout"
    | "BatchNormalization";
  units?: number;
  filters?: number;
  kernel_size?: [number, number];
  activation?: "relu" | "sigmoid" | "tanh" | "softmax" | "linear";
  rate?: number; // For Dropout
  input_shape?: number[];
  param_count?: number;
}

export interface ArchitectureConfig {
  family: NetworkFamily;
  layers: NetworkLayer[];
  input_shape: number[];
  output_shape: number[];
  output_activation: string;
  total_params: number;
  trainable_params: number;
  loss_function: string;
  description?: string;
}

export interface Architecture {
  id: string;
  project_id: string;
  name: string;
  family: NetworkFamily;
  config_json: ArchitectureConfig;
  version: string;
  created_at: string;
}

export type TrainingJobStatus =
  "QUEUED" | "PREPARING" | "RUNNING" | "COMPLETED" | "FAILED" | "CANCELLED";

export interface TrainingHyperparameters {
  epochs: number;
  batch_size: number;
  optimizer: "Adam" | "SGD" | "RMSprop" | "AdaGrad";
  learning_rate: number;
  loss_function: string;
  validation_split: number;
  seed?: number;
}

export interface EpochMetric {
  epoch: number;
  loss: number;
  val_loss: number;
  accuracy?: number;
  val_accuracy?: number;
  mae?: number;
  val_mae?: number;
  learning_rate?: number;
  duration_ms?: number;
}

export interface EvaluationResults {
  test_loss: number;
  test_accuracy?: number;
  test_mae?: number;
  precision?: number;
  recall?: number;
  f1_score?: number;
  confusion_matrix?: {
    labels: string[];
    matrix: number[][];
  };
  sample_predictions?: {
    features: number[];
    actual: string | number;
    predicted: string | number;
    confidence: number;
  }[];
}

export interface TrainingJob {
  id: string;
  project_id: string;
  architecture_id: string;
  architecture_name?: string;
  dataset_id: string;
  dataset_name?: string;
  status: TrainingJobStatus;
  progress: number; // 0 - 100
  current_epoch: number;
  total_epochs: number;
  hyperparameters: TrainingHyperparameters;
  metrics: EpochMetric[];
  evaluation?: EvaluationResults;
  logs: string[];
  started_at?: string;
  ended_at?: string;
  cancellation_requested?: boolean;
  error_message?: string;
}

export type ModelLifecycleStatus =
  "Borrador" | "En Revisión" | "Aprobado" | "Retirado";

export interface ModelVersion {
  id: string;
  project_id: string;
  job_id: string;
  name: string;
  version: string; // e.g. "v1.0.0"
  storage_key: string;
  status: ModelLifecycleStatus;
  checksum: string;
  architecture_family: NetworkFamily;
  accuracy: number;
  loss: number;
  created_at: string;
  approved_by?: string;
  approved_at?: string;
  notes?: string;
}

export interface AuditEvent {
  id: string;
  actor_id: string;
  actor_name: string;
  project_id?: string;
  action: string;
  metadata_json: Record<string, any>;
  created_at: string;
}

export interface SystemHealth {
  cpu_percent: number;
  memory_used_mb: number;
  memory_limit_mb: number;
  active_workers: number;
  max_workers: number;
  queue_length: number;
  active_engine: "TensorFlow.js (Client WebGL)" | "Python FastAPI Worker";
  storage_used_mb: number;
}
