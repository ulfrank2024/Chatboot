import random
import pickle
import numpy as np
import tensorflow as tf
import spacy
import psycopg2  
from dotenv import load_dotenv
import os

load_dotenv()

# --- Configuration SpaCy ---
try:
    nlp = spacy.load("fr_core_news_sm")
except OSError:
    print("Modèle SpaCy non trouvé...")
    exit()

# --- Configuration de la Base de Données ---
DB_CONFIG = {
    'dbname': os.getenv('DB_NAME'),
    'user': os.getenv('DB_USER'),
    'password': os.getenv('DB_PASSWORD'),
    'host': os.getenv('DB_HOST'),
    'port': os.getenv('DB_PORT', '5432')
}

# --- Chargement des fichiers pré-entraînés ---
try:
    words = pickle.load(open('words.pkl', 'rb'))
    classes = pickle.load(open('classes.pkl', 'rb'))
    model = tf.keras.models.load_model('chatbot_model.h5')
except FileNotFoundError as e:
    print(f"Erreur : Fichier essentiel non trouvé : {e}")
    exit()
except Exception as e:
    print(f"Erreur lors du chargement...")
    exit()

# --- Fonctions de Nettoyage et de Prédiction ---
def clean_up_sentence(sentence):
    doc = nlp(sentence.lower())
    sentence_words = [token.lemma_ for token in doc if not token.is_punct and not token.is_space]
    return sentence_words

def bag_of_words(sentence):
    sentence_words = clean_up_sentence(sentence)
    bag = [0] * len(words)
    for w in sentence_words:
        for i, word in enumerate(words):
            if word == w:
                bag[i] = 1
    return np.array(bag)

def predict_class(sentence):
    print(f"--> predict_class appelée avec : '{sentence}'")
    bow = bag_of_words(sentence)
    res = model.predict(np.array([bow]))[0]
    ERROR_THRESHOLD = 0.65
    results = [[i, r] for i, r in enumerate(res) if r > ERROR_THRESHOLD]
    results.sort(key=lambda x: x[1], reverse=True)
    return_list = [{'intent': classes[r[0]], 'probability': str(r[1])} for r in results]
    print(f"--> predict_class retourne : {return_list}")
    return return_list

def get_response_from_db(predicted_intents_list, session_id=None, etudiant_programme=None, user_message_original=None, etudiant_session=None):
    """
    Récupère une réponse aléatoire depuis la base de données pour l'intention la plus probable.
    Enregistre également les messages non compris avec la session et le programme.
    """
    print(f"--> get_response_from_db appelée avec : {predicted_intents_list}, session_id: {session_id}, etudiant_programme: {etudiant_programme}, user_message: '{user_message_original}', etudiant_session: {etudiant_session}")
    conn = None
    cur = None
    try:
        conn = psycopg2.connect(**DB_CONFIG)
        cur = conn.cursor()

        if predicted_intents_list:
            highest_probability_intent_tag = predicted_intents_list[0]['intent']
            cur.execute("""
                SELECT R.response
                FROM responses R
                JOIN intents I ON R.intent_id = I.id
                WHERE I.tag = %s;
            """, (highest_probability_intent_tag,))
            db_responses = cur.fetchall()
            responses = [row[0] for row in db_responses]

            if responses:
                response = random.choice(responses)
                print(f"--> get_response_from_db retourne (réponse trouvée) : '{response}'")
                return response
            else:
                response = f"Je comprends que vous parlez de '{highest_probability_intent_tag}', mais je n'ai pas de réponse spécifique pour l'instant."
                print(f"--> get_response_from_db retourne (pas de réponse spécifique) : '{response}'")
                return response
        else:
            unresolved_message = "Je n'ai pas compris votre question. Veuillez contacter notre équipe à emploi-coop@collegelacite.ca \n Service de placement en emploi, pièce B1015 \n Téléphone : 613 742-2483, poste 2477 \n Télécopieur : 613 742-2474 pour plus d'assistance."
            if user_message_original:
                try:
                    cur.execute("""
                        INSERT INTO unresolved_messages (message, session_id, etudiant_programme, etudiant_session)
                        VALUES (%s, %s, %s, %s);
                    """, (user_message_original, session_id, etudiant_programme, etudiant_session))
                    conn.commit()
                    print(f"--> get_response_from_db a enregistré le message non résolu : '{user_message_original}' pour la session '{session_id}', le programme '{etudiant_programme}' et la session étudiante '{etudiant_session}'")
                except Exception as db_error:
                    print(f"Erreur lors de l'enregistrement du message non résolu : {db_error}")
            else:
                print("--> get_response_from_db : Message original de l'utilisateur non disponible pour l'enregistrement.")
            print(f"--> get_response_from_db retourne (non compris) : '{unresolved_message}'")
            return unresolved_message
    except Exception as e:
        print(f"Erreur lors de la récupération des réponses depuis la base de données : {e}")
        return "Désolé, une erreur est survenue lors de la communication avec la base de données."
    finally:
        if cur:
            cur.close()
        if conn:
            conn.close()