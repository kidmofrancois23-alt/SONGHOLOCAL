// ===================================================
// MODULE AGENT IA POUR SÔNGHO LOCAL (CORRIGÉ)
// ===================================================

(function() {
    let aiIsThinking = false;

    document.addEventListener("DOMContentLoaded", () => {
        // 1. Injection du panneau de contrôle de l'IA
        const menu = document.getElementById("menu-container") || document.body;
        const aiBox = document.createElement("div");
        aiBox.style = "margin: 15px; padding: 10px; background: rgba(0,0,0,0.3); border-radius: 8px; text-align: center; color: #fff; font-family: sans-serif; border: 1px solid #ff9f43;";
        aiBox.innerHTML = `
            <span style="font-weight:bold; margin-right:10px; color: #ff9f43;">Mode Local :</span>
            <input type="radio" id="local-human" name="local-mode" value="human" checked style="cursor:pointer;">
            <label for="local-human" style="margin-right:15px; cursor:pointer;">👤 2 Joueurs</label>
            <input type="radio" id="local-ai" name="local-mode" value="ai" style="cursor:pointer;">
            <label for="local-ai" style="cursor:pointer; font-weight:bold;">🤖 Jouer contre l'IA</label>
        `;
        
        if (menu.firstChild) {
            menu.insertBefore(aiBox, menu.firstChild);
        } else {
            menu.appendChild(aiBox);
        }

        // Surveillance ultra-rapide du plateau (toutes les 500ms)
        setInterval(playLocalAiCoup, 500);
    });

    function playLocalAiCoup() {
        const aiRadio = document.getElementById("local-ai");
        if (!aiRadio || !aiRadio.checked || aiIsThinking) return;

        // --- DÉTECTION INFAILLIBLE DU TOUR ---
        let isAiTurn = false;

        // Étape A : On vérifie d'abord si ton code d'origine possède une variable globale pour le tour
        if (typeof currentPlayer !== 'undefined' && currentPlayer === 2) {
            isAiTurn = true;
        } else if (typeof tour !== 'undefined' && (tour === 2 || tour === 'J2')) {
            isAiTurn = true;
        } else {
            // Étape B : Si pas de variable globale, on inspecte le texte de ton indicateur
            const turnIndicator = document.getElementById("turn-indicator") || document.querySelector(".turn") || document.body;
            if (turnIndicator) {
                const text = turnIndicator.innerText.toLowerCase();
                // Liste de tous les textes possibles pour le Joueur 2 / Adversaire
                if (text.includes("joueur 2") || text.includes("haut") || text.includes("adversaire") || text.includes("j2") || text.includes("attente")) {
                    isAiTurn = true;
                }
            }
        }

        // Si c'est bien le tour de l'IA (Joueur 2)
        if (isAiTurn) {
            aiIsThinking = true;
            console.log("🤖 L'IA a détecté son tour ! Analyse du plateau...");
            
            setTimeout(() => {
                // Trous de la rangée du haut (0 à 5)
                const topHoles = [0, 1, 2, 3, 4, 5];
                let bestHole = null;
                let maxGraines = -1;

                // Trouver la case du haut non vide avec le plus de graines
                topHoles.forEach(i => {
                    const holeEl = document.getElementById(`hole-${i}`) || document.querySelector(`[data-hole-index="${i}"]`) || document.querySelector(`.hole:nth-child(${i+1})`);
                    if (holeEl) {
                        const graines = parseInt(holeEl.innerText) || 0;
                        if (graines > 0 && graines > maxGraines) {
                            maxGraines = graines;
                            bestHole = holeEl;
                        }
                    }
                });

                // L'IA simule le clic sur ta case d'origine
                if (bestHole) {
                    console.log("🤖 L'IA joue la case :", bestHole.id || bestHole.className);
                    bestHole.click();
                }

                // Petite pause pour laisser ton script d'origine finir son animation/mise à jour
                setTimeout(() => {
                    aiIsThinking = false;
                }, 600);

            }, 1000); // 1 seconde de réflexion pour le réalisme
        }
    }
})();