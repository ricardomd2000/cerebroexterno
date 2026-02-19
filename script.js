import { auth, db, signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile, signOut, onAuthStateChanged, signInWithPopup, googleProvider, doc, setDoc, updateDoc, arrayUnion, Timestamp, getDoc, addDoc, collection, getDocs, limit, orderBy, query, deleteField } from "./firebase-config.js";

// Game State
let currentState = {
    gameState: 'MENU', // MENU, PLAYING, GAME_OVER
    currentLevelIndex: 0,
    currentQuestionIndex: 0,
    score: 0,
    shuffledOptions: [],
    startTime: null,
    timerInterval: null,
    incorrectAnswers: []
};

let currentUser = null;

// DOM Elements
const menuScreen = document.getElementById('menu-screen');
const gameScreen = document.getElementById('game-screen');
const gameOverScreen = document.getElementById('game-over-screen');

const startBtn = document.getElementById('start-btn');
const restartBtn = document.getElementById('restart-btn');

// Auth DOM Elements
const authForms = document.getElementById('auth-forms');
const loggedInView = document.getElementById('logged-in-view');
const showLoginBtn = document.getElementById('show-login-btn');
const showRegisterBtn = document.getElementById('show-register-btn');
const loginForm = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');
const performLoginBtn = document.getElementById('perform-login-btn');
const performRegisterBtn = document.getElementById('perform-register-btn');
const googleLoginBtn = document.getElementById('google-login-btn');
const logoutBtn = document.getElementById('logout-btn');
const authError = document.getElementById('auth-error');
const userNameDisplay = document.getElementById('user-name');

// Inputs
const loginEmail = document.getElementById('login-email');
const loginPassword = document.getElementById('login-password');
const regName = document.getElementById('reg-name');
const regEmail = document.getElementById('reg-email');
const regPassword = document.getElementById('reg-password');

const levelTitle = document.getElementById('level-title');
const levelDescription = document.getElementById('level-description');
const scoreDisplay = document.getElementById('score-display');
const questionCounter = document.getElementById('question-counter');
const questionImage = document.getElementById('question-image');
const optionsContainer = document.getElementById('options-container');

const finalScoreSpan = document.getElementById('final-score');
const finalMessage = document.getElementById('final-message');
const timerDisplay = document.getElementById('timer-display');
const feedbackContainer = document.getElementById('feedback-container');

// Leaderboard Elements
const leaderboardBtn = document.getElementById('leaderboard-btn');
const leaderboardScreen = document.getElementById('leaderboard-screen');
const closeLeaderboardBtn = document.getElementById('close-leaderboard-btn');
const leaderboardList = document.getElementById('leaderboard-list');
// menuScreen is already defined above

// Event Listeners
startBtn.addEventListener('click', startGame);

restartBtn.addEventListener('click', () => {
    currentState.gameState = 'MENU';
    updateScreen();
});

// Leaderboard Listeners
leaderboardBtn.addEventListener('click', showLeaderboard);
closeLeaderboardBtn.addEventListener('click', () => {
    leaderboardScreen.classList.add('hidden');
    menuScreen.classList.remove('hidden');
});
// Auth Event Listeners
showLoginBtn.addEventListener('click', () => toggleAuthForm('login'));
showRegisterBtn.addEventListener('click', () => toggleAuthForm('register'));
performLoginBtn.addEventListener('click', handleLogin);
performRegisterBtn.addEventListener('click', handleRegister);
googleLoginBtn.addEventListener('click', handleGoogleLogin);
logoutBtn.addEventListener('click', handleLogout);

function toggleAuthForm(mode) {
    authError.textContent = '';
    if (mode === 'login') {
        loginForm.classList.remove('hidden');
        registerForm.classList.add('hidden');
        showLoginBtn.classList.add('active-tab');
        showRegisterBtn.classList.remove('active-tab');
    } else {
        loginForm.classList.add('hidden');
        registerForm.classList.remove('hidden');
        showLoginBtn.classList.remove('active-tab');
        showRegisterBtn.classList.add('active-tab');
    }
}

