"""
NeuroLab Enterprise - Repository & Business Logic
"""
import hashlib
import json
import uuid
from datetime import datetime, timezone
from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session
from ..models.entities import (
    User, Project, ProjectMember, Dataset, Architecture, 
    TrainingJob, TrainingMetric, ModelVersion, AuditEvent
)

def record_audit(
    db: Session, 
    actor_id: str, 
    action: str, 
    project_id: Optional[str] = None, 
    metadata_json: Optional[Dict[str, Any]] = None
) -> AuditEvent:
    audit = AuditEvent(
        id=str(uuid.uuid4()),
        actor_id=actor_id,
        project_id=project_id,
        action=action,
        metadata_json=metadata_json or {},
        created_at=datetime.now(timezone.utc)
    )
    db.add(audit)
    db.commit()
    db.refresh(audit)
    return audit

def get_or_create_default_user(db: Session) -> User:
    user = db.query(User).filter(User.email == "lead.engineer@neurolab.enterprise").first()
    if not user:
        user = User(
            id=str(uuid.uuid4()),
            email="lead.engineer@neurolab.enterprise",
            display_name="Dr. Alex Vance",
            role="Administrador",
            status="active"
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        
        # Add seed demo users
        reviewer = User(
            id=str(uuid.uuid4()),
            email="reviewer.ml@neurolab.enterprise",
            display_name="Dra. Elena Ramos",
            role="Revisor",
            status="active"
        )
        engineer = User(
            id=str(uuid.uuid4()),
            email="ai.developer@neurolab.enterprise",
            display_name="Ing. Carlos Mendez",
            role="Ingeniero de IA",
            status="active"
        )
        db.add_all([reviewer, engineer])
        db.commit()
    return user

def list_projects(db: Session, user_id: str) -> List[Project]:
    return db.query(Project).all()

def create_project(db: Session, name: str, description: str, owner_id: str, tags: List[str]) -> Project:
    project = Project(
        id=str(uuid.uuid4()),
        name=name,
        description=description,
        owner_id=owner_id,
        tags=tags,
        status="active"
    )
    db.add(project)
    
    # Assign owner as project member with role 'Administrador'
    member = ProjectMember(
        id=str(uuid.uuid4()),
        project_id=project.id,
        user_id=owner_id,
        role="Administrador"
    )
    db.add(member)
    db.commit()
    db.refresh(project)
    
    record_audit(db, actor_id=owner_id, action="PROJECT_CREATED", project_id=project.id, metadata_json={"name": name})
    return project

def get_project_by_id(db: Session, project_id: str) -> Optional[Project]:
    return db.query(Project).filter(Project.id == project_id).first()

def create_dataset(db: Session, project_id: str, name: str, input_shape: int, target_column: str, total_rows: int, metadata: Dict[str, Any], actor_id: str) -> Dataset:
    dataset = Dataset(
        id=str(uuid.uuid4()),
        project_id=project_id,
        name=name,
        version="v1.0.0",
        storage_key=f"datasets/{project_id}/{name.lower().replace(' ', '_')}.csv",
        input_shape=input_shape,
        target_column=target_column,
        total_rows=total_rows,
        metadata_json=metadata
    )
    db.add(dataset)
    db.commit()
    db.refresh(dataset)
    
    record_audit(
        db, 
        actor_id=actor_id, 
        action="DATASET_UPLOADED", 
        project_id=project_id, 
        metadata_json={"dataset_id": dataset.id, "name": name, "rows": total_rows, "input_shape": input_shape}
    )
    return dataset

def create_architecture(db: Session, project_id: str, name: str, family: str, config_json: Dict[str, Any], version: str, actor_id: str) -> Architecture:
    # Validate architecture structure
    if not config_json.get("layers"):
        raise ValueError("La arquitectura debe tener al menos una capa definida.")
    
    arch = Architecture(
        id=str(uuid.uuid4()),
        project_id=project_id,
        name=name,
        family=family,
        config_json=config_json,
        version=version or "v1.0.0"
    )
    db.add(arch)
    db.commit()
    db.refresh(arch)
    
    record_audit(
        db, 
        actor_id=actor_id, 
        action="ARCHITECTURE_SAVED", 
        project_id=project_id, 
        metadata_json={"architecture_id": arch.id, "name": name, "family": family, "total_params": config_json.get("total_params", 0)}
    )
    return arch

def create_training_job(
    db: Session, 
    project_id: str, 
    architecture_id: str, 
    dataset_id: str, 
    hyperparameters: Dict[str, Any],
    actor_id: str
) -> TrainingJob:
    # Validation per Section 10: "No iniciar un entrenamiento sin proyecto, arquitectura y dataset válidos"
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise ValueError("Proyecto no encontrado.")
    architecture = db.query(Architecture).filter(Architecture.id == architecture_id).first()
    if not architecture:
        raise ValueError("Arquitectura no encontrada.")
    dataset = db.query(Dataset).filter(Dataset.id == dataset_id).first()
    if not dataset:
        raise ValueError("Dataset no encontrado.")
    
    epochs = int(hyperparameters.get("epochs", 30))
    job = TrainingJob(
        id=str(uuid.uuid4()),
        project_id=project_id,
        architecture_id=architecture_id,
        dataset_id=dataset_id,
        status="QUEUED",
        progress=0.0,
        current_epoch=0,
        total_epochs=epochs,
        hyperparameters=hyperparameters,
        created_at=datetime.now(timezone.utc)
    )
    db.add(job)
    db.commit()
    db.refresh(job)
    
    record_audit(
        db, 
        actor_id=actor_id, 
        action="TRAINING_JOB_QUEUED", 
        project_id=project_id, 
        metadata_json={"job_id": job.id, "epochs": epochs, "optimizer": hyperparameters.get("optimizer", "Adam")}
    )
    return job

def cancel_training_job(db: Session, job_id: str, actor_id: str, reason: str = "Solicitado por el usuario") -> TrainingJob:
    job = db.query(TrainingJob).filter(TrainingJob.id == job_id).first()
    if not job:
        raise ValueError("Trabajo de entrenamiento no encontrado.")
    
    if job.status in ["COMPLETED", "FAILED", "CANCELLED"]:
        raise ValueError(f"No se puede cancelar un trabajo con estado final '{job.status}'.")
    
    job.status = "CANCELLED"
    job.ended_at = datetime.now(timezone.utc)
    job.error_message = f"Cancelado: {reason}"
    db.commit()
    db.refresh(job)
    
    record_audit(
        db, 
        actor_id=actor_id, 
        action="TRAINING_JOB_CANCELLED", 
        project_id=job.project_id, 
        metadata_json={"job_id": job.id, "reason": reason}
    )
    return job

def approve_model(db: Session, model_id: str, actor_id: str, status: str = "Aprobado") -> ModelVersion:
    model = db.query(ModelVersion).filter(ModelVersion.id == model_id).first()
    if not model:
        raise ValueError("Modelo no encontrado.")
    
    model.status = status
    db.commit()
    db.refresh(model)
    
    record_audit(
        db, 
        actor_id=actor_id, 
        action="MODEL_STATUS_CHANGED", 
        project_id=model.project_id, 
        metadata_json={"model_id": model.id, "new_status": status, "version": model.version}
    )
    return model
