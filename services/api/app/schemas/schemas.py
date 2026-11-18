"""
NeuroLab Enterprise - Pydantic Schemas
"""
from typing import Optional, List, Dict, Any
from datetime import datetime
from pydantic import BaseModel, Field

# User Schemas
class UserBase(BaseModel):
    email: str
    display_name: str
    role: str = "Ingeniero de IA"
    status: str = "active"

class UserCreate(UserBase):
    pass

class UserResponse(UserBase):
    id: str
    created_at: datetime
    class Config:
        from_attributes = True

# Project Schemas
class ProjectBase(BaseModel):
    name: str
    description: Optional[str] = None
    tags: List[str] = Field(default_factory=list)

class ProjectCreate(ProjectBase):
    owner_id: Optional[str] = None

class ProjectResponse(ProjectBase):
    id: str
    owner_id: str
    status: str
    created_at: datetime
    class Config:
        from_attributes = True

# Architecture Schemas
class LayerConfig(BaseModel):
    id: str
    type: str # Dense, Conv2D, etc.
    units: Optional[int] = None
    filters: Optional[int] = None
    kernel_size: Optional[List[int]] = None
    activation: Optional[str] = "relu"
    rate: Optional[float] = None
    param_count: Optional[int] = 0

class ArchitectureConfig(BaseModel):
    family: str
    layers: List[LayerConfig]
    input_shape: List[int]
    output_shape: List[int]
    output_activation: str
    total_params: int
    trainable_params: int
    loss_function: str

class ArchitectureCreate(BaseModel):
    name: str
    family: str
    config_json: Dict[str, Any]
    version: Optional[str] = "v1.0.0"

class ArchitectureResponse(BaseModel):
    id: str
    project_id: str
    name: str
    family: str
    config_json: Dict[str, Any]
    version: str
    created_at: datetime
    class Config:
        from_attributes = True

# Dataset Schemas
class DatasetCreate(BaseModel):
    name: str
    input_shape: int
    target_column: str
    total_rows: int
    metadata_json: Dict[str, Any]

class DatasetResponse(BaseModel):
    id: str
    project_id: str
    name: str
    version: str
    input_shape: int
    target_column: str
    total_rows: int
    metadata_json: Dict[str, Any]
    created_at: datetime
    class Config:
        from_attributes = True

# Training Job Schemas
class TrainingJobCreate(BaseModel):
    architecture_id: str
    dataset_id: str
    hyperparameters: Dict[str, Any] = Field(default_factory=lambda: {
        "epochs": 30,
        "batch_size": 16,
        "optimizer": "Adam",
        "learning_rate": 0.01,
        "loss_function": "categorical_crossentropy",
        "validation_split": 0.15,
        "seed": 42
    })

class MetricPoint(BaseModel):
    epoch: int
    loss: float
    val_loss: float
    accuracy: Optional[float] = None
    val_accuracy: Optional[float] = None

class TrainingJobResponse(BaseModel):
    id: str
    project_id: str
    architecture_id: str
    dataset_id: str
    status: str
    progress: float
    current_epoch: int
    total_epochs: int
    hyperparameters: Dict[str, Any]
    started_at: Optional[datetime] = None
    ended_at: Optional[datetime] = None
    created_at: datetime
    error_message: Optional[str] = None
    class Config:
        from_attributes = True

# Model Version Schemas
class ModelVersionCreate(BaseModel):
    name: str
    version: str
    status: str = "Borrador"
    checksum: str
    accuracy: float
    loss: float

class ModelVersionResponse(BaseModel):
    id: str
    project_id: str
    job_id: str
    name: str
    version: str
    storage_key: str
    status: str
    checksum: str
    accuracy: float
    loss: float
    created_at: datetime
    class Config:
        from_attributes = True

# Audit Event Schemas
class AuditEventResponse(BaseModel):
    id: str
    actor_id: str
    project_id: Optional[str] = None
    action: str
    metadata_json: Dict[str, Any]
    created_at: datetime
    class Config:
        from_attributes = True
