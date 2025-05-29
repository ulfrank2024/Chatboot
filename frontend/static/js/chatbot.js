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
        messageDiv.classList.add("message");
        messageDiv.classList.add(sender);

        const messageContent = document.createElement("p");
        messageDiv.appendChild(messageContent);
        chatBox.appendChild(messageDiv);
        chatBox.scrollTop = chatBox.scrollHeight;

        if (sender === "bot") {
            typeWriter(messageContent, message);
        } else {
            messageContent.textContent = message;
        }
    }

    function typeWriter(element, text, i = 0) {
        if (i < text.length) {
            element.textContent += text.charAt(i);
            setTimeout(() => typeWriter(element, text, i + 1), 30); // Ajuste la vitesse ici (30ms par caractère)
        }
    }

    function sendMessage(message) {
        displayMessage("user", message);

        fetch("http://127.0.0.1:5000/api/chat", {
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
