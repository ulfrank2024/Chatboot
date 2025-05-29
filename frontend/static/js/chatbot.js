document.addEventListener("DOMContentLoaded", () => {
    const coopInfoButton = document.getElementById("coop-info-button");
    const chatContainer = document.getElementById("chat-container");
    const chatBox = document.getElementById("chat-box");
    const userInput = document.getElementById("user-input");
    const sendBtn = document.getElementById("send-btn");
    const suggestionButtons = document.querySelectorAll(".suggestion-button");
    const closeChatBtn = document.getElementById("close-chat-btn");

    coopInfoButton.addEventListener("click", () => {
        chatContainer.style.display = "flex";
        coopInfoButton.style.display = "none";
    });

    closeChatBtn.addEventListener("click", () => {
        chatContainer.style.display = "none";
        coopInfoButton.style.display = "block";
    });

    suggestionButtons.forEach((button) => {
        button.addEventListener("click", () => {
            const question = button.getAttribute("data-question");
            userInput.value = question;
            sendMessage(question);
        });
    });

    sendBtn.addEventListener("click", () => {
        const message = userInput.value.trim();
        if (message) {
            sendMessage(message);
            userInput.value = "";
        }
    });

    userInput.addEventListener("keypress", (event) => {
        if (event.key === "Enter") {
            const message = userInput.value.trim();
            if (message) {
                sendMessage(message);
                userInput.value = "";
            }
        }
    });

    function displayMessage(sender, message) {
        const messageDiv = document.createElement("div");
        messageDiv.classList.add("message", sender);
        messageDiv.textContent = message;
        chatBox.appendChild(messageDiv);
        chatBox.scrollTop = chatBox.scrollHeight;
    }

    function sendMessage(message) {
        displayMessage("user", message);

        fetch("/api/chat", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ message: message }),
        })
            .then((response) => response.json())
            .then((data) => {
                const botResponse = data.response;
                displayMessage("bot", botResponse);
            })
            .catch((error) => {
                console.error("Erreur lors de la requête au serveur:", error);
                displayMessage("bot", "Désolé, une erreur est survenue.");
            });
    }
    displayMessage("bot", "Bonjour ! Comment puis-je vous aider ?");
});

function toggleMenu() {
    const nav = document.getElementById("headerNav");
    nav.classList.toggle("responsive");
}
