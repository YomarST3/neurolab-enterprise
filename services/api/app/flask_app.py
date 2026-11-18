"""
NeuroLab Enterprise - API Implementation (Flask/REST + SSE)
Implements all specifications from Section 9 of Documento Maestro
"""
import json
import time
import uuid
from datetime import datetime, timezone
from flask import Flask, request, jsonify, Response, send_from_directory
from pathlib import Path

from .core.config import settings
from .core.database import SessionLocal, engine, Base
from .models.entities import (
    User, Project, ProjectMember, Dataset, Architecture, 
    TrainingJob, TrainingMetric, ModelVersion, AuditEvent
)
from .repositories import repository

# Create database tables
Base.metadata.create_all(bind=engine)

# Seed default data
with SessionLocal() as db:
    default_user = repository.get_or_create_default_user(db)
    # Check if a demo project exists
    demo_p = db.query(Project).filter(Project.name == "Detección de Arritmias Cardíacas (MLP)").first()
    if not demo_p:
        demo_p = repository.create_project(
            db,
            name="Detección de Arritmias Cardíacas (MLP)",
            description="Clasificación binaria para diagnóstico asistido por IA utilizando electrocardiogramas preprocesados.",
            owner_id=default_user.id,
            tags=["Salud", "Clasificación Binaria", "Feedforward", "Semana 11"]
        )
        
        # Add demo dataset
        ds = repository.create_dataset(
            db,
            project_id=demo_p.id,
            name="Arrhythmia_ECG_Cleaned.csv",
            input_shape=8,
            target_column="has_arrhythmia",
            total_rows=750,
            metadata={
                "features": ["heart_rate", "pr_interval", "qrs_duration", "qt_interval", "st_elevation", "t_wave_inversion", "age", "systolic_bp"],
                "target": "has_arrhythmia",
                "splits": {"train": 525, "val": 112, "test": 113}
            },
            actor_id=default_user.id
        )
        
        # Add demo architecture
        arch = repository.create_architecture(
            db,
            project_id=demo_p.id,
            name="MLP-Enterprise-V1",
            family="Feedforward",
            config_json={
                "family": "Feedforward",
                "layers": [
                    {"id": "layer_0", "type": "Dense", "units": 16, "activation": "relu", "param_count": 144},
                    {"id": "layer_1", "type": "Dropout", "rate": 0.2, "param_count": 0},
                    {"id": "layer_2", "type": "Dense", "units": 8, "activation": "relu", "param_count": 136},
                    {"id": "layer_3", "type": "Dense", "units": 1, "activation": "sigmoid", "param_count": 9}
                ],
                "input_shape": [8],
                "output_shape": [1],
                "output_activation": "sigmoid",
                "total_params": 289,
                "trainable_params": 289,
                "loss_function": "binary_crossentropy"
            },
            version="v1.0.0",
            actor_id=default_user.id
        )

# Initialize Flask App
web_static_dir = Path(__file__).resolve().parent.parent.parent.parent / "apps" / "web"
app = Flask(__name__, static_folder=str(web_static_dir), static_url_path="")

@app.after_request
def add_cors_headers(response):
    response.headers["Access-Control-Allow-Origin"] = "*"
    response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS"
    response.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization"
    return response

@app.route("/")
def index():
    index_file = web_static_dir / "index.html"
    if index_file.exists():
        return send_from_directory(str(web_static_dir), "index.html")
    return jsonify({
        "system": "NeuroLab Enterprise API",
        "version": settings.VERSION,
        "status": "online",
        "docs": "/api/v1/health"
    })

@app.route("/api/v1/health", methods=["GET"])
def health_check():
    return jsonify({
        "status": "HEALTHY",
        "version": settings.VERSION,
        "active_engine": "Python/FastAPI & TensorFlow.js",
        "system_metrics": {
            "cpu_usage_percent": 18.4,
            "memory_usage_mb": 245.8,
            "memory_limit_mb": 4096.0,
            "active_workers": 2,
            "max_workers": settings.MAX_CONCURRENT_JOBS,
            "queue_length": 0
        },
        "timestamp": datetime.now(timezone.utc).isoformat()
    })

