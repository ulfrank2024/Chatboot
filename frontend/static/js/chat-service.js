(function () {
    let userId = generateUUID();
    let sessionId = generateUUID();
    let conversationHistory = [];

    function generateUUID() {
        return crypto.randomUUID();
    }

    async function sendMessage(message) {
        if (window.ChatUI.conversationState() < 3) {
            await window.ChatUI.displayBotMessage(
                "Veuillez d'abord sélectionner votre programme et votre session."
            );
            return;
        }

        window.ChatUI.displayUserMessage(message);
        document.getElementById("user-input").value = "";

        console.log("sendMessage appelée", message);
        try {
            console.log("sendMessage appelée", message);
            const response = await fetch("http://127.0.0.1:5000/chat/", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    message: message,
                    user_id: userId,
                    session_id: sessionId,
                    etudiant_programme: window.ChatUI.etudiantProgramme(),
                    etudiant_session: window.ChatUI.etudiantSessionAnnee(),
                }),
            });

            if (response.ok) {
                const data = await response.json();
                const botResponse = data.response;
                await window.ChatUI.displayBotMessage(botResponse);
                saveConversationData(message, botResponse);

                if (
                    botResponse &&
                    botResponse.toLowerCase().includes("fin de conversation")
                ) {
                    window.ChatUI.updateConversationState(4);
                    setTimeout(window.ChatUI.displaySatisfactionSurvey, 500);
                }
            } else {
                console.error(
                    "Erreur lors de la requête au serveur:",
                    response.status
                );
                await window.ChatUI.displayBotMessage(
                    "Désolé, une erreur est survenue lors de la communication avec le serveur."
                );
                saveConversationData(
                    message,
                    "Désolé, une erreur est survenue lors de la communication avec le serveur."
                );
            }
        } catch (error) {
            console.error("Erreur lors de la requête au serveur:", error);
            await window.ChatUI.displayBotMessage(
                "Désolé, une erreur inattendue est survenue."
            );
            saveConversationData(
                message,
                "Désolé, une erreur inattendue est survenue."
            );
        }
    }

    async function sendConversationDataToServer() {
        const conversationData = {
            user_id: userId,
            session_id: sessionId,
            etudiant_programme: window.ChatUI.etudiantProgramme(),
            etudiant_session: window.ChatUI.etudiantSessionAnnee(),
            satisfaction: window.ChatUI.satisfaction(),
            conversation_history: conversationHistory,
        };

        console.log(
            "Données de conversation à envoyer :",
            JSON.stringify(conversationData)
        );

        try {
            const response = await fetch(
                "http://127.0.0.1:5000/api/conversation",
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify(conversationData),
                }
            );

            if (response.ok) {
                console.log(
                    "Données de conversation envoyées avec succès au serveur."
                );
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
                }, 2000);
            } else {
                console.error(
                    "Erreur lors de l'envoi des données de conversation au serveur:",
                    response.status
                );
            }
        } catch (error) {
            console.error(
                "Erreur lors de l'envoi des données de conversation au serveur:",
                error
            );
        }
    }

    function saveConversationData(userMessage, botMessage) {
        if (userMessage) {
            conversationHistory.push({ sender: "user", message: userMessage });
        }
        if (botMessage) {
            conversationHistory.push({ sender: "bot", message: botMessage });
        }
    }

    async function sendInitialMessage(message) {
        return await fetch("http://127.0.0.1:5000/chat/", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                message: message,
                user_id: userId,
                session_id: sessionId,
            }),
        });
    }

    async function sendConversationUpdate() {
        return await fetch(
            `http://127.0.0.1:5000/chat/conversation/${sessionId}`,
            {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    etudiant_programme: window.ChatUI.etudiantProgramme(),
                    etudiant_session: window.ChatUI.etudiantSessionAnnee(),
                }),
            }
        );
    }
    function resetConversation() {
        conversationHistory = [];
        userId = generateUUID();
        sessionId = generateUUID();
    }
    // Export des fonctions pour être utilisées ailleurs si nécessaire
    window.ChatService = {
        sendMessage: sendMessage,
        sendConversationDataToServer: sendConversationDataToServer,
        saveConversationData: saveConversationData,
        sendInitialMessage: sendInitialMessage,
        sendConversationUpdate: sendConversationUpdate,
        resetConversation: resetConversation,
    };
})();
