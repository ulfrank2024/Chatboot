// Fonction pour récupérer les données de satisfaction depuis le backend
async function fetchSatisfactionData() {
    try {
        // L'URL doit correspondre à ta route FastAPI
        // Ici, nous utilisons l'URL complète pour être explicite, comme dans le code précédent
        const response = await fetch('http://127.0.0.1:5000/satisfaction/data');
        if (!response.ok) {
            throw new Error(`Erreur HTTP: ${response.status}`);
        }
        const data = await response.json();
        return data;
    } catch (error) {
        console.error("Erreur lors de la récupération des données de satisfaction:", error);
        // Retourne null pour indiquer qu'il y a eu un problème
        return null;
    }
}

// Fonction pour créer et mettre à jour le graphique circulaire de satisfaction
async function renderSatisfactionChart() {
    const satisfactionChartCanvas = document.getElementById('satisfactionChart');

    if (satisfactionChartCanvas) {
        const satisfactionData = await fetchSatisfactionData();

        if (satisfactionData) {
            const labels = satisfactionData.map((item) => {
                switch (item.level) {
                    case 1:
                        return "Pas du tout satisfait";
                    case 2:
                        return "Peu satisfait";
                    case 3:
                        return "Neutre";
                    case 4:
                        return "Satisfait";
                    case 5:
                        return "Très satisfait";
                    default:
                        return `Niveau ${item.level}`; // Fallback pour des niveaux inattendus
                }
            });
            const counts = satisfactionData.map((item) => item.count);

            // Couleurs pour le graphique circulaire (plus de couleurs si plus de niveaux)
            // Ces couleurs correspondent à celles que tu avais fournies pour le doughnut chart
            const backgroundColors = [
                "rgba(255, 99, 132, 0.8)", // Rouge (pour niveau 1)
                "rgba(255, 206, 86, 0.8)", // Jaune (pour niveau 2)
                "rgba(54, 162, 235, 0.8)", // Bleu (pour niveau 3)
                "rgba(75, 192, 192, 0.8)", // Vert (pour niveau 4)
                "rgba(153, 102, 255, 0.8)",// Violet (pour niveau 5)
                "rgba(255, 159, 64, 0.8)"  // Orange (fallback si plus de 5 niveaux)
            ];
            const borderColors = [
                "rgba(255, 99, 132, 1)",
                "rgba(255, 206, 86, 1)",
                "rgba(54, 162, 235, 1)",
                "rgba(75, 192, 192, 1)",
                "rgba(153, 102, 255, 1)",
                "rgba(255, 159, 64, 1)"
            ];

            new Chart(satisfactionChartCanvas.getContext('2d'), {
                type: 'doughnut', // Changé en doughnut
                data: {
                    labels: labels,
                    datasets: [{
                        label: 'Répartition de la satisfaction',
                        data: counts,
                        backgroundColor: backgroundColors.slice(0, labels.length), // Utilise autant de couleurs que de labels
                        borderColor: borderColors.slice(0, labels.length),
                        borderWidth: 1
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false, // Permet au graphique de s'adapter à la taille du conteneur
                    plugins: {
                        legend: {
                            position: 'bottom', // Position de la légende en bas
                        },
                        tooltip: {
                            callbacks: {
                                label: function(context) {
                                    let label = context.label || '';
                                    if (context.parsed !== null) {
                                        // Affiche le label et le nombre de réponses
                                        label += `: ${context.parsed} réponses`;
                                    }
                                    return label;
                                }
                            }
                        },
                        // Assure-toi que ChartDataLabels est bien enregistré globalement si utilisé comme plugin
                        datalabels: {
                            color: '#fff', // Couleur du texte des labels
                            formatter: (value, context) => {
                                // Affiche le nombre directement comme tu l'as demandé
                                return value;
                            },
                            font: {
                                weight: 'bold'
                            }
                        }
                    }
                },
                // Le plugin ChartDataLabels doit être enregistré globalement ou passé ici si non global
                // Si tu l'importes via <script src="...chartjs-plugin-datalabels@2.0.0"></script>
                // il est généralement disponible globalement.
                plugins: [ChartDataLabels] // Ajouté comme dans ton code
            });
        } else {
            // Gérer le cas où fetchSatisfactionData retourne null (erreur de récupération)
            const chartContainerParent = satisfactionChartCanvas.parentElement;
            if (chartContainerParent) {
                chartContainerParent.innerHTML = '<p style="color: red; text-align: center;">Impossible de charger les données de satisfaction. Veuillez vérifier la connexion au serveur ou les données.</p>';
            }
        }
    }
};

// Appeler la fonction pour rendre le graphique au chargement de la page
document.addEventListener('DOMContentLoaded', renderSatisfactionChart);