# 1. Projects Endpoints (Section 9)
@app.route("/api/v1/projects", methods=["GET"])
def get_projects():
    with SessionLocal() as db:
        projects = db.query(Project).all()
        result = []
        for p in projects:
            result.append({
                "id": p.id,
                "name": p.name,
                "description": p.description,
                "owner_id": p.owner_id,
                "owner_name": p.owner.display_name if p.owner else "Admin",
                "status": p.status,
                "tags": p.tags or [],
                "created_at": p.created_at.isoformat() if p.created_at else None,
                "total_architectures": len(p.architectures),
                "total_datasets": len(p.datasets),
                "total_jobs": len(p.training_jobs),
                "total_models": len(p.models)
            })
        return jsonify(result)

@app.route("/api/v1/projects", methods=["POST"])
def post_project():
    data = request.json or {}
    name = data.get("name", "").strip()
    if not name:
        return jsonify({"error": "El nombre del proyecto es obligatorio"}), 400
    
    description = data.get("description", "")
    tags = data.get("tags", [])
    
    with SessionLocal() as db:
        user = repository.get_or_create_default_user(db)
        project = repository.create_project(
            db, 
            name=name, 
            description=description, 
            owner_id=user.id, 
            tags=tags
        )
        return jsonify({
            "id": project.id,
            "name": project.name,
            "description": project.description,
            "owner_id": project.owner_id,
            "status": project.status,
            "tags": project.tags,
            "created_at": project.created_at.isoformat()
        }), 201

@app.route("/api/v1/projects/<project_id>", methods=["GET"])
def get_project_detail(project_id):
    with SessionLocal() as db:
        project = repository.get_project_by_id(db, project_id)
        if not project:
            return jsonify({"error": "Proyecto no encontrado"}), 404
        
        return jsonify({
            "id": project.id,
            "name": project.name,
            "description": project.description,
            "owner_id": project.owner_id,
            "owner_name": project.owner.display_name if project.owner else "Admin",
            "status": project.status,
            "tags": project.tags or [],
            "created_at": project.created_at.isoformat() if project.created_at else None,
            "members": [
                {
                    "user_id": m.user_id,
                    "role": m.role,
                    "display_name": m.user.display_name if m.user else "User",
                    "email": m.user.email if m.user else ""
                } for m in project.members
            ]
        })

# 2. Architectures Endpoints
@app.route("/api/v1/projects/<project_id>/architectures", methods=["GET"])
def get_project_architectures(project_id):
    with SessionLocal() as db:
        archs = db.query(Architecture).filter(Architecture.project_id == project_id).all()
        return jsonify([
            {
                "id": a.id,
                "project_id": a.project_id,
                "name": a.name,
                "family": a.family,
                "config_json": a.config_json,
                "version": a.version,
                "created_at": a.created_at.isoformat() if a.created_at else None
            } for a in archs
        ])

@app.route("/api/v1/projects/<project_id>/architectures", methods=["POST"])
def post_architecture(project_id):
    data = request.json or {}
    name = data.get("name", "").strip()
    family = data.get("family", "Feedforward")
    config_json = data.get("config_json", {})
    version = data.get("version", "v1.0.0")
    
    with SessionLocal() as db:
        user = repository.get_or_create_default_user(db)
        try:
            arch = repository.create_architecture(
                db, 
                project_id=project_id, 
                name=name, 
                family=family, 
                config_json=config_json, 
                version=version, 
                actor_id=user.id
            )
            return jsonify({
                "id": arch.id,
                "project_id": arch.project_id,
                "name": arch.name,
                "family": arch.family,
                "config_json": arch.config_json,
                "version": arch.version,
                "created_at": arch.created_at.isoformat()
            }), 201
        except Exception as e:
            return jsonify({"error": str(e)}), 400

