from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import psycopg2
import os
from dotenv import load_dotenv
import json

load_dotenv()

router = APIRouter(prefix="/api", tags=["conversation"])

DB_CONFIG = {
    'dbname': os.getenv('DB_NAME'),
    'user': os.getenv('DB_USER'),
    'password': os.getenv('DB_PASSWORD'),
    'host': os.getenv('DB_HOST'),
    'port': os.getenv('DB_PORT', '5432')
}

class ConversationData(BaseModel):
    user_id: str
    session_id: str
    etudiant_programme: str | None = None
    etudiant_session: str | None = None
    satisfaction: int | None = None
    conversation_history: list

@router.post("/conversation")
async def save_conversation(conversation_data: ConversationData):
    conn = None
    cur = None
    try:
        conn = psycopg2.connect(**DB_CONFIG)
        cur = conn.cursor()

      
        cur.execute("SELECT id FROM conversations WHERE user_id = %s AND session_id = %s;",
                    (conversation_data.user_id, conversation_data.session_id))
        existing_conversation = cur.fetchone()

        if existing_conversation:
            conversation_id = existing_conversation[0]
            # Mettre à jour les informations de la conversation existante
            cur.execute("""
                UPDATE conversations
                SET etudiant_programme = %s, etudiant_session = %s, satisfaction = %s
                WHERE id = %s;
            """, (conversation_data.etudiant_programme, conversation_data.etudiant_session,
                  conversation_data.satisfaction, conversation_id))
        else:
            # Créer une nouvelle conversation
            cur.execute("""
                INSERT INTO conversations (user_id, session_id, etudiant_programme, etudiant_session, satisfaction)
                VALUES (%s, %s, %s, %s, %s)
                RETURNING id;
            """, (conversation_data.user_id, conversation_data.session_id, conversation_data.etudiant_programme,
                  conversation_data.etudiant_session, conversation_data.satisfaction))
            conversation_id = cur.fetchone()[0]

        # Enregistrer l'historique des messages dans la table 'message'
        for message in conversation_data.conversation_history:
            cur.execute("""
                INSERT INTO messages (conversation_id, sender, content)
                VALUES (%s, %s, %s);
            """, (conversation_id, message['sender'], message['message']))

        conn.commit()
        return {"message": "Données de conversation enregistrées avec succès."}
    except Exception as e:
        print(f"Erreur lors de l'enregistrement des données de conversation : {e}")
        raise HTTPException(status_code=500, detail="Erreur lors de l'enregistrement des données de la conversation")
    finally:
        if cur:
            cur.close()
        if conn:
            conn.close()