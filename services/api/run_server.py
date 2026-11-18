"""
NeuroLab Enterprise - Server Launcher
Runs the API backend and serves the frontend client.
"""
import os
import sys
from pathlib import Path

# Add services/api to sys.path
api_dir = Path(__file__).resolve().parent
sys.path.insert(0, str(api_dir))

from app.flask_app import app
from app.core.config import settings

def main():
    host = os.getenv("HOST", "127.0.0.1")
    port = int(os.getenv("PORT", 8000))
    print("=" * 60)
    print(f"🚀  NEUROLAB ENTERPRISE - PLATAFORMA DE REDES NEURONALES")
    print(f"    Semana 11 • Deep Learning & TensorFlow/Keras")
    print("=" * 60)
    print(f"📡  Servidor API & Frontend: http://{host}:{port}")
    print(f"📖  Documentación y Health: http://{host}:{port}/api/v1/health")
    print(f"📂  Directorio de Datos:     {settings.DATA_DIR}")
    print(f"💻  Modo Operativo:         Simulado / Standalone + REST API")
    print("=" * 60)
    print("Presiona Ctrl+C para detener el servidor.\n")
    
    app.run(host=host, port=port, debug=False)

if __name__ == "__main__":
    main()
