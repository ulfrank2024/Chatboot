document.addEventListener("DOMContentLoaded", function () {
    const chatContainer = document.getElementById("chat-container");
    const coopInfoButton = document.getElementById("coop-info-button");
    const closeChatButton = document.getElementById("close-chat-btn");
    const chatSuggestions = document.getElementById("chat-suggestions");
    const userInput = document.getElementById("user-input");
    const sendBtn = document.getElementById("send-btn");
    const chatBox = document.getElementById("chat-box");

    let conversationState = 0;
    let etudiantProgramme = "";
    let etudiantSessionAnnee = "";
    let satisfaction = null;
    let chatInitialized = false;
    let isTyping = false; // Variable pour suivre si un message est en cours d'écriture
    let initialChatLoaded = false; // Nouvelle variable pour suivre le premier chargement

    if (closeChatButton) {
        closeChatButton.addEventListener("click", function () {
            // Rafraîchir la page
            window.location.reload();
        });
    }

    coopInfoButton.addEventListener("click", function () {
        chatContainer.style.display = "flex";
        coopInfoButton.style.display = "none";
        if (!chatInitialized && !initialChatLoaded) {
            // Vérifier si le chat a été initialement chargé
            startChatSequence(); // Appel de la nouvelle fonction de séquence
            chatInitialized = true;
            initialChatLoaded = true; // Marquer comme initialement chargé
        } else if (!chatInitialized) {
            chatInitialized = true; // Marquer comme initialisé lors des ouvertures suivantes
            // Si vous voulez afficher un message différent lors des réouvertures, faites-le ici.
            // Par exemple: await displayBotMessage("Le chat est de retour !");
        }
    });

    async function startChatSequence() {
        conversationState = 1;
        await displayBotMessage("Bonjour !"); // Étape 1: Bonjour

        await displayBotMessage(
            "Veuillez sélectionner votre programme d'études.",
            displayProgramSelection // Étape 2: Sélection du programme
        );
        window.ChatService.saveConversationData(
            "",
            "Veuillez sélectionner votre programme d'études."
        );
    }

    async function displayBotMessage(message, callback) {
        return new Promise(async (resolve) => {
            const messageDiv = document.createElement("div");
            messageDiv.classList.add("message", "bot");
            const messageContent = document.createElement("p");
            messageDiv.appendChild(messageContent);
            chatBox.appendChild(messageDiv);
            chatBox.scrollTop = chatBox.scrollHeight;

            isTyping = true;
            messageContent.textContent = ""; // Initialiser le contenu

            function typeWriter(element, text, i = 0) {
                if (i < text.length) {
                    element.textContent = text.substring(0, i + 1);
                    setTimeout(() => typeWriter(element, text, i + 1), 20);
                } else {
                    isTyping = false;
                    window.ChatService.saveConversationData("", message);
                    if (callback) {
                        callback();
                    }
                    resolve(); // Résoudre la promesse une fois l'écriture terminée
                }
            }

            typeWriter(messageContent, message);
        });
    }

    function displayUserMessage(message) {
        const messageDiv = document.createElement("div");
        messageDiv.classList.add("message", "user");
        const messageContent = document.createElement("p");
        messageContent.textContent = message;
        messageDiv.appendChild(messageContent);
        chatBox.appendChild(messageDiv);
        chatBox.scrollTop = chatBox.scrollHeight;
        window.ChatService.saveConversationData(message, "");
    }

    function displayProgramSelection() {
        console.log("Le callback de displayBotMessage est exécuté.");
        const programSelectionDiv = document.createElement("div");
        programSelectionDiv.id = "program-selection";
        programSelectionDiv.classList.add("bot-message");
        programSelectionDiv.innerHTML = `
            <div class="program-selection">
                <label><input type="radio" name="programme" value="administration"> École d’administration, d’hôtellerie et de tourisme</label><br>
                <label><input type="radio" name="programme" value="technologies"> Institut des technologies, des arts et de la communication</label><br>
                <label><input type="radio" name="programme" value="metiers"> Institut des métiers spécialisés</label><br>
                <label><input type="radio" name="programme" value="agroalimentaire"> Institut de formation et de recherche agroalimentaire</label><br>
                <label><input type="radio" name="programme" value="sante"> Institut des sciences de la santé et de la vie</label><br>
                <label><input type="radio" name="programme" value="sciences_sociales"> École des sciences sociales et humaines</label><br>
                <label><input type="radio" name="programme" value="services_urgence"> Institut des services d’urgence et juridiques</label><br>
                <label><input type="radio" name="programme" value="formation_continue"> Centre de formation continue et en ligne</label><br>
            </div>
            <div id="programme-error" class="error-message" style="display: none;">Veuillez sélectionner un programme.</div>
            <button id="programme-ok-btn">OK</button>
        `;
        chatBox.appendChild(programSelectionDiv);

        const programmeOkBtnDynamique =
            programSelectionDiv.querySelector("#programme-ok-btn");
        programmeOkBtnDynamique.addEventListener("click", async function () {
            const checkedRadio = programSelectionDiv.querySelector(
                'input[name="programme"]:checked'
            );
            if (checkedRadio) {
                window.ChatUI.updateEtudiantProgramme(
                    checkedRadio.parentNode.textContent.trim()
                );
                programSelectionDiv.style.display = "none";
                window.ChatUI.updateConversationState(2);
                await displayBotMessage(
                    `Programme sélectionné : ${window.ChatUI.etudiantProgramme()}`,
                    displaySessionYearSelection // Étape 3: Sélection de la session et de l'année après le programme
                );
                window.ChatService.saveConversationData(
                    "",
                    `Programme sélectionné : ${window.ChatUI.etudiantProgramme()}`
                );
            } else {
                const programmeError =
                    document.getElementById("programme-error");
                programmeError.style.display = "block";
            }
        });
    }

    function displaySessionYearSelection() {
        const sessionSelectionDiv = document.createElement("div");
        sessionSelectionDiv.id = "session-selection";
        sessionSelectionDiv.classList.add("bot-message");
        sessionSelectionDiv.innerHTML = `
            <div class="session-selection">
                <select id="session-select">
                    <option value="">Sélectionner une session</option>
                    <option value="Hiver">Hiver</option>
                    <option value="Printemps">Printemps</option>
                    <option value="Été">Été</option>
                    <option value="Automne">Automne</option>
                </select>
                <label for="annee">Année :</label>
                <input type="number" id="annee" value="${new Date().getFullYear()}">
            </div>
            <div id="session-error" class="error-message" style="display: none;">Veuillez sélectionner une session et entrer l'année.</div>
            <button id="session-ok-btn">OK</button>
        `;
        chatBox.appendChild(sessionSelectionDiv);

        const sessionOkBtnDynamique =
            sessionSelectionDiv.querySelector("#session-ok-btn");
        sessionOkBtnDynamique.addEventListener("click", async function () {
            const sessionSelectDynamique =
                sessionSelectionDiv.querySelector("#session-select");
            const anneeInputDynamique =
                sessionSelectionDiv.querySelector("#annee");

            if (sessionSelectDynamique.value && anneeInputDynamique.value) {
                window.ChatUI.updateEtudiantSessionAnnee(
                    `${sessionSelectDynamique.value} ${anneeInputDynamique.value}`
                );
                sessionSelectionDiv.style.display = "none";
                window.ChatUI.updateConversationState(3);
                await displayBotMessage(
                    `Session sélectionnée : ${window.ChatUI.etudiantSessionAnnee()}`,
                    async () => {
                        // Étape 4: Demander comment aider après la session
                        await displayBotMessage(
                            "Que puis-je faire pour vous aujourd'hui ?"
                        );
                        window.ChatService.saveConversationData(
                            "",
                            "Que puis-je faire pour vous aujourd'hui ?"
                        );
                        window.ChatService.sendConversationUpdate();
                    }
                );
                window.ChatService.saveConversationData(
                    "",
                    `Session sélectionnée : ${window.ChatUI.etudiantSessionAnnee()}`
                );
            } else {
                const sessionError = document.getElementById("session-error");
                sessionError.style.display = "block";
            }
        });
    }

    async function displaySatisfactionSurvey() {
        const satisfactionDiv = document.createElement("div");
        satisfactionDiv.id = "satisfaction-survey";
        satisfactionDiv.classList.add("bot-message");
        satisfactionDiv.innerHTML = `
            <p>Comment s'est passée votre interaction avec moi ? 😊</p>
            <div class="satisfaction-options">
                <button class="satisfaction-btn" data-rating="1" data-text="Bof 🙁">1 (Bof 🙁)</button>
                <button class="satisfaction-btn" data-rating="2" data-text="Moyen">2</button>
                <button class="satisfaction-btn" data-rating="3" data-text="Bien">3</button>
                <button class="satisfaction-btn" data-rating="4" data-text="Très bien">4</button>
                <button class="satisfaction-btn" data-rating="5" data-text="Super 😄">5 (Super 😄)</button>
            </div>
            <div id="satisfaction-error" class="error-message" style="display: none;">Veuillez sélectionner une note.</div>
        `;
        chatBox.appendChild(satisfactionDiv);
        chatBox.scrollTop = chatBox.scrollHeight;

        const satisfactionButtons =
            satisfactionDiv.querySelectorAll(".satisfaction-btn");
        satisfactionButtons.forEach((button) => {
            button.addEventListener("click", async function () {
                const rating = parseInt(this.getAttribute("data-rating"));
                const text = this.getAttribute("data-text");
                window.ChatUI.updateSatisfaction(rating);
                satisfactionDiv.style.display = "none";

                // Afficher le message de remerciement
                await window.ChatUI.displayBotMessage(
                    `Merci pour votre reponse!`
                );
                await window.ChatService.sendConversationDataToServer();

                // Ajouter un délai avant de fermer le chat
                setTimeout(() => {
                    document.getElementById("chat-container").style.display =
                        "none";
                    document.getElementById("coop-info-button").style.display =
                        "block";
                    window.ChatUI.updateConversationState(0);
                    document.getElementById("user-input").value = "";
                    document.getElementById(
                        "chat-box"
                    ).innerHTML = `<div class="bot-message"><p>Bonjour !</p></div>`;
                    window.ChatUI.updateEtudiantProgramme("");
                    window.ChatUI.updateEtudiantSessionAnnee("");
                    window.ChatUI.updateSatisfaction(null);
                    conversationHistory = [];
                    userId = generateUUID();
                    sessionId = generateUUID();
                }, 50); // Délai de 1.5 secondes (ajustez selon vos préférences)
            });
        });
    }
    // Gestionnaire d'événement pour le bouton d'informations sur la coopération
    coopInfoButton.addEventListener("click", function () {
        chatContainer.style.display = "flex";
        coopInfoButton.style.display = "none";
        if (!chatInitialized && !initialChatLoaded) {
            
            startChatSequence();
            chatInitialized = true;
            initialChatLoaded = true; 
        } else if (!chatInitialized) {
            chatInitialized = true; 
        }
    });

    // Gestionnaire d'événement pour les suggestions de chat
    chatSuggestions.addEventListener("click", function (event) {
        if (event.target.classList.contains("suggestion-button")) {
            userInput.value = event.target.dataset.question;
            window.ChatService.sendMessage(userInput.value);
        }
    });

    // Gestionnaire d'événement pour le bouton d'envoi
    sendBtn.addEventListener("click", () => {
        window.ChatService.sendMessage(userInput.value);
    });

    // Gestionnaire d'événement pour la saisie utilisateur (touche Entrée)
    userInput.addEventListener("keypress", function (event) {
        if (event.key === "Enter") {
            window.ChatService.sendMessage(userInput.value);
        }
    });

    // Export des fonctions et variables nécessaires pour l'autre fichier
    window.ChatUI = {
        displayBotMessage: displayBotMessage,
        displayUserMessage: displayUserMessage,
        displayProgramSelection: displayProgramSelection,
        displaySessionYearSelection: displaySessionYearSelection,
        displaySatisfactionSurvey: displaySatisfactionSurvey,
        conversationState: () => conversationState,
        etudiantProgramme: () => etudiantProgramme,
        etudiantSessionAnnee: () => etudiantSessionAnnee,
        satisfaction: () => satisfaction,
        updateConversationState: (newState) => {
            conversationState = newState;
        },
        updateEtudiantProgramme: (programme) => {
            etudiantProgramme = programme;
        },
        updateEtudiantSessionAnnee: (sessionAnnee) => {
            etudiantSessionAnnee = sessionAnnee;
        },
        updateSatisfaction: (sat) => {
            satisfaction = sat;
        },
        isTyping: () => isTyping, // Exporter l'état de l'écriture
    };

    // Initialiser le chat au chargement initial si le bouton coop-info est caché (chat visible par défaut)
    if (
        coopInfoButton.style.display === "none" &&
        !chatInitialized &&
        !initialChatLoaded
    ) {
        startChatSequence(); // Appel de la nouvelle fonction de séquence
        chatInitialized = true;
        initialChatLoaded = true;
    }
});

function toggleMenu() {
    const nav = document.getElementById("headerNav");
    nav.classList.toggle("responsive");
}
