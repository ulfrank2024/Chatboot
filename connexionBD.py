import random
import pickle
import numpy as np
import tensorflow as tf
import spacy
import psycopg2 
from dotenv import load_dotenv
import os

load_dotenv()

try:
    nlp = spacy.load("fr_core_news_sm")
except OSError:
    print("Modèle SpaCy non trouvé. Veuillez l'installer avec :")
    print("python -m spacy download fr_core_news_sm")  # ou en_core_news_sm
    exit()

# Connexion PostgreSQL via les variables d'environnement
DB_NAME = os.getenv("DB_NAME")
DB_USER = os.getenv("DB_USER")
DB_PASSWORD = os.getenv("DB_PASSWORD")
DB_HOST = os.getenv("DB_HOST")
DB_PORT = os.getenv("DB_PORT", "5432")  # Port par défaut si non spécifié dans .env

conn = psycopg2.connect(
    dbname=DB_NAME,
    user=DB_USER,
    password=DB_PASSWORD,
    host=DB_HOST,
    port=DB_PORT
)
cur = conn.cursor()


# Charger les données JSON (le chemin doit être correct pour votre système)
with open("D:\\Cité collegiale courses\\ChatBot Project\\testNLP\\intent.json", "r", encoding="utf-8") as file:
    data = json.load(file)

# Si vous voulez réinsérer les intents depuis le JSON à chaque exécution (attention aux doublons)
for intent in data["intents"]:
    tag = intent["tag"]
    theme = intent.get("theme", None)

    # Insérer dans intents
    cur.execute("INSERT INTO intents (tag, theme) VALUES (%s, %s) RETURNING id;", (tag, theme))
    intent_id = cur.fetchone()[0]

    # Insérer patterns
    for pattern in intent["patterns"]:
        cur.execute("INSERT INTO patterns (intent_id, pattern) VALUES (%s, %s);", (intent_id, pattern))

    # Insérer responses
    for response in intent["responses"]:
        cur.execute("INSERT INTO responses (intent_id, response) VALUES (%s, %s);", (intent_id, response))

conn.commit()  # Important de commiter les changements


def load_intents_from_db():
    intents_data = {'intents': []}
    try:
        # Récupérer les intents (tags et themes)
        cur.execute("SELECT id, tag, theme FROM intents;")
        db_intents = cur.fetchall()

        for intent_id, tag, theme in db_intents:
            current_intent = {'tag': tag, 'patterns': [], 'responses': []}

            # Récupérer les patterns pour cet intent
            cur.execute("SELECT pattern FROM patterns WHERE intent_id = %s;", (intent_id,))
            patterns = cur.fetchall()
            for pattern_row in patterns:
                current_intent['patterns'].append(pattern_row[0])

            # Récupérer les responses pour cet intent
            cur.execute("SELECT response FROM responses WHERE intent_id = %s;", (intent_id,))
            responses = cur.fetchall()
            for response_row in responses:
                current_intent['responses'].append(response_row[0])

            intents_data['intents'].append(current_intent)

        
    except Exception as e:
        print(f"Erreur lors du chargement des intents depuis la base de données : {e}")
        pass

    if not intents_data['intents']:
        print("Aucun intent chargé. Vérifiez la connexion DB et les données.")

    return intents_data

# --- Préparation des données (Preprocessing) ---
intents = load_intents_from_db()

words = []
classes = []
documents = []

for intent in intents['intents']:
    tag = intent['tag']
    if tag not in classes:
        classes.append(tag)

    for pattern in intent['patterns']:
        # Utilisation de spaCy pour la tokenisation et la lemmatisation
        doc = nlp(pattern.lower())  # Traite la phrase avec spaCy
        # On extrait les lemmes, en ignorant la ponctuation et les espaces
        word_list = [token.lemma_ for token in doc if not token.is_punct and not token.is_space]
        words.extend(word_list)
        documents.append((word_list, tag))

# Suppression des doublons et tri
words = sorted(list(set(words)))
classes = sorted(list(set(classes)))

# Affichage des informations pour vérification
print(f"Mots uniques (vocabulaire) : {len(words)}")
print(f"Classes (tags d'intentions) : {len(classes)}")
print(f"Exemples de mots : {words[:10]}...")
print(f"Exemples de classes : {classes}")

# Sauvegarde des listes de mots et de classes pour le module de prédiction future
pickle.dump(words, open('words.pkl', 'wb'))
pickle.dump(classes, open('classes.pkl', 'wb'))

# --- Création des données d'entraînement (Bag of Words) ---
training = []
output_empty = [0] * len(classes)

for doc_words, doc_tag in documents:
    bag = []
    # Création du Bag of Words
    for word in words:
        bag.append(1) if word in doc_words else bag.append(0)

    # Création de l'encodage One-Hot pour le tag
    output_row = list(output_empty)
    output_row[classes.index(doc_tag)] = 1

    training.append(bag + output_row)

random.shuffle(training)
training = np.array(training)

# Séparation des features (X) et des labels (Y)
trainX = training[:, :len(words)]
trainY = training[:, len(words):]

# --- Construction du Modèle de Réseau de Neurones ---
model = tf.keras.Sequential()
model.add(tf.keras.layers.Dense(128, input_shape=(len(trainX[0]),), activation='relu'))
model.add(tf.keras.layers.Dropout(0.5))
model.add(tf.keras.layers.Dense(64, activation='relu'))
model.add(tf.keras.layers.Dropout(0.5))
model.add(tf.keras.layers.Dense(len(trainY[0]), activation='softmax'))

# Optimiseur SGD avec des hyperparamètres spécifiques
sgd = tf.keras.optimizers.SGD(learning_rate=0.01, momentum=0.9, nesterov=True)
model.compile(loss='categorical_crossentropy', optimizer=sgd, metrics=['accuracy'])

# --- Entraînement du Modèle ---
print("\nDébut de l'entraînement du modèle...")
hist = model.fit(np.array(trainX), np.array(trainY), epochs=200, batch_size=5, verbose=1)

# --- Sauvegarde du Modèle ---
model.save('chatbot_model.h5', hist)
print('Entraînement terminé et modèle sauvegardé dans chatbot_model.h5')

# Fermer la connexion à la base de données après l'entraînement (si c'est la seule opération DB dans ce script)
if 'cur' in locals() and cur is not None:
    cur.close()
if 'conn' in locals() and conn is not None:
    conn.close()