// Firebase Auth Logic
onAuthStateChanged(auth, async (user) => {
    if (user) {
        currentUser = user;
        userNameDisplay.textContent = `Hola, ${user.displayName || 'Estudiante'}`;

        authForms.style.display = 'none';
        loggedInView.classList.remove('hidden');

        startBtn.disabled = false;
        startBtn.style.opacity = "1";
        startBtn.style.cursor = "pointer";

        // Ensure user doc exists (for Google Login users)
        const userRef = doc(db, "users", user.uid);
        const userSnap = await getDoc(userRef);
        if (!userSnap.exists()) {
            await setDoc(userRef, {
                name: user.displayName,
                email: user.email,
                lastLogin: Timestamp.now(),
                createdAt: Timestamp.now()
            });
        } else {
            await updateDoc(userRef, {
                lastLogin: Timestamp.now()
            });
        }

    } else {
        currentUser = null;
        authForms.style.display = 'block';
        loggedInView.classList.add('hidden');

        startBtn.disabled = true;
        startBtn.style.opacity = "0.5";
        startBtn.style.cursor = "not-allowed";
    }
});

async function handleGoogleLogin() {
    authError.textContent = '';
    try {
        await signInWithPopup(auth, googleProvider);
    } catch (error) {
        console.error(error);
        authError.textContent = 'Error con Google: ' + error.message;
    }
}

async function handleLogin() {
    const email = loginEmail.value;
    const password = loginPassword.value;
    authError.textContent = '';

    try {
        await signInWithEmailAndPassword(auth, email, password);
    } catch (error) {
        console.error(error);
        if (error.code === 'auth/invalid-credential') {
            authError.textContent = 'Correo o contraseña incorrectos.';
        } else {
            authError.textContent = 'Error: ' + error.message;
        }
    }
}

async function handleRegister() {
    const name = regName.value;
    const email = regEmail.value;
    const password = regPassword.value;
    authError.textContent = '';

    if (!name) {
        authError.textContent = 'El nombre es obligatorio.';
        return;
    }

    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        // Update Profile Name
        await updateProfile(user, { displayName: name });

        // User doc created in onAuthStateChanged

    } catch (error) {
        console.error(error);
        if (error.code === 'auth/email-already-in-use') {
            authError.textContent = 'Este correo ya está registrado.';
        } else if (error.code === 'auth/weak-password') {
            authError.textContent = 'La contraseña debe tener al menos 6 caracteres.';
        } else {
            authError.textContent = 'Error: ' + error.message;
        }
    }
}

function handleLogout() {
    signOut(auth).then(() => {
        // UI updates automatically via onAuthStateChanged
        loginEmail.value = '';
        loginPassword.value = '';
        regName.value = '';
        regEmail.value = '';
        regPassword.value = '';
    });
}

// Game Logic
async function startGame() { // Made async to use await
    if (!currentUser) {
        alert("Debes iniciar sesión para jugar.");
        return;
    }

    // Check for saved session
    const userRef = doc(db, "users", currentUser.uid);
    const userSnap = await getDoc(userRef);
    if (userSnap.exists() && userSnap.data().currentSession) {
        const session = userSnap.data().currentSession;
        if (confirm(`Tienes una partida guardada en el Nivel ${session.level + 1}, Pregunta ${session.questionIndex + 1}. \nPuntaje: ${session.score}. \n\n¿Quieres continuar?`)) {
            // Resume Game
            currentState.gameState = 'PLAYING';
            currentState.currentLevelIndex = session.level;
            currentState.score = session.score;
            currentState.currentQuestionIndex = session.questionIndex;
            currentState.incorrectAnswers = session.incorrectAnswers || [];

            // Restore time accurately
            // We can't perfectly restore the exact timer second without more complex logic,
            // but we can ensure the TOTAL duration at the end is correct by keeping the originalStartTime.
            // For the UI timer, we'll just continue counting from where they left off (or approximated).
            currentState.startTime = Date.now(); // Reset visual timer for current question/session

            // Store the ORIGINAL start time in a separate property to calculate total duration at the end
            currentState.originalStartTime = session.startTime;

            startTimer();
            updateScreen();
            startLevel(currentState.currentLevelIndex, currentState.currentQuestionIndex); // Load the level and Question
            return; // Exit after resuming
        } else {
            // Discard saved session
            await updateDoc(userRef, {
                currentSession: deleteField()
            });
        }
    }

    // If no session to resume or user declined, start a new game
    currentState.gameState = 'PLAYING';
    currentState.currentLevelIndex = 0;
    currentState.score = 0;
    currentState.incorrectAnswers = [];
    currentState.startTime = Date.now(); // For visual timer
    currentState.originalStartTime = Timestamp.now(); // For total game duration
    startTimer();
    startLevel(0);
    updateScreen();
}

