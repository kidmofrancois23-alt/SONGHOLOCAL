// Configuration de la mémoire de jeu 
let board = Array(14).fill(5); 
let currentPlayer = 2; 
let scores = { "1": 0, "2": 0 };
let currentTour = 1;
let isGameOver = false;
let logs = ["La partie a été réinitialisée. Bonne chance aux deux joueurs !"];
let maxCaptureRecord = 0; // Stocke la plus grande extraction du match

const holesElements = document.querySelectorAll('.hole');
const turnIndicator = document.getElementById('turn-indicator');
const resetBtn = document.getElementById('reset-btn');
const statusBadge = document.getElementById('game-status');
const tourCountSpan = document.getElementById('tour-count');
const logsContainer = document.getElementById('game-logs');
const notificationElement = document.getElementById('notification');
const startPlayerSelect = document.getElementById('start-player-select');
const revanchBtn = document.getElementById('revanch-btn');

if (resetBtn) resetBtn.addEventListener('click', resetLocalGame);
if (revanchBtn) {
    revanchBtn.addEventListener('click', () => {
        document.getElementById('victory-modal').style.display = "none";
        resetLocalGame();
        document.getElementById('board').style.pointerEvents = "auto";
    });
}

if (startPlayerSelect) {
    startPlayerSelect.addEventListener('change', () => {
        if (currentTour === 1 && scores["1"] === 0 && scores["2"] === 0) {
            determineStartingPlayer();
            updateDisplay();
        }
    });
}

function determineStartingPlayer() {
    if (!startPlayerSelect) return;
    const choice = startPlayerSelect.value;
    if (choice === "random") {
        currentPlayer = Math.random() < 0.5 ? 1 : 2;
        logs = [`🎲 Le destin a choisi : Joueur ${currentPlayer} commence la partie !`];
    } else {
        currentPlayer = parseInt(choice);
        logs = [`La partie commence. Joueur ${currentPlayer} au coup !`];
    }
}

// ==========================================
// MOTEUR AUDIO (Synthèse sonore Web Audio API)
// ==========================================
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

function playSound(type) {
    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
    
    const osc = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    osc.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    if (type === 'sow') { 
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(180, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(80, audioCtx.currentTime + 0.08);
        gainNode.gain.setValueAtTime(0.4, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.08);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.08);
    } 
    else if (type === 'capture') { 
        osc.type = 'sine';
        osc.frequency.setValueAtTime(523.25, audioCtx.currentTime); 
        osc.frequency.setValueAtTime(659.25, audioCtx.currentTime + 0.1); 
        gainNode.gain.setValueAtTime(0.3, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.3);
    } 
    else if (type === 'error') { 
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(120, audioCtx.currentTime);
        gainNode.gain.setValueAtTime(0.2, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.2);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.2);
    }
    else if (type === 'win') { 
        const notes = [523.25, 659.25, 783.99, 1046.50]; 
        notes.forEach((freq, index) => {
            const time = audioCtx.currentTime + (index * 0.12);
            const individualOsc = audioCtx.createOscillator();
            const individualGain = audioCtx.createGain();
            individualOsc.type = 'sine';
            individualOsc.frequency.setValueAtTime(freq, time);
            individualGain.gain.setValueAtTime(0.3, time);
            individualGain.gain.exponentialRampToValueAtTime(0.01, time + 0.25);
            individualOsc.connect(individualGain);
            individualGain.connect(audioCtx.destination);
            individualOsc.start(time);
            individualOsc.stop(time + 0.25);
        });
    }
}

// ==========================================
// GESTION DU LOCALSTORAGE (Sauvegarde)
// ==========================================
function saveGame() {
    const gameState = {
        board: board,
        currentPlayer: currentPlayer,
        scores: scores,
        currentTour: currentTour,
        isGameOver: isGameOver,
        logs: logs,
        maxCaptureRecord: maxCaptureRecord,
        selectDisabled: startPlayerSelect ? startPlayerSelect.disabled : false,
        selectValue: startPlayerSelect ? startPlayerSelect.value : "2"
    };
    localStorage.setItem('songho_save', JSON.stringify(gameState));
}