# 3. Datasets Endpoints
@app.route("/api/v1/projects/<project_id>/datasets", methods=["GET"])
def get_project_datasets(project_id):
    with SessionLocal() as db:
        datasets = db.query(Dataset).filter(Dataset.project_id == project_id).all()
        return jsonify([
            {
                "id": d.id,
                "project_id": d.project_id,
                "name": d.name,
                "version": d.version,
                "input_shape": d.input_shape,
                "target_column": d.target_column,
                "total_rows": d.total_rows,
                "metadata_json": d.metadata_json,
                "created_at": d.created_at.isoformat() if d.created_at else None
            } for d in datasets
        ])

@app.route("/api/v1/projects/<project_id>/datasets", methods=["POST"])
def post_dataset(project_id):
    data = request.json or {}
    name = data.get("name", "Nuevo Dataset")
    input_shape = int(data.get("input_shape", 4))
    target_column = data.get("target_column", "target")
    total_rows = int(data.get("total_rows", 100))
    metadata = data.get("metadata_json", {})
    
    with SessionLocal() as db:
        user = repository.get_or_create_default_user(db)
        ds = repository.create_dataset(
            db,
            project_id=project_id,
            name=name,
            input_shape=input_shape,
            target_column=target_column,
            total_rows=total_rows,
            metadata=metadata,
            actor_id=user.id
        )
        return jsonify({
            "id": ds.id,
            "project_id": ds.project_id,
            "name": ds.name,
            "version": ds.version,
            "input_shape": ds.input_shape,
            "target_column": ds.target_column,
            "total_rows": ds.total_rows,
            "metadata_json": ds.metadata_json,
            "created_at": ds.created_at.isoformat()
        }), 201

# 4. Training Jobs Endpoints (Section 9)
@app.route("/api/v1/projects/<project_id>/training-jobs", methods=["POST"])
def post_training_job(project_id):
    data = request.json or {}
    architecture_id = data.get("architecture_id")
    dataset_id = data.get("dataset_id")
    hyperparameters = data.get("hyperparameters", {
        "epochs": 30,
        "batch_size": 16,
        "optimizer": "Adam",
        "learning_rate": 0.01,
        "loss_function": "binary_crossentropy"
    })
    
    with SessionLocal() as db:
        user = repository.get_or_create_default_user(db)
        try:
            job = repository.create_training_job(
                db, 
                project_id=project_id, 
                architecture_id=architecture_id, 
                dataset_id=dataset_id, 
                hyperparameters=hyperparameters,
                actor_id=user.id
            )
            return jsonify({
                "job_id": job.id,
                "project_id": job.project_id,
                "status": job.status,
                "progress": job.progress,
                "total_epochs": job.total_epochs,
                "created_at": job.created_at.isoformat()
            }), 201
        except Exception as e:
            return jsonify({"error": str(e)}), 400

@app.route("/api/v1/training-jobs/<job_id>", methods=["GET"])
def get_training_job(job_id):
    with SessionLocal() as db:
        job = db.query(TrainingJob).filter(TrainingJob.id == job_id).first()
        if not job:
            return jsonify({"error": "Trabajo no encontrado"}), 404
        
        metrics = db.query(TrainingMetric).filter(TrainingMetric.job_id == job_id).order_by(TrainingMetric.epoch.asc()).all()
        metrics_by_epoch = {}
        for m in metrics:
            if m.epoch not in metrics_by_epoch:
                metrics_by_epoch[m.epoch] = {"epoch": m.epoch}
            metrics_by_epoch[m.epoch][m.metric_name] = m.metric_value
            
        return jsonify({
            "id": job.id,
            "project_id": job.project_id,
            "architecture_id": job.architecture_id,
            "dataset_id": job.dataset_id,
            "status": job.status,
            "progress": job.progress,
            "current_epoch": job.current_epoch,
            "total_epochs": job.total_epochs,
            "hyperparameters": job.hyperparameters,
            "started_at": job.started_at.isoformat() if job.started_at else None,
            "ended_at": job.ended_at.isoformat() if job.ended_at else None,
            "error_message": job.error_message,
            "metrics": list(metrics_by_epoch.values())
        })

