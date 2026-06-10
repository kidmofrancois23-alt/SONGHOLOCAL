// Configuration globale 
let board = Array(14).fill(5); 
let currentPlayer = 2; 
let scores = { "1": 0, "2": 0 };
let currentTour = 1;
let isGameOver = false;
let logs = ["La partie a été réinitialisée. Bonne chance aux deux joueurs !"];
let maxCaptureRecord = 0; 
let isGameActive = false;

// Variables pour le Quantum de Temps et le système de Pause
let quantumDuration = 15; 
let timeLeft = 15;
let timerInterval = null;
let isPaused = false; // Permet de suspendre les actions et le décompte

const holesElements = document.querySelectorAll('.hole');
const turnIndicator = document.getElementById('turn-indicator');
const resetBtn = document.getElementById('reset-btn');
const statusBadge = document.getElementById('game-status');
const tourCountSpan = document.getElementById('tour-count');
const logsContainer = document.getElementById('game-logs');
const notificationElement = document.getElementById('notification');
const startPlayerSelect = document.getElementById('start-player-select');
const revanchBtn = document.getElementById('revanch-btn');

// Éléments de l'interface Menu/Règles/Pause
const mainMenu = document.getElementById('main-menu');
const gameContainer = document.getElementById('game-container');
const startGameBtn = document.getElementById('start-game-btn');
const quitGameBtn = document.getElementById('quit-game-btn');
const pauseGameBtn = document.getElementById('pause-game-btn');
const openRulesBtn = document.getElementById('open-rules-btn');
const closeRulesBtn = document.getElementById('close-rules-btn');
const rulesModal = document.getElementById('rules-modal');

// Éléments du Chronomètre
const quantumInput = document.getElementById('quantum-input');
const timerCounter = document.getElementById('timer-counter');
const timerBarFill = document.getElementById('timer-bar-fill');

// ÉCOUTEURS D'ÉVÉNEMENTS DES BOUTONS INTERFACES
if (startGameBtn) {
    startGameBtn.addEventListener('click', () => {
        let userTime = parseInt(quantumInput.value) || 15;
        if (userTime < 5) userTime = 5;
        if (userTime > 60) userTime = 60;
        quantumInput.value = userTime; 
        quantumDuration = userTime;

        isGameActive = true;
        isPaused = false;
        mainMenu.style.display = "none";
        gameContainer.style.display = "block";
        saveMenuState();
        resetLocalGame(); 
    });
}

if (quitGameBtn) {
    quitGameBtn.addEventListener('click', () => {
        if (confirm("Êtes-vous sûr de vouloir abandonner la partie en cours ?")) {
            stopTimer();
            isGameActive = false;
            isPaused = false;
            mainMenu.style.display = "block";
            gameContainer.style.display = "none";
            localStorage.removeItem('songho_save');
            saveMenuState();
        }
    });
}

// GESTION DU BOUTON PAUSE
if (pauseGameBtn) {
    pauseGameBtn.addEventListener('click', () => {
        if (isGameOver || !isGameActive) return;

        isPaused = !isPaused;

        if (isPaused) {
            pauseGameBtn.innerText = "Reprendre ▶️";
            pauseGameBtn.style.backgroundColor = "#27ae60";
            if (timerBarFill) timerBarFill.style.backgroundColor = "#7f8c8d"; // Devient gris en pause
            logs.push(`⏸️ Partie mise en pause par les joueurs.`);
        } else {
            pauseGameBtn.innerText = "Pause ⏸️";
            pauseGameBtn.style.backgroundColor = "#f39c12";
            if (timerBarFill) timerBarFill.style.backgroundColor = timeLeft <= 4 ? "#d32f2f" : "#4CAF50";
            logs.push(`▶️ Reprise de la partie !`);
        }
        updateDisplay();
        saveGame();
    });
}