function loadGame() {
    try {
        const savedState = localStorage.getItem('songho_save');
        if (savedState) {
            const state = JSON.parse(savedState);
            const totalSeeds = state.board.reduce((a, b) => a + b, 0);
            if (totalSeeds > 0) {
                board = state.board;
                currentPlayer = state.currentPlayer;
                scores = state.scores;
                currentTour = state.currentTour;
                isGameOver = state.isGameOver;
                logs = state.logs;
                maxCaptureRecord = state.maxCaptureRecord || 0;
                if (startPlayerSelect) {
                    startPlayerSelect.value = state.selectValue || "2";
                    startPlayerSelect.disabled = state.selectDisabled || false;
                }
                return true;
            }
        }
    } catch (e) {
        console.error("Erreur de lecture de la sauvegarde", e);
    }
    return false;
}

let notificationTimeout;
function showNotification(message) {
    clearTimeout(notificationTimeout);
    if (notificationElement) {
        notificationElement.innerText = message;
        notificationElement.style.display = "block";
        playSound('error'); 
        notificationTimeout = setTimeout(() => {
            notificationElement.style.display = "none";
        }, 3500);
    }
}

// Rendu graphique réaliste des graines physiques
function generateVisualSeeds(holeElement, count) {
    holeElement.innerHTML = ''; 
    
    const countElement = document.createElement('div');
    countElement.className = 'hole-count';
    countElement.innerText = count;
    holeElement.appendChild(countElement);

    for (let i = 0; i < count; i++) {
        const seed = document.createElement('div');
        seed.className = 'seed';
        
        const angle = Math.random() * Math.PI * 2;
        const radius = Math.random() * 22; 
        
        const left = 50 + Math.cos(angle) * radius;
        const top = 50 + Math.sin(angle) * radius;

        seed.style.left = `calc(${left}% - 5px)`;
        seed.style.top = `calc(${top}% - 5px)`;
        
        const randomBright = 90 + Math.floor(Math.random() * 25);
        seed.style.filter = `brightness(${randomBright}%)`;

        holeElement.appendChild(seed);
    }
}

function updateDisplay() {
    holesElements.forEach(hole => {
        const index = parseInt(hole.getAttribute('data-index'));
        if (!isNaN(index)) {
            generateVisualSeeds(hole, board[index]);
        }
    });
    
    if (document.getElementById('score-j1')) document.getElementById('score-j1').innerText = scores["1"];
    if (document.getElementById('score-j2')) document.getElementById('score-j2').innerText = scores["2"];
    if (tourCountSpan) tourCountSpan.innerText = currentTour;

    if (logsContainer) {
        logsContainer.innerHTML = logs.map(log => {
            let cl = "system";
            if(log.includes("Joueur 1")) cl = "j1";
            if(log.includes("Joueur 2")) cl = "j2";
            return `<div class="log-entry ${cl}">${log}</div>`;
        }).join('');
        logsContainer.scrollTop = logsContainer.scrollHeight;
    }

    if (isGameOver) {
        if (statusBadge) { statusBadge.innerText = "Terminé"; statusBadge.className = "badge over-badge"; }
        if (turnIndicator) { turnIndicator.innerText = "Partie terminée !"; turnIndicator.style.color = "red"; }
        if (startPlayerSelect) startPlayerSelect.disabled = true;
        return;
    }

    if (statusBadge) { statusBadge.innerText = "En cours"; statusBadge.className = "badge progress-badge"; }

    if (turnIndicator) {
        if (currentPlayer === 1) {
            turnIndicator.innerText = "C'est au tour du JOUEUR 1 (Bas) !";
            turnIndicator.style.color = "#4CAF50";
        } else {
            turnIndicator.innerText = "C'est au tour du JOUEUR 2 (Haut) !";
            turnIndicator.style.color = "#2196F3";
        }
    }
}

