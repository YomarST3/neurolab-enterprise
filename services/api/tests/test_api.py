"""
NeuroLab Enterprise - Automated Test Suite
Tests endpoints and business rules specified in Documento Maestro (Section 10 & 15).
"""
import unittest
import json
import sys
from pathlib import Path

# Add services/api to sys.path
api_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(api_dir))

from app.flask_app import app
from app.core.database import SessionLocal
from app.models.entities import Project, Architecture, Dataset, TrainingJob

class TestNeuroLabAPI(unittest.TestCase):
    def setUp(self):
        self.client = app.test_client()
        self.client.testing = True

    def test_01_health_check(self):
        """Verify API health endpoint returns 200 and healthy status."""
        response = self.client.get("/api/v1/health")
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)
        self.assertEqual(data.get("status"), "HEALTHY")
        self.assertIn("active_engine", data)

    def test_02_list_projects(self):
        """Verify projects listing endpoint returns valid array."""
        response = self.client.get("/api/v1/projects")
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)
        self.assertIsInstance(data, list)
        self.assertGreaterEqual(len(data), 1)

    def test_03_create_project(self):
        """Verify project creation with name and problem description."""
        payload = {
            "name": "Proyecto Test Detección de Fraude",
            "description": "Prueba unitaria automatizada para modelo MLP.",
            "tags": ["Pruebas", "Feedforward"]
        }
        response = self.client.post("/api/v1/projects", json=payload)
        self.assertEqual(response.status_code, 201)
        data = json.loads(response.data)
        self.assertIn("id", data)
        self.assertEqual(data["name"], payload["name"])

    def test_04_training_job_lifecycle_and_validation(self):
        """
        Verify Business Rule Section 10:
        'No iniciar un entrenamiento sin proyecto, arquitectura y dataset válidos'
        """
        # Invalid payload without valid IDs
        invalid_payload = {
            "architecture_id": "non_existent_arch",
            "dataset_id": "non_existent_dataset"
        }
        response = self.client.post("/api/v1/projects/invalid_proj/training-jobs", json=invalid_payload)
        self.assertEqual(response.status_code, 400)
        data = json.loads(response.data)
        self.assertIn("error", data)

    def test_05_audit_events_endpoint(self):
        """Verify audit trail endpoint records events."""
        response = self.client.get("/api/v1/audit-events")
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)
        self.assertIsInstance(data, list)
        self.assertGreaterEqual(len(data), 1)

if __name__ == "__main__":
    unittest.main()
