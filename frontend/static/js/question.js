// Fonction pour récupérer les questions sans réponse depuis le backend
async function fetchUnansweredQuestions() {
    try {
        // L'URL doit correspondre à ta route FastAPI pour les questions sans réponse
        // Utilisation de l'URL complète pour éviter les problèmes de chemin relatif
        const response = await fetch(
            "http://127.0.0.1:5000/questions/unanswered"
        );
        if (!response.ok) {
            // Gérer les erreurs HTTP (ex: 404, 500)
            throw new Error(`Erreur HTTP! statut: ${response.status}`);
        }
        const data = await response.json();
        return data;
    } catch (error) {
        console.error(
            "Erreur lors de la récupération des questions sans réponse:",
            error
        );
        // Retourne un tableau vide en cas d'erreur pour que le rendu du tableau puisse gérer l'absence de données
        return [];
    }
}

// Fonction pour créer et mettre à jour le tableau des questions sans réponse
async function renderUnansweredQuestionsTable() {
    const unansweredQuestions = await fetchUnansweredQuestions();
    const tableBody = document.querySelector("#questions table tbody");

    // Assurez-vous que le corps du tableau existe avant de le manipuler
    if (!tableBody) {
        console.error("Élément #questions table tbody non trouvé.");
        return;
    }

    // Effacer le contenu actuel du tableau
    tableBody.innerHTML = "";

    if (unansweredQuestions && unansweredQuestions.length > 0) {
        unansweredQuestions.forEach((question) => {
            const row = tableBody.insertRow();
            const programCell = row.insertCell();
            const sessionCell = row.insertCell();
            const questionCell = row.insertCell();

            // Utiliser l'opérateur OR pour afficher 'N/A' si la valeur est null ou undefined
            programCell.textContent = question.programme || "N/A";
            sessionCell.textContent = question.session || "N/A";
            questionCell.textContent = question.question || "N/A";
        });
    } else {
        // Afficher un message si aucune question n'est trouvée
        const row = tableBody.insertRow();
        const emptyCell = row.insertCell();
        emptyCell.colSpan = 3; // Étendre la cellule sur 3 colonnes
        emptyCell.style.textAlign = "center"; // Centrer le texte
        emptyCell.style.padding = "20px"; // Ajouter un peu de padding
        emptyCell.textContent =
            "Aucune question sans réponse détectée pour le moment.";
    }
}

// Appeler la fonction pour rendre le tableau au chargement de la page
document.addEventListener("DOMContentLoaded", renderUnansweredQuestionsTable);
