// Fonction pour récupérer les questions sans réponse depuis le backend
async function fetchUnansweredQuestions() {
    try {
        const response = await fetch(
            "http://127.0.0.1:5000/questions/unanswered"
        );
        if (!response.ok) {
            throw new Error(`Erreur HTTP! statut: ${response.status}`);
        }
        const data = await response.json();
        return data;
    } catch (error) {
        console.error(
            "Erreur lors de la récupération des questions sans réponse:",
            error
        );
        return [];
    }
}

// Fonction pour créer et mettre à jour le tableau des questions sans réponse
async function renderUnansweredQuestionsTable() {
    const unansweredQuestions = await fetchUnansweredQuestions();
    const tableBody = document.querySelector("#questions table tbody");

    if (!tableBody) {
        console.error("Élément #questions table tbody non trouvé.");
        return;
    }

    tableBody.innerHTML = "";

    if (unansweredQuestions && unansweredQuestions.length > 0) {
        unansweredQuestions.forEach((question) => {
            const row = tableBody.insertRow();
            const programCell = row.insertCell();
            const sessionCell = row.insertCell();
            const questionCell = row.insertCell();
            const timestampCell = row.insertCell(); // Ajouter une cellule pour le timestamp

            programCell.textContent = question.programme || "N/A";
            sessionCell.textContent = question.session || "N/A";
            questionCell.textContent = question.question || "N/A";
            timestampCell.textContent = question.timestamp || "N/A"; // Afficher le timestamp
        });
    } else {
        const row = tableBody.insertRow();
        const emptyCell = row.insertCell();
        emptyCell.colSpan = 4; // Étendre sur 4 colonnes maintenant (question, programme, session, timestamp)
        emptyCell.style.textAlign = "center";
        emptyCell.style.padding = "20px";
        emptyCell.textContent =
            "Aucune question sans réponse détectée pour le moment.";
    }
}

document.addEventListener("DOMContentLoaded", renderUnansweredQuestionsTable);