function startLevel(levelIndex, startIndex = 0) {
    currentState.currentLevelIndex = levelIndex;
    currentState.currentQuestionIndex = startIndex;
    loadQuestion();
}

function loadQuestion() {
    const levels = window.GAME_LEVELS;
    const level = levels[currentState.currentLevelIndex];
    const question = level.questions[currentState.currentQuestionIndex];

    levelTitle.textContent = level.title;
    levelDescription.textContent = level.description;
    scoreDisplay.textContent = `Score: ${currentState.score}`;
    questionCounter.textContent = `Question: ${currentState.currentQuestionIndex + 1} / ${level.questions.length}`;
    questionImage.src = question.image;

    const options = [question.correctAnswer, ...question.distractors];
    shuffleArray(options);
    currentState.shuffledOptions = options;

    renderOptions(options, question.correctAnswer);
}

function startTimer() {
    if (currentState.timerInterval) clearInterval(currentState.timerInterval);
    currentState.timerInterval = setInterval(() => {
        const elapsed = Math.floor((Date.now() - currentState.startTime) / 1000);
        const minutes = Math.floor(elapsed / 60).toString().padStart(2, '0');
        const seconds = (elapsed % 60).toString().padStart(2, '0');
        timerDisplay.textContent = `Tiempo: ${minutes}:${seconds}`;
    }, 1000);
}

function renderOptions(options, correctAnswer) {
    optionsContainer.innerHTML = '';
    options.forEach(option => {
        const btn = document.createElement('button');
        btn.textContent = option;
        btn.className = 'option-btn';
        btn.onclick = () => handleAnswer(option, correctAnswer, btn);
        optionsContainer.appendChild(btn);
    });
}

function handleAnswer(selectedOption, correctAnswer, btnElement) {
    const allButtons = optionsContainer.querySelectorAll('button');
    allButtons.forEach(b => b.disabled = true);

    const isCorrect = selectedOption === correctAnswer;

    if (isCorrect) {
        btnElement.classList.add('correct');
        currentState.score += 100;
    } else {
        btnElement.classList.add('incorrect');
        currentState.incorrectAnswers.push({
            question: window.GAME_LEVELS[currentState.currentLevelIndex].questions[currentState.currentQuestionIndex].correctAnswer,
            userAnswer: selectedOption
        });

        allButtons.forEach(b => {
            if (b.textContent === correctAnswer) {
                b.classList.add('correct');
            }
        });
    }

    scoreDisplay.textContent = `Score: ${currentState.score}`;

    // Auto-Save Progress
    if (currentUser) {
        saveProgress();
    }

    setTimeout(() => {
        nextQuestion();
    }, 1500);
}

function nextQuestion() {
    const levels = window.GAME_LEVELS;
    const level = levels[currentState.currentLevelIndex];

    if (currentState.currentQuestionIndex + 1 < level.questions.length) {
        currentState.currentQuestionIndex++;
        loadQuestion();
    } else {
        // Level Complete
        if (currentState.currentLevelIndex + 1 < levels.length) {
            startLevel(currentState.currentLevelIndex + 1);
        } else {
            gameOver();
        }
    }
}