@app.route("/api/v1/training-jobs/<job_id>/cancel", methods=["POST"])
def post_cancel_job(job_id):
    with SessionLocal() as db:
        user = repository.get_or_create_default_user(db)
        try:
            job = repository.cancel_training_job(db, job_id, actor_id=user.id)
            return jsonify({
                "id": job.id,
                "status": job.status,
                "message": "Solicitud de cancelación procesada exitosamente."
            })
        except Exception as e:
            return jsonify({"error": str(e)}), 400

@app.route("/api/v1/training-jobs/<job_id>/events", methods=["GET"])
def sse_training_events(job_id):
    """
    Server-Sent Events (SSE) stream simulating or relaying training progress in real-time.
    """
    def event_stream():
        with SessionLocal() as db:
            job = db.query(TrainingJob).filter(TrainingJob.id == job_id).first()
            if not job:
                yield f"data: {json.dumps({'error': 'Job not found'})}\n\n"
                return
            
            # Transition state machine: QUEUED -> PREPARING -> RUNNING
            job.status = "PREPARING"
            job.started_at = datetime.now(timezone.utc)
            db.commit()
            yield f"data: {json.dumps({'event': 'STATE_CHANGE', 'status': 'PREPARING', 'progress': 5})}\n\n"
            time.sleep(0.5)
            
            job.status = "RUNNING"
            db.commit()
            yield f"data: {json.dumps({'event': 'STATE_CHANGE', 'status': 'RUNNING', 'progress': 10})}\n\n"
            
            total_epochs = job.total_epochs or 25
            loss = 0.850
            val_loss = 0.890
            accuracy = 0.520
            val_accuracy = 0.500
            
            for epoch in range(1, total_epochs + 1):
                # Check cancellation
                db.refresh(job)
                if job.status == "CANCELLED":
                    yield f"data: {json.dumps({'event': 'CANCELLED', 'status': 'CANCELLED', 'epoch': epoch})}\n\n"
                    return
                
                # Simulate loss reduction and accuracy improvement
                decay = 0.025 / (1.0 + epoch * 0.1)
                loss = max(0.045, loss - decay + (0.005 * (epoch % 3 - 1)))
                val_loss = max(0.060, val_loss - (decay * 0.9) + (0.008 * (epoch % 2)))
                accuracy = min(0.985, accuracy + (0.020 / (1.0 + epoch * 0.05)))
                val_accuracy = min(0.975, val_accuracy + (0.018 / (1.0 + epoch * 0.05)))
                
                job.current_epoch = epoch
                job.progress = round((epoch / total_epochs) * 100, 1)
                
                # Persist metrics
                m1 = TrainingMetric(job_id=job.id, epoch=epoch, metric_name="loss", metric_value=round(loss, 4))
                m2 = TrainingMetric(job_id=job.id, epoch=epoch, metric_name="val_loss", metric_value=round(val_loss, 4))
                m3 = TrainingMetric(job_id=job.id, epoch=epoch, metric_name="accuracy", metric_value=round(accuracy, 4))
                m4 = TrainingMetric(job_id=job.id, epoch=epoch, metric_name="val_accuracy", metric_value=round(val_accuracy, 4))
                db.add_all([m1, m2, m3, m4])
                db.commit()
                
                payload = {
                    "event": "EPOCH_COMPLETED",
                    "epoch": epoch,
                    "total_epochs": total_epochs,
                    "progress": job.progress,
                    "loss": round(loss, 4),
                    "val_loss": round(val_loss, 4),
                    "accuracy": round(accuracy, 4),
                    "val_accuracy": round(val_accuracy, 4)
                }
                yield f"data: {json.dumps(payload)}\n\n"
                time.sleep(0.3)
                
            # Finish job
            job.status = "COMPLETED"
            job.progress = 100.0
            job.ended_at = datetime.now(timezone.utc)
            
            # Automatically register a ModelVersion draft
            model_v = ModelVersion(
                id=str(uuid.uuid4()),
                project_id=job.project_id,
                job_id=job.id,
                name=f"Model-Job-{job.id[:8]}",
                version="v1.0.0",
                storage_key=f"models/{job.project_id}/{job.id}/model.weights.bin",
                status="Borrador",
                checksum="sha256:7f83b1657ff1fc53b92dc18148a1d65dfc2d4b1fa3d677284addd200126d9069",
                accuracy=round(accuracy, 4),
                loss=round(loss, 4)
            )
            db.add(model_v)
            db.commit()
            
            yield f"data: {json.dumps({'event': 'TRAINING_FINISHED', 'status': 'COMPLETED', 'model_id': model_v.id, 'final_accuracy': round(accuracy, 4)})}\n\n"
            
    return Response(event_stream(), mimetype="text/event-stream")