if (openRulesBtn) openRulesBtn.addEventListener('click', () => rulesModal.style.display = "flex");
if (closeRulesBtn) closeRulesBtn.addEventListener('click', () => rulesModal.style.display = "none");

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
            startTimer(); 
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
// MOTEUR DU CHRONOMÈTRE (QUANTUM DE TEMPS)
// ==========================================
function startTimer() {
    stopTimer(); 
    if (isGameOver) return;

    timeLeft = quantumDuration;
    updateTimerUI();

    timerInterval = setInterval(() => {
        if (isPaused) return; // Ne fait rien s'il y a pause active

        timeLeft--;
        updateTimerUI();

        if (timeLeft <= 0) {
            stopTimer();
            handleTimeOut();
        }
    }, 1000);
}

function stopTimer() {
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
}

function updateTimerUI() {
    if (timerCounter) timerCounter.innerText = timeLeft;
    if (timerBarFill) {
        const percentage = (timeLeft / quantumDuration) * 100;
        timerBarFill.style.width = `${percentage}%`;
        
        if (isPaused) {
            timerBarFill.style.backgroundColor = "#7f8c8d";
        } else {
            timerBarFill.style.backgroundColor = timeLeft <= 4 ? "#d32f2f" : "#4CAF50";
        }
    }
}

function handleTimeOut() {
    playSound('error');
    logs.push(`⏱️ Tour ${currentTour} : Temps écoulé pour le Joueur ${currentPlayer} ! Son tour est sauté.`);
    
    let nextPlayer = currentPlayer === 1 ? 2 : 1;
    if (currentPlayer === 1) currentTour++;
    currentPlayer = nextPlayer;

    saveGame();
    updateDisplay();
    startTimer(); 
}

// ==========================================
// MOTEUR AUDIO (Web Audio API)
// ==========================================
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

function playSound(type) {
    if (audioCtx.state === 'suspended') audioCtx.resume();
    
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
        osc.start(); osc.stop(audioCtx.currentTime + 0.08);
    } 
    else if (type === 'capture') { 
        osc.type = 'sine';
        osc.frequency.setValueAtTime(523.25, audioCtx.currentTime); 
        osc.frequency.setValueAtTime(659.25, audioCtx.currentTime + 0.1); 
        gainNode.gain.setValueAtTime(0.3, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
        osc.start(); osc.stop(audioCtx.currentTime + 0.3);
    } 
    else if (type === 'error') { 
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(120, audioCtx.currentTime);
        gainNode.gain.setValueAtTime(0.2, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.2);
        osc.start(); osc.stop(audioCtx.currentTime + 0.2);
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
            individualOsc.start(time); individualOsc.stop(time + 0.25);
        });
    }
}

// ==========================================
// GESTION DE LA SAUVEGARDE
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
        selectValue: startPlayerSelect ? startPlayerSelect.value : "2",
        isGameActive: isGameActive,
        quantumDuration: quantumDuration,
        isPaused: isPaused
    };
    localStorage.setItem('songho_save', JSON.stringify(gameState));
}

function saveMenuState() {
    let savedState = localStorage.getItem('songho_save');
    if (savedState) {
        let state = JSON.parse(savedState);
        state.isGameActive = isGameActive;
        state.isPaused = isPaused;
        localStorage.setItem('songho_save', JSON.stringify(state));
    } else {
        saveGame();
    }
}

