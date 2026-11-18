"""
NeuroLab Enterprise - FastAPI Application
Specification as described in Documento Maestro de Desarrollo (Section 5 & 7)
"""
from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from typing import List, Dict, Any

from .core.config import settings
from .core.database import get_db, Base, engine
from .schemas.schemas import (
    ProjectResponse, ProjectCreate,
    ArchitectureResponse, ArchitectureCreate,
    DatasetResponse, DatasetCreate,
    TrainingJobResponse, TrainingJobCreate,
    ModelVersionResponse, AuditEventResponse
)

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="API empresarial para diseñar, entrenar, evaluar y versionar redes neuronales artificiales (Semana 11).",
    openapi_url=f"{settings.API_V1_STR}/openapi.json"
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def root():
    return {
        "title": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "mode": "Enterprise Backend (FastAPI + PostgreSQL/SQLite)",
        "docs_url": "/docs"
    }

@app.get(f"{settings.API_V1_STR}/health")
def health_check():
    return {
        "status": "HEALTHY",
        "version": settings.VERSION,
        "active_engine": "TensorFlow/Keras + FastAPI Workers",
        "workers_available": settings.MAX_CONCURRENT_JOBS
    }
