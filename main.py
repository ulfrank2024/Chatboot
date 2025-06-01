from fastapi import FastAPI, Request, HTTPException
from fastapi.responses import JSONResponse  # Import JSONResponse from fastapi.responses
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
import os
from uuid import uuid4
import psycopg2
from pydantic import BaseModel
from dotenv import load_dotenv

# Assure-toi que chatbot.py est accessible
from chatbot import predict_class, get_response_from_db

# Importe les routeurs depuis le dossier 'services'
from service.satisfaction import router as satisfaction_router
from service.question import router as question_router
from service.chat_service import router as chat_router  # Importe le routeur du chat
from service.conversation_history import router as conversation_router
from service.formulaire import router as admin_router 


load_dotenv()

app = FastAPI()

# Configuration de la base de données
DB_CONFIG = {
    'dbname': os.getenv('DB_NAME'),
    'user': os.getenv('DB_USER'),
    'password': os.getenv('DB_PASSWORD'),
    'host': os.getenv('DB_HOST'),
    'port': os.getenv('DB_PORT', '5432')
}

# Configuration CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["POST", "OPTIONS", "GET", "PUT"],
    allow_headers=["*"],
)

# Monte les fichiers statiques
app.mount("/static", StaticFiles(directory="frontend/static"), name="static")

# Inclut les routeurs
app.include_router(satisfaction_router)
app.include_router(question_router)
app.include_router(conversation_router)
app.include_router(chat_router) 
app.include_router(admin_router) 


# Route pour servir index.html
@app.get("/")
async def serve_index():
    return FileResponse(os.path.join("frontend", "index.html"))

# Route pour servir admin.html
@app.get("/admin")
async def serve_admin():
    return FileResponse(os.path.join("frontend", "admin.html"))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=5000, reload=True)