async function gameOver() {
    currentState.gameState = 'GAME_OVER';
    clearInterval(currentState.timerInterval);
    updateScreen();

    const endTime = Date.now();
    const durationSeconds = Math.floor((endTime - currentState.startTime) / 1000);
    const minutes = Math.floor(durationSeconds / 60);
    const seconds = durationSeconds % 60;
    const timeString = `${minutes}:${seconds.toString().padStart(2, '0')}`;

    finalScoreSpan.textContent = currentState.score;

    let feedbackHTML = `<strong>Tiempo Total:</strong> ${timeString}<br><br>`;
    feedbackHTML += `<strong>Jugador:</strong> ${currentUser ? (currentUser.displayName || currentUser.email) : 'Invitado'}<br><br>`;

    if (currentState.incorrectAnswers.length > 0) {
        feedbackHTML += `<strong>Temas a reforzar:</strong><ul style="margin-top:5px; padding-left: 20px;">`;
        currentState.incorrectAnswers.forEach(item => {
            feedbackHTML += `<li>${item.question}</li>`; // Showing the correct structure name as the topic
        });
        feedbackHTML += `</ul>`;
    } else {
        feedbackHTML += `<strong>¡Perfecto! No tuviste errores.</strong>`;
    }

    feedbackContainer.innerHTML = feedbackHTML;

    if (currentState.score > 2000) {
        finalMessage.textContent = "¡Excelente! Eres un neuroanatomista experto.";
    } else if (currentState.score > 1000) {
        finalMessage.textContent = "¡Buen trabajo! Sigue practicando.";
    } else {
        finalMessage.textContent = "Necesitas repasar la guía.";
    }

    // Save Score to Firestore
    if (currentUser) {
        const userRef = doc(db, "users", currentUser.uid);
        try {
            // Calculate total duration using originalStartTime if available
            const endTime = Timestamp.now();
            let finalDuration = durationSeconds;
            if (currentState.originalStartTime) {
                finalDuration = endTime.seconds - currentState.originalStartTime.seconds;
            }

            // 1. Update User History
            await updateDoc(userRef, {
                gameHistory: arrayUnion({
                    score: currentState.score,
                    date: endTime,
                    completed: true,
                    durationSeconds: finalDuration,
                    incorrectTopics: currentState.incorrectAnswers.map(i => i.question)
                }),
                lastScore: currentState.score,
                currentSession: deleteField() // Clear saved session
            });

            // 2. Add to Global Leaderboard
            await addDoc(collection(db, "scores"), {
                userId: currentUser.uid,
                displayName: currentUser.displayName || currentUser.email.split('@')[0], // Use email prefix if no name
                score: currentState.score,
                date: endTime,
                durationSeconds: finalDuration
            });

            console.log("Score saved to history and leaderboard!");
        } catch (e) {
            console.error("Error saving score:", e);
        }
    }
}

async function saveProgress() {
    if (!currentUser) return;
    const userRef = doc(db, "users", currentUser.uid);
    try {
        await updateDoc(userRef, {
            currentSession: {
                level: currentState.currentLevelIndex,
                score: currentState.score,
                questionIndex: currentState.currentQuestionIndex, // Save current index
                incorrectAnswers: currentState.incorrectAnswers,
                startTime: currentState.originalStartTime || Timestamp.now(),
                savedAt: Timestamp.now()
            }
        });
        console.log("Progress saved.");
    } catch (e) {
        console.error("Error saving progress:", e);
    }
}

// Leaderboard Functions
async function showLeaderboard() {
    menuScreen.classList.add('hidden');
    leaderboardScreen.classList.remove('hidden');
    leaderboardList.innerHTML = '<p>Cargando puntuaciones...</p>';

    try {
        const q = query(collection(db, "scores"), orderBy("score", "desc"), limit(10));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            leaderboardList.innerHTML = '<p>Aún no hay puntuaciones registradas.</p>';
            return;
        }

        let html = '<ol style="text-align: left; padding-left: 20px;">';
        querySnapshot.forEach((doc) => {
            const data = doc.data();
            const date = data.date ? new Date(data.date.seconds * 1000).toLocaleDateString() : '';
            html += `<li style="margin-bottom: 8px;">
                <strong>${data.displayName}</strong>: ${data.score} pts 
                <span style="font-size: 0.8em; color: #ccc;">(${date})</span>
            </li>`;
        });
        html += '</ol>';
        leaderboardList.innerHTML = html;

    } catch (error) {
        console.error("Error loading leaderboard:", error);
    }
}

function restartGame() {
    startGame();
}

function updateScreen() {
    menuScreen.classList.add('hidden');
    gameScreen.classList.add('hidden');
    gameOverScreen.classList.add('hidden');

    if (currentState.gameState === 'MENU') {
        menuScreen.classList.remove('hidden');
    } else if (currentState.gameState === 'PLAYING') {
        gameScreen.classList.remove('hidden');
    } else if (currentState.gameState === 'GAME_OVER') {
        gameOverScreen.classList.remove('hidden');
    }
}

function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}

// Initial Render
updateScreen();
