import { auth, db, signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile, signOut, onAuthStateChanged, doc, setDoc, updateDoc, arrayUnion, Timestamp, getDoc } from "./firebase-config.js";

// Game State
let currentState = {
    gameState: 'MENU', // MENU, PLAYING, GAME_OVER
    currentLevelIndex: 0,
    currentQuestionIndex: 0,
    score: 0,
    shuffledOptions: []
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

// Event Listeners
startBtn.addEventListener('click', startGame);
restartBtn.addEventListener('click', restartGame);

// Auth Event Listeners
showLoginBtn.addEventListener('click', () => toggleAuthForm('login'));
showRegisterBtn.addEventListener('click', () => toggleAuthForm('register'));
performLoginBtn.addEventListener('click', handleLogin);
performRegisterBtn.addEventListener('click', handleRegister);
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

    } else {
        currentUser = null;
        authForms.style.display = 'block';
        loggedInView.classList.add('hidden');

        startBtn.disabled = true;
        startBtn.style.opacity = "0.5";
        startBtn.style.cursor = "not-allowed";
    }
});

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

        // Create User Doc in Firestore
        await setDoc(doc(db, "users", user.uid), {
            name: name,
            email: email,
            lastLogin: Timestamp.now(),
            createdAt: Timestamp.now()
        });

        // Auth state listener handles UI update
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
function startGame() {
    if (!currentUser) {
        alert("Debes iniciar sesión para jugar.");
        return;
    }
    currentState.gameState = 'PLAYING';
    currentState.currentLevelIndex = 0;
    currentState.score = 0;
    startLevel(0);
    updateScreen();
}

function startLevel(levelIndex) {
    currentState.currentLevelIndex = levelIndex;
    currentState.currentQuestionIndex = 0;
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
        allButtons.forEach(b => {
            if (b.textContent === correctAnswer) {
                b.classList.add('correct');
            }
        });
    }

    scoreDisplay.textContent = `Score: ${currentState.score}`;

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
    updateScreen();

    finalScoreSpan.textContent = currentState.score;
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
            await updateDoc(userRef, {
                gameHistory: arrayUnion({
                    score: currentState.score,
                    date: Timestamp.now(),
                    completed: true
                }),
                // Simplistic high score update
                lastScore: currentState.score
            });
            console.log("Score saved!");
        } catch (e) {
            console.error("Error saving score:", e);
        }
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
