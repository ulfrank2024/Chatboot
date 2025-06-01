(function () {
    let userId = generateUUID();
    let sessionId = generateUUID();
    let conversationHistory = [];

    function generateUUID() {
        return crypto.randomUUID();
    }

    let reformulationStep = 0;

    async function submitSatisfaction(level, comment) {
        const sessionId = sessionId;
        try {
            const response = await fetch(
                "https://chatboot-bxkb.onrender.com/api/satisfaction", // Endpoint Render
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        session_id: sessionId,
                        level: level,
                        comment: comment,
                    }),
                }
            );

            if (response.ok) {
                const data = await response.json();
                ChatUI.displayBotMessage(data.message);
            } else {
                console.error(
                    "Erreur lors de l'envoi de la satisfaction:",
                    response.status
                );
                ChatUI.displayBotMessage(
                    "Désolé, une erreur est survenue lors de l'envoi de votre évaluation."
                );
            }
        } catch (error) {
            console.error("Erreur lors de l'envoi de la satisfaction:", error);
            ChatUI.displayBotMessage(
                "Désolé, une erreur inattendue est survenue lors de l'envoi de votre évaluation."
            );
        }
    }

    async function sendMessage(message) {
        if (window.ChatUI.conversationState() >= 4) {
            console.log(
                "Interaction désactivée après la satisfaction ou la fin de la conversation."
            );
            return;
        }

        if (window.ChatUI.conversationState() < 3) {
            await window.ChatUI.displayBotMessage(
                "Veuillez d'abord sélectionner votre programme et votre session."
            );
            return;
        }

        window.ChatUI.displayUserMessage(message);
        document.getElementById("user-input").value = "";

        const endConversationKeywords = [
            "quitter",
            "ok",
            "d accord",
            "au revoir",
            "merci",
            "bye",
            "à bientôt",
            "ciao",
            "j'y vais",
            "je dois y aller",
            "fin",
            "c'est tout",
            "j'ai terminé",
            "plus de questions",
            "tout est clair",
            "parfait, merci",
            "bonne journée",
            "bonne soirée",
            "compris",
            "entendu",
            "parfait",
            "c'est noté",
            "ça marche",
            "oui, merci",
            "non, merci",
            "...",
            "pas d'autres questions pour le moment",
            "d'accord",
            "daccord",
            "Ok",
        ];
        if (
            endConversationKeywords.includes(message.toLowerCase().trim()) &&
            window.ChatUI.conversationState() < 4
        ) {
            window.ChatUI.updateConversationState(3.5);

            await window.ChatUI.displayBotMessage(
                "Avez-vous d'autres questions ?"
            );
            return;
        }

        if (window.ChatUI.conversationState() === 3.5) {
            const lowerCaseMessage = message.toLowerCase().trim();
            if (lowerCaseMessage === "non") {
                await window.ChatUI.displayBotMessage(
                    "Au revoir ! N'hésitez pas à revenir."
                );
                window.ChatUI.updateConversationState(4);
                setTimeout(window.ChatUI.displaySatisfactionSurvey, 500);
                return;
            } else if (lowerCaseMessage === "oui") {
                window.ChatUI.updateConversationState(3);
                await window.ChatUI.displayBotMessage(
                    "D'accord, quelle est votre  question ?"
                );
                return;
            } else {
                window.ChatUI.updateConversationState(3);
            }
        }

        try {
            const response = await fetch(
                "https://chatboot-bxkb.onrender.com/chat/",
                {
                    // Endpoint Render
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
                }
            );

            if (response.ok) {
                const data = await response.json();
                const botResponse = data.response;

                if (botResponse) {
                    await window.ChatUI.displayBotMessage(botResponse);
                    reformulationStep = 0;
                } else {
                    reformulationStep++;
                    if (reformulationStep === 1) {
                        await window.ChatUI.displayBotMessage(
                            "Je n'ai pas bien compris. Pourriez-vous reformuler votre question ?"
                        );
                    } else {
                        await window.ChatUI.displayBotMessage(
                            "Je ne suis toujours pas certain de comprendre. Veuillez contacter notre équipe à **coop@votre-etablissement.ca** pour plus d'assistance."
                        );
                        reformulationStep = 0;
                    }
                }
                saveConversationData(message, botResponse);
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
                "https://chatboot-bxkb.onrender.com/api/conversation", // Endpoint Render
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
        return await fetch("https://chatboot-bxkb.onrender.com/chat/", {
            // Endpoint Render
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
            `https://chatboot-bxkb.onrender.com/chat/conversation/${sessionId}`, // Endpoint Render
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

    window.ChatService = {
        sendMessage: sendMessage,
        sendConversationDataToServer: sendConversationDataToServer,
        saveConversationData: saveConversationData,
        sendInitialMessage: sendInitialMessage,
        sendConversationUpdate: sendConversationUpdate,
        resetConversation: resetConversation,
        submitSatisfaction: submitSatisfaction,
    };
})();