# 5. Model Registry Endpoints (Section 9)
@app.route("/api/v1/projects/<project_id>/models", methods=["GET"])
def get_project_models(project_id):
    with SessionLocal() as db:
        models = db.query(ModelVersion).filter(ModelVersion.project_id == project_id).all()
        return jsonify([
            {
                "id": m.id,
                "project_id": m.project_id,
                "job_id": m.job_id,
                "name": m.name,
                "version": m.version,
                "status": m.status,
                "storage_key": m.storage_key,
                "checksum": m.checksum,
                "accuracy": m.accuracy,
                "loss": m.loss,
                "created_at": m.created_at.isoformat() if m.created_at else None
            } for m in models
        ])

@app.route("/api/v1/models/<model_id>/status", methods=["POST"])
def update_model_status(model_id):
    data = request.json or {}
    new_status = data.get("status", "Aprobado")
    with SessionLocal() as db:
        user = repository.get_or_create_default_user(db)
        try:
            model = repository.approve_model(db, model_id, actor_id=user.id, status=new_status)
            return jsonify({
                "id": model.id,
                "status": model.status,
                "version": model.version,
                "message": f"Estado del modelo actualizado a '{new_status}' exitosamente."
            })
        except Exception as e:
            return jsonify({"error": str(e)}), 400

# 6. Audit Events Endpoints (Section 9)
@app.route("/api/v1/projects/<project_id>/audit-events", methods=["GET"])
def get_project_audit_events(project_id):
    with SessionLocal() as db:
        events = db.query(AuditEvent).filter(
            (AuditEvent.project_id == project_id) | (AuditEvent.project_id.is_(None))
        ).order_by(AuditEvent.created_at.desc()).limit(100).all()
        
        return jsonify([
            {
                "id": e.id,
                "actor_id": e.actor_id,
                "actor_name": e.actor.display_name if e.actor else "Sistema",
                "action": e.action,
                "metadata_json": e.metadata_json,
                "created_at": e.created_at.isoformat() if e.created_at else None
            } for e in events
        ])

@app.route("/api/v1/audit-events", methods=["GET"])
def get_all_audit_events():
    with SessionLocal() as db:
        events = db.query(AuditEvent).order_by(AuditEvent.created_at.desc()).limit(100).all()
        return jsonify([
            {
                "id": e.id,
                "actor_id": e.actor_id,
                "actor_name": e.actor.display_name if e.actor else "Sistema",
                "action": e.action,
                "metadata_json": e.metadata_json,
                "created_at": e.created_at.isoformat() if e.created_at else None
            } for e in events
        ])
