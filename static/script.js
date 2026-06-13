// Application State Management
let state = {
    role: "",
    questions: [],
    currentQuestionIndex: 0,
    scores: [],
    feedback: []
};

// DOM Element Registry
const screenSetup = document.getElementById('screen-setup');
const screenInterview = document.getElementById('screen-interview');
const screenReport = document.getElementById('screen-report');

const roleSelect = document.getElementById('role-select');
const btnStart = document.getElementById('btn-start');
const setupError = document.getElementById('setup-error');

const questionNumber = document.getElementById('question-number');
const displayRole = document.getElementById('display-role');
const questionText = document.getElementById('question-text');
const answerInput = document.getElementById('answer-input');
const btnSubmitAnswer = document.getElementById('btn-submit-answer');
const interviewError = document.getElementById('interview-error');

const feedbackSection = document.getElementById('feedback-section');
const feedbackScore = document.getElementById('feedback-score');
const feedbackStrengths = document.getElementById('feedback-strengths');
const feedbackWeaknesses = document.getElementById('feedback-weaknesses');
const feedbackSuggestions = document.getElementById('feedback-suggestions');
const btnNext = document.getElementById('btn-next');

const averageScoreEl = document.getElementById('average-score');
const reportTableBody = document.getElementById('report-table-body');
const performanceSummary = document.getElementById('performance-summary');
const btnRestart = document.getElementById('btn-restart');

const loadingOverlay = document.getElementById('loading-overlay');
const loadingText = document.getElementById('loading-text');

// Helper Functions
function showLoading(text) {
    loadingText.textContent = text;
    loadingOverlay.classList.remove('hidden');
}

function hideLoading() {
    loadingOverlay.classList.add('hidden');
}

function showScreen(screen) {
    [screenSetup, screenInterview, screenReport].forEach(s => s.classList.add('hidden'));
    screen.classList.remove('hidden');
}

function formatFeedbackList(data) {
    if (Array.isArray(data)) {
        return data.length > 0 ? data.join(' ') : "None noted.";
    }
    return data || "None noted.";
}

// Action Listeners
btnStart.addEventListener('click', async () => {
    const selectedRole = roleSelect.value;
    if (!selectedRole) {
        setupError.textContent = "Please select a job role to proceed.";
        setupError.classList.remove('hidden');
        return;
    }
    setupError.classList.add('hidden');
    
    showLoading(`Generating custom questions for ${selectedRole}...`);
    
    try {
        const response = await fetch('/generate-questions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ role: selectedRole })
        });
        
        const data = await response.json();
        
        if (response.ok && data.questions && data.questions.length > 0) {
            state.role = selectedRole;
            state.questions = data.questions;
            state.currentQuestionIndex = 0;
            state.scores = [];
            state.feedback = [];
            
            displayRole.textContent = state.role;
            loadQuestion();
            showScreen(screenInterview);
        } else {
            throw new Error(data.error || "Failed to receive valid interview content.");
        }
    } catch (err) {
        setupError.textContent = `Error: ${err.message}. Please check your .env API Key layout configuration and try again.`;
        setupError.classList.remove('hidden');
    } finally {
        hideLoading();
    }
});

function loadQuestion() {
    answerInput.value = "";
    answerInput.disabled = false;
    btnSubmitAnswer.classList.remove('hidden');
    feedbackSection.classList.add('hidden');
    interviewError.classList.add('hidden');
    
    questionNumber.textContent = `Question ${state.currentQuestionIndex + 1} of ${state.questions.length}`;
    questionText.textContent = state.questions[state.currentQuestionIndex];
}

btnSubmitAnswer.addEventListener('click', async () => {
    const answer = answerInput.value.trim();
    if (!answer) {
        interviewError.textContent = "Your response cannot be blank.";
        interviewError.classList.remove('hidden');
        return;
    }
    interviewError.classList.add('hidden');
    
    showLoading("Evaluating response analytics with Gemini...");
    
    try {
        const response = await fetch('/evaluate-answer', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                question: state.questions[state.currentQuestionIndex],
                answer: answer
            })
        });
        
        const evaluation = await response.json();
        
        if (response.ok) {
            state.scores.push(Number(evaluation.score) || 0);
            state.feedback.push(evaluation);
            
            feedbackScore.textContent = evaluation.score;
            feedbackStrengths.textContent = formatFeedbackList(evaluation.strengths);
            feedbackWeaknesses.textContent = formatFeedbackList(evaluation.weaknesses);
            feedbackSuggestions.textContent = formatFeedbackList(evaluation.suggestions);
            
            answerInput.disabled = true;
            btnSubmitAnswer.classList.add('hidden');
            feedbackSection.classList.remove('hidden');
        } else {
            throw new Error(evaluation.error || "Failed inspecting response metrics.");
        }
    } catch (err) {
        interviewError.textContent = `Evaluation Failure: ${err.message}`;
        interviewError.classList.remove('hidden');
    } finally {
        hideLoading();
    }
});

btnNext.addEventListener('click', () => {
    state.currentQuestionIndex++;
    if (state.currentQuestionIndex < state.questions.length) {
        loadQuestion();
    } else {
        renderFinalReport();
    }
});

function renderFinalReport() {
    const total = state.scores.reduce((sum, val) => sum + val, 0);
    const avg = (total / state.scores.length).toFixed(1);
    averageScoreEl.textContent = avg;
    
    reportTableBody.innerHTML = "";
    state.questions.forEach((q, idx) => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${idx + 1}</td>
            <td><strong>${q}</strong></td>
            <td><span class="badge">${state.scores[idx]}/10</span></td>
        `;
        reportTableBody.appendChild(row);
    });
    
    let finalMetricNarrative = "";
    if (avg >= 8.0) {
        finalMetricNarrative = `Outstanding job! You show a great technical grasp of ${state.role} parameters. Your solutions match clean design practices and robust domain-driven production architectures.`;
    } else if (avg >= 5.0) {
        finalMetricNarrative = `Solid foundation! You possess the essential skills required for a ${state.role}. Reviewing your specific weak points and refining edge cases will help push you to the next level.`;
    } else {
        finalMetricNarrative = `Keep practicing! Review fundamental patterns and architectural concepts for ${state.role}. Retaking the interview after focusing on our suggestions will yield noticeable growth.`;
    }
    performanceSummary.textContent = finalMetricNarrative;
    
    showScreen(screenReport);
}

btnRestart.addEventListener('click', () => {
    roleSelect.value = "";
    showScreen(screenSetup);
});