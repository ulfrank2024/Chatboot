from fastapi import APIRouter, Depends
from typing import List
from pydantic import BaseModel
import psycopg2
from psycopg2 import extras
import logging
import os
from dotenv import load_dotenv

logger = logging.getLogger(__name__)

load_dotenv()

DB_CONFIG = {
    'dbname': os.getenv('DB_NAME'),
    'user': os.getenv('DB_USER'),
    'password': os.getenv('DB_PASSWORD'),
    'host': os.getenv('DB_HOST'),
    'port': os.getenv('DB_PORT', '5432')
}

if not all(DB_CONFIG.values()):
    logger.error("Erreur: Les variables d'environnement de la base de données ne sont pas toutes définies pour les questions non répondues. Vérifiez votre fichier .env.")

router = APIRouter(prefix="/questions", tags=["unanswered_questions"])

class UnansweredQuestion(BaseModel):
    """Modèle Pydantic pour une question sans réponse."""
    question: str
    programme: str | None
    session: str | None
    timestamp: str | None

def get_db_connection():
    """
    Obtient une connexion à la base de données PostgreSQL.
    """
    conn = None
    try:
        conn = psycopg2.connect(**DB_CONFIG)
        yield conn
    except psycopg2.Error as e:
        logger.error(f"Erreur de connexion à la base de données pour les questions non répondues : {e}")
        raise
    finally:
        if conn:
            conn.close()

def get_unanswered_questions_data(db: psycopg2.extensions.connection):
    """
    Récupère les questions sans réponse, le programme, la session et le timestamp
    depuis la table 'unresolved_messages' et formate le timestamp.
    """
    try:
        with db.cursor(cursor_factory=extras.DictCursor) as cursor:
            cursor.execute("""
                SELECT
                    message AS question,
                    etudiant_programme AS programme,
                    etudiant_session AS session,
                    timestamp
                FROM
                    unresolved_messages
                ORDER BY
                    timestamp DESC;
            """)
            rows = cursor.fetchall()
            result = []
            for row in rows:
                # Formatter l'objet datetime en string ISO 8601
                timestamp_str = row['timestamp'].isoformat() if row['timestamp'] else None
                result.append({
                    "question": row['question'],
                    "programme": row['programme'],
                    "session": row['session'],
                    "timestamp": timestamp_str
                })
            return result
    except psycopg2.Error as e:
        logger.error(f"Erreur lors de la récupération des questions sans réponse : {e}")
        return []

@router.get("/unanswered", response_model=List[UnansweredQuestion])
async def read_unanswered_questions(db: psycopg2.extensions.connection = Depends(get_db_connection)):
    """Endpoint pour récupérer les questions sans réponse.
    Accessible via /questions/unanswered
    """
    return get_unanswered_questions_data(db)