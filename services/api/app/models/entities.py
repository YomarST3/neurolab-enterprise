"""
NeuroLab Enterprise - SQLAlchemy Database Entities
Based on Section 8 of Documento Maestro de Desarrollo
"""
import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Integer, Float, DateTime, ForeignKey, Text, JSON
from sqlalchemy.orm import relationship
from ..core.database import Base

def generate_uuid():
    return str(uuid.uuid4())

def utc_now():
    return datetime.now(timezone.utc)

class User(Base):
    __tablename__ = "users"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    email = Column(String(255), unique=True, nullable=False)
    display_name = Column(String(255), nullable=False)
    status = Column(String(50), default="active")
    role = Column(String(50), default="Ingeniero de IA")
    created_at = Column(DateTime, default=utc_now)
    
    projects = relationship("Project", back_populates="owner")
    memberships = relationship("ProjectMember", back_populates="user")
    audit_events = relationship("AuditEvent", back_populates="actor")

class Project(Base):
    __tablename__ = "projects"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    owner_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    status = Column(String(50), default="active")
    tags = Column(JSON, default=list)
    created_at = Column(DateTime, default=utc_now)
    
    owner = relationship("User", back_populates="projects")
    members = relationship("ProjectMember", back_populates="project", cascade="all, delete-orphan")
    datasets = relationship("Dataset", back_populates="project", cascade="all, delete-orphan")
    architectures = relationship("Architecture", back_populates="project", cascade="all, delete-orphan")
    training_jobs = relationship("TrainingJob", back_populates="project", cascade="all, delete-orphan")
    models = relationship("ModelVersion", back_populates="project", cascade="all, delete-orphan")
    audit_events = relationship("AuditEvent", back_populates="project", cascade="all, delete-orphan")

class ProjectMember(Base):
    __tablename__ = "project_members"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    project_id = Column(String(36), ForeignKey("projects.id"), nullable=False)
    user_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    role = Column(String(50), default="Ingeniero de IA")
    added_at = Column(DateTime, default=utc_now)
    
    project = relationship("Project", back_populates="members")
    user = relationship("User", back_populates="memberships")

class Dataset(Base):
    __tablename__ = "datasets"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    project_id = Column(String(36), ForeignKey("projects.id"), nullable=False)
    name = Column(String(255), nullable=False)
    version = Column(String(50), default="v1.0.0")
    storage_key = Column(String(512), nullable=False)
    input_shape = Column(Integer, default=4)
    target_column = Column(String(100), default="target")
    total_rows = Column(Integer, default=0)
    metadata_json = Column(JSON, default=dict)
    created_at = Column(DateTime, default=utc_now)
    
    project = relationship("Project", back_populates="datasets")
    jobs = relationship("TrainingJob", back_populates="dataset")

class Architecture(Base):
    __tablename__ = "architectures"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    project_id = Column(String(36), ForeignKey("projects.id"), nullable=False)
    name = Column(String(255), nullable=False)
    family = Column(String(50), nullable=False) # Feedforward, CNN, RNN, GAN
    config_json = Column(JSON, nullable=False)
    version = Column(String(50), default="v1.0.0")
    created_at = Column(DateTime, default=utc_now)
    
    project = relationship("Project", back_populates="architectures")
    jobs = relationship("TrainingJob", back_populates="architecture")

class TrainingJob(Base):
    __tablename__ = "training_jobs"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    project_id = Column(String(36), ForeignKey("projects.id"), nullable=False)
    architecture_id = Column(String(36), ForeignKey("architectures.id"), nullable=False)
    dataset_id = Column(String(36), ForeignKey("datasets.id"), nullable=False)
    status = Column(String(50), default="QUEUED") # QUEUED -> PREPARING -> RUNNING -> COMPLETED / FAILED / CANCELLED
    progress = Column(Float, default=0.0)
    total_epochs = Column(Integer, default=30)
    current_epoch = Column(Integer, default=0)
    hyperparameters = Column(JSON, default=dict)
    error_message = Column(Text, nullable=True)
    started_at = Column(DateTime, nullable=True)
    ended_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=utc_now)
    
    project = relationship("Project", back_populates="training_jobs")
    architecture = relationship("Architecture", back_populates="jobs")
    dataset = relationship("Dataset", back_populates="jobs")
    metrics = relationship("TrainingMetric", back_populates="job", cascade="all, delete-orphan")
    models = relationship("ModelVersion", back_populates="job")

class TrainingMetric(Base):
    __tablename__ = "training_metrics"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    job_id = Column(String(36), ForeignKey("training_jobs.id"), nullable=False)
    epoch = Column(Integer, nullable=False)
    metric_name = Column(String(100), nullable=False)
    metric_value = Column(Float, nullable=False)
    recorded_at = Column(DateTime, default=utc_now)
    
    job = relationship("TrainingJob", back_populates="metrics")

class ModelVersion(Base):
    __tablename__ = "model_versions"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    project_id = Column(String(36), ForeignKey("projects.id"), nullable=False)
    job_id = Column(String(36), ForeignKey("training_jobs.id"), nullable=False)
    name = Column(String(255), nullable=False)
    version = Column(String(50), default="v1.0.0")
    storage_key = Column(String(512), nullable=False)
    status = Column(String(50), default="Borrador") # Borrador, En Revisión, Aprobado, Retirado
    checksum = Column(String(128), nullable=False)
    accuracy = Column(Float, default=0.0)
    loss = Column(Float, default=0.0)
    created_at = Column(DateTime, default=utc_now)
    
    project = relationship("Project", back_populates="models")
    job = relationship("TrainingJob", back_populates="models")

class AuditEvent(Base):
    __tablename__ = "audit_events"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    actor_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    project_id = Column(String(36), ForeignKey("projects.id"), nullable=True)
    action = Column(String(100), nullable=False)
    metadata_json = Column(JSON, default=dict)
    created_at = Column(DateTime, default=utc_now)
    
    actor = relationship("User", back_populates="audit_events")
    project = relationship("Project", back_populates="audit_events")