function moveNutritif(index, joueur) {
    let tempBoard = [...board];
    let seeds = tempBoard[index];
    tempBoard[index] = 0;
    let curr = index;
    while (seeds > 0) {
        curr = (curr + 1) % 14;
        if (curr === index) continue;
        tempBoard[curr]++;
        seeds--;
    }
    let adversaire = joueur === 1 ? 2 : 1;
    let totalAdversaire = 0;
    let start = (adversaire === 1) ? 0 : 7;
    for (let i = start; i < start + 7; i++) {
        totalAdversaire += tempBoard[i];
    }
    return totalAdversaire > 0;
}

holesElements.forEach(hole => {
    hole.addEventListener('click', async (e) => {
        const targetHole = e.target.closest('.hole');
        if (!targetHole || isGameOver) return;

        const selectedIndex = parseInt(targetHole.getAttribute('data-index'));
        
        if ((currentPlayer === 1 && (selectedIndex < 0 || selectedIndex > 6)) ||
            (currentPlayer === 2 && (selectedIndex < 7 || selectedIndex > 13))) {
            showNotification(`🚫 Action interdite : Joueur ${currentPlayer}, ce n'est pas votre camp !`);
            return;
        }
        
        if (board[selectedIndex] === 0) {
            showNotification("🕳️ Case vide ! Sélectionnez un trou contenant des graines.");
            return;
        }

        let adversaire = currentPlayer === 1 ? 2 : 1;
        let startAdversaire = (adversaire === 1) ? 0 : 7;
        let totalAdversaire = 0;
        for (let i = startAdversaire; i < startAdversaire + 7; i++) totalAdversaire += board[i];

        if (totalAdversaire === 0) {
            if (!moveNutritif(selectedIndex, currentPlayer)) {
                let peutNourrir = false;
                let startCamp = (currentPlayer === 1) ? 0 : 7;
                for (let i = startCamp; i < startCamp + 7; i++) {
                    if (board[i] > 0 && moveNutritif(i, currentPlayer)) {
                        peutNourrir = true; break;
                    }
                }
                if (peutNourrir) {
                    showNotification("🌾 Règle de Famine : Vous devez obligatoirement nourrir votre adversaire !");
                    return;
                }
            }
        }

        if (startPlayerSelect) startPlayerSelect.disabled = true;
        
        // Bloque le plateau pendant l'animation asynchrone
        document.getElementById('board').style.pointerEvents = "none";
        await executeMove(selectedIndex);
        document.getElementById('board').style.pointerEvents = "auto";
    });
});

