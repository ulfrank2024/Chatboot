from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import psycopg2
import os
from dotenv import load_dotenv
import json  


from chatbot import predict_class, get_response_from_db

load_dotenv()

router = APIRouter(prefix="/chat", tags=["chat"])

DB_CONFIG = {
    'dbname': os.getenv('DB_NAME'),
    'user': os.getenv('DB_USER'),
    'password': os.getenv('DB_PASSWORD'),
    'host': os.getenv('DB_HOST'),
    'port': os.getenv('DB_PORT', '5432')
}

class ChatRequest(BaseModel):
    message: str
    user_id: str
    session_id: str
    etudiant_programme: str | None = None
    etudiant_session: str | None = None

class UpdateConversationData(BaseModel):
    etudiant_programme: str
    etudiant_session: str

class ConversationData(BaseModel):
    user_id: str
    session_id: str
    etudiant_programme: str | None = None
    etudiant_session: str | None = None
    satisfaction: int | None = None
    conversation_history: list

class SatisfactionData(BaseModel):
    session_id: str
    level: int
    comment: str | None = None


async def update_conversation_data(session_id: str, update_data: UpdateConversationData):
    conn = None
    cur = None
    try:
        conn = psycopg2.connect(**DB_CONFIG)
        cur = conn.cursor()
        cur.execute("""
            UPDATE conversations
            SET etudiant_programme = %s, etudiant_session = %s
            WHERE session_id = %s;
        """, (update_data.etudiant_programme, update_data.etudiant_session, session_id))
        conn.commit()
        return {"message": f"Conversation avec session_id {session_id} mise à jour"}
    except Exception as e:
        print(f"Erreur lors de la mise à jour de la conversation : {e}")
        raise HTTPException(status_code=500, detail="Erreur lors de la mise à jour des données de la conversation")
    finally:
        if cur:
            cur.close()
        if conn:
            conn.close()

async def chat(request_data: ChatRequest):
    print("--> Fonction chat atteinte")
    conn = None
    cur = None
    try:
        conn = psycopg2.connect(**DB_CONFIG)
        cur = conn.cursor()

        # Vérifier si une conversation existe pour cette session
        cur.execute("SELECT id, etudiant_programme FROM conversations WHERE session_id = %s;", (request_data.session_id,))
        existing_conversation = cur.fetchone()
        etudiant_programme_from_db = None
        if existing_conversation:
            conversation_id = existing_conversation[0]
            etudiant_programme_from_db = existing_conversation[1]
            # Mettre à jour le programme et la session s'ils sont fournis (pour les interactions suivantes)
            if request_data.etudiant_programme and request_data.etudiant_programme != etudiant_programme_from_db:
                cur.execute("UPDATE conversations SET etudiant_programme = %s WHERE id = %s;", (request_data.etudiant_programme, conversation_id))
                conn.commit()
            if request_data.etudiant_session:
                cur.execute("UPDATE conversations SET etudiant_session = %s WHERE id = %s;", (request_data.etudiant_session, conversation_id))
                conn.commit()
        else:
            cur.execute("""
                INSERT INTO conversations (user_id, session_id, etudiant_programme, etudiant_session)
                VALUES (%s, %s, %s, %s)
                RETURNING id;
            """, (request_data.user_id, request_data.session_id, request_data.etudiant_programme, request_data.etudiant_session))
            conversation_id = cur.fetchone()[0]

        # Enregistrer le message de l'utilisateur
        cur.execute("""
            INSERT INTO messages (conversation_id, sender, content)
            VALUES (%s, 'user', %s);
        """, (conversation_id, request_data.message))
        conn.commit()

        # Logique du chatbot pour obtenir la réponse
        intents = predict_class(request_data.message)
        response = get_response_from_db(
            intents,
            request_data.session_id,
            request_data.etudiant_programme,
            request_data.message,
            request_data.etudiant_session  # Passer la session étudiant ici
        )

        # Enregistrer la réponse du bot
        cur.execute("""
            INSERT INTO messages (conversation_id, sender, content)
            VALUES (%s, 'bot', %s);
        """, (conversation_id, response));
        conn.commit()

        return {"response": response if response else ""}

    except Exception as e:
        print(f"--> ERREUR INATTENDUE dans la fonction chat : {e}")
        raise HTTPException(status_code=500, detail="Erreur lors du traitement du message")
    finally:
        if cur:
            cur.close()
        if conn:
            conn.close()

@router.post("/")
async def handle_chat(request_data: ChatRequest):
    return await chat(request_data)

@router.put("/conversation/{session_id}")
async def handle_update_conversation(session_id: str, update_data: UpdateConversationData):
    return await update_conversation_data(session_id, update_data)

@router.post("/api/conversation")
async def save_conversation(conversation_data: ConversationData):
    conn = None
    cur = None
    try:
        conn = psycopg2.connect(**DB_CONFIG)
        cur = conn.cursor()

        # Vérifier si une conversation existe déjà pour cet user_id et session_id
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
                INSERT INTO message (conversation_id, sender, content)
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

@router.post("/api/satisfaction")
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