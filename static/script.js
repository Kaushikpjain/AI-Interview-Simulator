// Application Runtime State Machine Management Context
let state = {
    interview_id: null,
    role: "",
    questions: [],
    currentQuestionIndex: 0,
    scores: []
};

// DOM Element Registration Maps
const screenSetup = document.getElementById('screen-setup');
const screenInterview = document.getElementById('screen-interview');
const screenReport = document.getElementById('screen-report');

const roleSelect = document.getElementById('role-select');
const btnStart = document.getElementById('btn-start');
const setupError = document.getElementById('setup-error');
const historyTableBody = document.getElementById('history-table-body');

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

// Initialize Lifecycle Logic Hook
document.addEventListener('DOMContentLoaded', loadHistoryDashboard);

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

async function loadHistoryDashboard() {
    try {
        const response = await fetch('/get-history');
        const data = await response.json();
        
        historyTableBody.innerHTML = "";
        if (response.ok && data.history && data.history.length > 0) {
            data.history.forEach(item => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${item.date_timestamp}</td>
                    <td><strong>${item.role}</strong></td>
                    <td><span class="badge-history">${item.average_score.toFixed(1)}/10</span></td>
                `;
                historyTableBody.appendChild(row);
            });
        } else {
            historyTableBody.innerHTML = `<tr><td colspan="3" style="text-align:center; color:#94a3b8;">No historical mock data records found.</td></tr>`;
        }
    } catch (err) {
        console.error("Failed fetching context database rows mapping traces:", err);
    }
}

btnStart.addEventListener('click', async () => {
    const selectedRole = roleSelect.value;
    if (!selectedRole) {
        setupError.textContent = "Please pick a designated job track to unlock execution.";
        setupError.classList.remove('hidden');
        return;
    }
    setupError.classList.add('hidden');
    showLoading(`Structuring custom assessment questions for ${selectedRole}...`);
    
    try {
        const response = await fetch('/generate-questions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ role: selectedRole })
        });
        const data = await response.json();
        
        if (response.ok && data.questions) {
            state.interview_id = data.interview_id;
            state.role = selectedRole;
            state.questions = data.questions;
            state.currentQuestionIndex = 0;
            state.scores = [];
            
            displayRole.textContent = state.role;
            loadQuestion();
            showScreen(screenInterview);
        } else {
            throw new Error(data.error || "Failed loading inference questions payload frames.");
        }
    } catch (err) {
        setupError.textContent = `Exception Failure: ${err.message}`;
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
        interviewError.textContent = "Your response workspace parameters cannot be blank.";
        interviewError.classList.remove('hidden');
        return;
    }
    interviewError.classList.add('hidden');
    showLoading("Evaluating engineering solution response with Gemini API...");
    
    try {
        const response = await fetch('/evaluate-answer', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                interview_id: state.interview_id,
                question: state.questions[state.currentQuestionIndex],
                answer: answer
            })
        });
        const evaluation = await response.json();
        
        if (response.ok) {
            state.scores.push(Number(evaluation.score) || 0);
            
            feedbackScore.textContent = evaluation.score;
            feedbackStrengths.textContent = evaluation.strengths;
            feedbackWeaknesses.textContent = evaluation.weaknesses;
            feedbackSuggestions.textContent = evaluation.suggestions;
            
            answerInput.disabled = true;
            btnSubmitAnswer.classList.add('hidden');
            feedbackSection.classList.remove('hidden');
        } else {
            throw new Error(evaluation.error || "Failed running evaluation engine routines.");
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
        processFinalReportCalculations();
    }
});

async function processFinalReportCalculations() {
    showLoading("Finalizing metrics summary and recording analytics matrices...");
    try {
        const response = await fetch('/finalize-interview', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ interview_id: state.interview_id })
        });
        const data = await response.json();
        
        if (response.ok) {
            renderFinalReportView(data.average_score);
        } else {
            throw new Error(data.error || "Final calculation metrics synchronization failure.");
        }
    } catch (err) {
        console.error(err);
        // Fallback mathematical generation if endpoint execution encounters friction
        const localAvg = (state.scores.reduce((a, b) => a + b, 0) / state.scores.length).toFixed(1);
        renderFinalReportView(localAvg);
    } finally {
        hideLoading();
    }
}

function renderFinalReportView(finalAvgScore) {
    averageScoreEl.textContent = finalAvgScore;
    reportTableBody.innerHTML = "";
    
    state.questions.forEach((q, idx) => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${idx + 1}</td>
            <td><strong>${q}</strong></td>
            <td><span class="badge-history">${state.scores[idx]}/10</span></td>
        `;
        reportTableBody.appendChild(row);
    });
    
    let narrative = "";
    if (finalAvgScore >= 8.0) {
        narrative = `Outstanding job! You show a great technical grasp of ${state.role} parameters. Your solutions match clean design practices and robust domain-driven production architectures.`;
    } else if (finalAvgScore >= 5.0) {
        narrative = `Solid foundation! You possess the essential skills required for a ${state.role}. Reviewing your specific weak points and refining edge cases will help push you to the next level.`;
    } else {
        narrative = `Keep practicing! Review fundamental patterns and architectural concepts for ${state.role}. Retaking the interview after focusing on our suggestions will yield noticeable growth.`;
    }
    performanceSummary.textContent = narrative;
    showScreen(screenReport);
}

btnRestart.addEventListener('click', () => {
    roleSelect.value = "";
    loadHistoryDashboard(); // Refresh history metrics view upon complete run wrap
    showScreen(screenSetup);
});