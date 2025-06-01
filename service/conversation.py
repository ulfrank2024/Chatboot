from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import psycopg2
import os
from dotenv import load_dotenv

load_dotenv()

router = APIRouter(prefix="/satisfaction", tags=["satisfaction"])

DB_CONFIG = {
    'dbname': os.getenv('DB_NAME'),
    'user': os.getenv('DB_USER'),
    'password': os.getenv('DB_PASSWORD'),
    'host': os.getenv('DB_HOST'),
    'port': os.getenv('DB_PORT', '5432')
}

class SatisfactionData(BaseModel):
    session_id: str
    level: int
    comment: str | None = None

@router.post("/submit")
async def submit_satisfaction(satisfaction_data: SatisfactionData):
    conn = None
    cur = None
    try:
        conn = psycopg2.connect(**DB_CONFIG)
        cur = conn.cursor()
        cur.execute("""
            INSERT INTO satisfaction (session_id, level, comment)
            VALUES (%s, %s, %s);
        """, (satisfaction_data.session_id, satisfaction_data.level, satisfaction_data.comment))
        conn.commit()
        return {"message": "Votre évaluation de satisfaction a été enregistrée."}
    except Exception as e:
        print(f"Erreur lors de l'enregistrement de la satisfaction : {e}")
        raise HTTPException(status_code=500, detail="Erreur lors de l'enregistrement de la satisfaction")
    finally:
        if cur:
            cur.close()
        if conn:
            conn.close()