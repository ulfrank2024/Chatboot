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
    logger.error("Erreur: Les variables d'environnement de la base de données ne sont pas toutes définies. Vérifiez votre fichier .env.")

router = APIRouter(prefix="/satisfaction", tags=["satisfaction"])

class SatisfactionData(BaseModel):
    """Modèle Pydantic pour les données de satisfaction."""
    level: int | None  # La satisfaction peut être nulle
    count: int

def get_db_connection():
    """
    Obtient une connexion à la base de données PostgreSQL.
    """
    conn = None
    try:
        conn = psycopg2.connect(**DB_CONFIG)
        yield conn
    except psycopg2.Error as e:
        logger.error(f"Erreur de connexion à la base de données : {e}")
        raise
    finally:
        if conn:
            conn.close()

def get_satisfaction_data(db: psycopg2.extensions.connection):
    """
    Récupère le nombre d'occurrences pour chaque niveau de satisfaction depuis la table 'conversations'.
    """
    try:
        with db.cursor(cursor_factory=extras.DictCursor) as cursor:
            cursor.execute("""
                SELECT satisfaction AS level, COUNT(*) AS count
                FROM conversations
                WHERE satisfaction IS NOT NULL
                GROUP BY satisfaction
                ORDER BY satisfaction;
            """)
            rows = cursor.fetchall()
            return [dict(row) for row in rows]
    except psycopg2.Error as e:
        logger.error(f"Erreur lors de la récupération des données de satisfaction : {e}")
        return []

@router.get("/data", response_model=List[SatisfactionData])
async def read_satisfaction_data(db: psycopg2.extensions.connection = Depends(get_db_connection)):
    """
    Endpoint pour récupérer l'ensemble des données de satisfaction agrégées.
    Accessible via /satisfaction/data
    """
    return get_satisfaction_data(db)