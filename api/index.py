import sys
import os

# Add workspace root and backend directory to python path to allow imports
workspace_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.append(workspace_root)
sys.path.append(os.path.join(workspace_root, "backend"))

from backend.database import init_db
try:
    init_db()
except Exception as e:
    print(f"Database initialization failed during Vercel startup: {e}")

from backend.main import app