function loadGame() {
    try {
        const savedState = localStorage.getItem('songho_save');
        if (savedState) {
            const state = JSON.parse(savedState);
            board = state.board;
            currentPlayer = state.currentPlayer;
            scores = state.scores;
            currentTour = state.currentTour;
            isGameOver = state.isGameOver;
            logs = state.logs;
            maxCaptureRecord = state.maxCaptureRecord || 0;
            isGameActive = state.isGameActive !== undefined ? state.isGameActive : false;
            quantumDuration = state.quantumDuration || 15;
            quantumInput.value = quantumDuration;
            isPaused = state.isPaused || false;
            
            if (startPlayerSelect) {
                startPlayerSelect.value = state.selectValue || "2";
                startPlayerSelect.disabled = state.selectDisabled || false;
            }

            if (isGameActive) {
                mainMenu.style.display = "none";
                gameContainer.style.display = "block";
                
                if (isPaused && pauseGameBtn) {
                    pauseGameBtn.innerText = "Reprendre ▶️";
                    pauseGameBtn.style.backgroundColor = "#27ae60";
                }
                startTimer(); 
            } else {
                mainMenu.style.display = "block";
                gameContainer.style.display = "none";
            }
            return true;
        }
    } catch (e) {
        console.error("Erreur de sauvegarde", e);
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
        notificationTimeout = setTimeout(() => { notificationElement.style.display = "none"; }, 3500);
    }
}

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
        if (!isNaN(index)) generateVisualSeeds(hole, board[index]);
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
    for (let i = start; i < start + 7; i++) totalAdversaire += tempBoard[i];
    return totalAdversaire > 0;
}

holesElements.forEach(hole => {
    hole.addEventListener('click', async (e) => {
        if (isPaused) {
            showNotification("⏸️ Le jeu est en pause. Cliquez sur 'Reprendre' pour continuer !");
            return;
        }

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
        
        stopTimer(); 
        document.getElementById('board').style.pointerEvents = "none";
        await executeMove(selectedIndex);
        document.getElementById('board').style.pointerEvents = "auto";
    });
});

async function executeMove(startIndex) {
    let seeds = board[startIndex];
    board[startIndex] = 0;
    let currentIndex = startIndex;

    while (seeds > 0) {
        currentIndex = (currentIndex + 1) % 14;
        if (currentIndex === startIndex) continue;
        
        board[currentIndex]++;
        seeds--;

        const holeEl = document.querySelector(`.hole[data-index="${currentIndex}"]`);
        if (holeEl) holeEl.classList.add('sowing-active');
        
        playSound('sow');
        updateDisplay(); 

        await new Promise(resolve => setTimeout(resolve, 90)); 
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
            logs.push(`⚠️ Tour ${currentTour} : Capture annulée par le système (Famine imposée).`);
        } else {
            captured = localCaptured;
            if (captured > maxCaptureRecord) maxCaptureRecord = captured; 
            scores[currentPlayer] += captured;
            let logMessage = `Tour ${currentTour} : Joueur ${currentPlayer} a joué la case ${startIndex}.`;
            if (captured > 0) {
                logMessage += ` Extraction de ${captured} pions !`;
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
        isGameOver = true; scores["2"] += j2Total; board.fill(0, 7, 14);
        logs.push("❌ FIN : Le Joueur 1 est affamé. Joueur 2 ramasse le reste.");
    } else if (nextPlayer === 2 && j2Total === 0) {
        isGameOver = true; scores["1"] += j1Total; board.fill(0, 0, 7);
        logs.push("❌ FIN : Le Joueur 2 est affamé. Joueur 1 ramasse le reste.");
    }

    if (scores["1"] > 35 || scores["2"] > 35) {
        isGameOver = true;
        let gagnant = scores["1"] > 35 ? "Joueur 1" : "Joueur 2";
        logs.push(`🏆 VICTOIRE : Le ${gagnant} a la majorité !`);
    }

    if (isGameOver) {
        showVictoryModal();
    } else {
        if (currentPlayer === 1) currentTour++;
        currentPlayer = nextPlayer;
        startTimer(); 
    }
    
    saveGame(); 
    updateDisplay();
}

function showVictoryModal() {
    stopTimer(); 
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
    isPaused = false; 

    if (pauseGameBtn) {
        pauseGameBtn.innerText = "Pause ⏸️";
        pauseGameBtn.style.backgroundColor = "#f39c12";
    }
    if (startPlayerSelect) startPlayerSelect.disabled = false;
    
    determineStartingPlayer(); 
    saveGame();
    updateDisplay();
    startTimer(); 
}

// Initialisation au chargement
if (!loadGame()) {
    mainMenu.style.display = "block";
    gameContainer.style.display = "none";
}
