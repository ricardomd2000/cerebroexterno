
// Game State
let currentState = {
    gameState: 'MENU', // MENU, PLAYING, GAME_OVER
    currentLevelIndex: 0,
    currentQuestionIndex: 0,
    score: 0,
    shuffledOptions: []
};

// DOM Elements
const menuScreen = document.getElementById('menu-screen');
const gameScreen = document.getElementById('game-screen');
const gameOverScreen = document.getElementById('game-over-screen');

const startBtn = document.getElementById('start-btn');
const restartBtn = document.getElementById('restart-btn');

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

// Game Logic
function startGame() {
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
    const level = GAME_LEVELS[currentState.currentLevelIndex];
    const question = level.questions[currentState.currentQuestionIndex];

    // Update UI Text
    levelTitle.textContent = level.title;
    levelDescription.textContent = level.description;
    scoreDisplay.textContent = `Score: ${currentState.score}`;
    questionCounter.textContent = `Question: ${currentState.currentQuestionIndex + 1} / ${level.questions.length}`;

    // Set Image
    questionImage.src = question.image;

    // Prepare Options
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
    // Disable all buttons
    const allButtons = optionsContainer.querySelectorAll('button');
    allButtons.forEach(b => b.disabled = true);

    const isCorrect = selectedOption === correctAnswer;

    if (isCorrect) {
        btnElement.classList.add('correct');
        currentState.score += 100;
    } else {
        btnElement.classList.add('incorrect');
        // Highlight the correct one
        allButtons.forEach(b => {
            if (b.textContent === correctAnswer) {
                b.classList.add('correct');
            }
        });
    }

    scoreDisplay.textContent = `Score: ${currentState.score}`;

    // Wait and move to next
    setTimeout(() => {
        nextQuestion();
    }, 1500);
}

function nextQuestion() {
    const level = GAME_LEVELS[currentState.currentLevelIndex];

    if (currentState.currentQuestionIndex + 1 < level.questions.length) {
        currentState.currentQuestionIndex++;
        loadQuestion();
    } else {
        // Level Complete
        if (currentState.currentLevelIndex + 1 < GAME_LEVELS.length) {
            startLevel(currentState.currentLevelIndex + 1);
        } else {
            gameOver();
        }
    }
}

function gameOver() {
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

// Utility
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}

// Initial Render
updateScreen();