async function executeMove(startIndex) {
    let seeds = board[startIndex];
    board[startIndex] = 0;
    let currentIndex = startIndex;

    // ANIMATION DU SEMIS PAS-À-PAS (TRAIL EFFECT)
    while (seeds > 0) {
        currentIndex = (currentIndex + 1) % 14;
        if (currentIndex === startIndex) continue;
        
        board[currentIndex]++;
        seeds--;

        const holeEl = document.querySelector(`.hole[data-index="${currentIndex}"]`);
        if (holeEl) holeEl.classList.add('sowing-active');
        
        playSound('sow');
        updateDisplay(); 

        await new Promise(resolve => setTimeout(resolve, 90)); // Cadence de 90ms entre chaque trou
        if (holeEl) holeEl.classList.remove('sowing-active');
    }

    let captured = 0;
    const isJ1Hole = (currentIndex >= 0 && currentIndex <= 6);
    const isOwnHole = (currentPlayer === 1 && isJ1Hole) || (currentPlayer === 2 && !isJ1Hole);

    if (!isOwnHole) {
        let checkIndex = currentIndex;
        let tempBoardBeforeCapture = [...board]; 
        let localCaptured = 0;

        while (((currentPlayer === 1 && (checkIndex >= 7 && checkIndex <= 13)) || (currentPlayer === 2 && (checkIndex >= 0 && checkIndex <= 6))) && 
               (board[checkIndex] === 2 || board[checkIndex] === 3 || board[checkIndex] === 4)) {
            localCaptured += board[checkIndex];
            board[checkIndex] = 0;
            checkIndex = (checkIndex - 1 + 14) % 14; 
        }

        let adversaire = currentPlayer === 1 ? 2 : 1;
        let startAdversaire = (adversaire === 1) ? 0 : 7;
        let totalAdversaireApresCapture = 0;
        for (let i = startAdversaire; i < startAdversaire + 7; i++) totalAdversaireApresCapture += board[i];

        if (totalAdversaireApresCapture === 0 && localCaptured > 0) {
            board = tempBoardBeforeCapture;
            logs.push(`⚠️ Tour ${currentTour} : Joueur ${currentPlayer} a joué la case ${startIndex}. Capture annulée car elle affamait l'adversaire.`);
        } else {
            captured = localCaptured;
            if (captured > maxCaptureRecord) maxCaptureRecord = captured; // Mise à jour du record
            scores[currentPlayer] += captured;
            let logMessage = `Tour ${currentTour} : Joueur ${currentPlayer} a joué la case ${startIndex}.`;
            if (captured > 0) {
                logMessage += ` Extraction réussie de ${captured} pions !`;
                playSound('capture'); 
            }
            logs.push(logMessage);
        }
    } else {
        logs.push(`Tour ${currentTour} : Joueur ${currentPlayer} a joué la case ${startIndex}.`);
    }

    let nextPlayer = currentPlayer === 1 ? 2 : 1;
    let j1Total = board.slice(0, 7).reduce((a, b) => a + b, 0);
    let j2Total = board.slice(7, 14).reduce((a, b) => a + b, 0);

    if (nextPlayer === 1 && j1Total === 0) {
        isGameOver = true;
        scores["2"] += j2Total;
        board.fill(0, 7, 14);
        logs.push("❌ FIN : Le Joueur 1 ne peut plus être nourri. Le Joueur 2 récupère le reste.");
    } else if (nextPlayer === 2 && j2Total === 0) {
        isGameOver = true;
        scores["1"] += j1Total;
        board.fill(0, 0, 7);
        logs.push("❌ FIN : Le Joueur 2 ne peut plus être nourri. Le Joueur 1 récupère le reste.");
    }

    if (scores["1"] > 35 || scores["2"] > 35) {
        isGameOver = true;
        let gagnant = scores["1"] > 35 ? "Joueur 1" : "Joueur 2";
        logs.push(`🏆 VICTOIRE : Le ${gagnant} a capturé la majorité des pions !`);
    }

    if (isGameOver) {
        showVictoryModal();
    } else {
        if (currentPlayer === 1) currentTour++;
        currentPlayer = nextPlayer;
    }
    
    saveGame(); 
    updateDisplay();
}

function showVictoryModal() {
    const modal = document.getElementById('victory-modal');
    const winnerName = document.getElementById('winner-name');
    if (!modal) return;

    let gagnant = "JOUEUR 2 (Haut)";
    let scoreVainqueur = scores["2"];
    if (scores["1"] > scores["2"]) {
        gagnant = "JOUEUR 1 (Bas)";
        scoreVainqueur = scores["1"];
    } else if (scores["1"] === scores["2"]) {
        gagnant = "ÉGALITÉ PARFAITE 🤝";
    }

    winnerName.innerText = (scores["1"] === scores["2"]) ? gagnant : `🏆 ${gagnant} GAGNE !`;
    document.getElementById('stat-tours').innerText = currentTour;
    document.getElementById('stat-score').innerText = scoreVainqueur;
    document.getElementById('stat-record').innerText = maxCaptureRecord;
    
    modal.style.display = "flex";
    playSound('win');
}

function resetLocalGame() {
    board = Array(14).fill(5);
    scores = { "1": 0, "2": 0 };
    currentTour = 1;
    isGameOver = false;
    maxCaptureRecord = 0;
    if (startPlayerSelect) startPlayerSelect.disabled = false;
    
    determineStartingPlayer(); 
    localStorage.removeItem('songho_save'); 
    updateDisplay();
}

// Lancement initial sécurisé
if (!loadGame()) {
    resetLocalGame(); 
} else {
    updateDisplay();
}
