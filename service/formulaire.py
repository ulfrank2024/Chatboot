from fastapi import APIRouter, Request, HTTPException
from fastapi.responses import JSONResponse
import psycopg2
import os
from dotenv import load_dotenv
from pydantic import BaseModel
from typing import List

load_dotenv()

router = APIRouter(prefix="/admin", tags=["admin"])

DB_CONFIG = {
    'dbname': os.getenv('DB_NAME'),
    'user': os.getenv('DB_USER'),
    'password': os.getenv('DB_PASSWORD'),
    'host': os.getenv('DB_HOST'),
    'port': os.getenv('DB_PORT', '5432')
}

class AddIntentRequest(BaseModel):
    tag: str
    theme: str | None = None
    patterns: List[str]
    responses: List[str]

@router.post("/ajouter_intention", response_class=JSONResponse)
async def add_new_intent(intent_data: AddIntentRequest):
    """Gère la soumission du formulaire d'ajout d'intention."""
    conn = None
    cur = None
    try:
        conn = psycopg2.connect(**DB_CONFIG)
        cur = conn.cursor()

        tag = intent_data.tag
        theme = intent_data.theme
        patterns = intent_data.patterns
        responses = intent_data.responses


        cur.execute("SELECT id FROM intents WHERE tag = %s;", (tag,))
        existing_intent = cur.fetchone()
        if existing_intent:
            raise HTTPException(status_code=400, detail=f"L'intention '{tag}' existe déjà.")


        cur.execute(
            "INSERT INTO intents (tag, theme) VALUES (%s, %s) RETURNING id;",
            (tag, theme)
        )
        intent_id = cur.fetchone()[0]

        for pattern in patterns:
            cur.execute(
                "INSERT INTO patterns (intent_id, pattern) VALUES (%s, %s);",
                (intent_id, pattern.strip())
            )

        for response in responses:
            cur.execute(
                "INSERT INTO responses (intent_id, response) VALUES (%s, %s);",
                (intent_id, response.strip())
            )

        conn.commit()
        return {"message": f"L'intention '{tag}' a été ajoutée avec succès."}

    except psycopg2.Error as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Erreur de base de données: {e}")
    except HTTPException as he:
        conn.rollback()
        raise he
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Erreur inattendue: {e}")
    finally:
        if cur:
            cur.close()
        if conn:
            conn.close()