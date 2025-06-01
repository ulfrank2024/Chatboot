document.addEventListener("DOMContentLoaded", () => {
    const addIntentForm = document.getElementById("add-knowledge-form");
    const formMessageDiv = document.getElementById("form-message");

    addIntentForm.addEventListener("submit", async (event) => {
        event.preventDefault();

        const tag = document.getElementById("tag").value;
        const theme = document.getElementById("theme").value;
        const patterns = document
            .getElementById("patterns")
            .value.split("\n")
            .filter((p) => p.trim() !== "");
        const responses = document
            .getElementById("responses")
            .value.split("\n")
            .filter((r) => r.trim() !== "");

        const data = {
            tag: tag,
            theme: theme,
            patterns: patterns,
            responses: responses,
        };

        try {
            const response = await fetch(
                "https://chatboot-bxkb.onrender.com/admin/ajouter_intention",
                {
                    // Utilisation de l'URL Render
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify(data),
                }
            );

            const result = await response.json();

            if (response.ok) {
                formMessageDiv.className = "success";
                formMessageDiv.textContent =
                    result.message || "Intention ajoutée avec succès!";
                addIntentForm.reset();
            } else {
                formMessageDiv.className = "error";
                formMessageDiv.textContent =
                    result.error || "Erreur lors de l'ajout de l'intention.";
            }
        } catch (error) {
            console.error("Erreur lors de l'envoi du formulaire:", error);
            formMessageDiv.className = "error";
            formMessageDiv.textContent =
                "Erreur réseau lors de l'envoi du formulaire.";
        }
    });
});
