import { QUESTION_POOL } from '../data/questions';

export function generateStandaloneHtml(): string {
  const jsonQuestions = JSON.stringify(QUESTION_POOL);

  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Civil Service & Health CBT Practice Portal - Promotional Exam Simulator</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=IBM+Plex+Mono:wght@400;500;600&display=swap" rel="stylesheet">
    <style>
        :root {
            --primary: #065f46;
            --primary-hover: #047857;
            --secondary: #059669;
            --amber: #d97706;
            --danger: #dc2626;
            --dark: #0f172a;
            --light: #f8fafc;
            --border: #e2e8f0;
        }
        * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Plus Jakarta Sans', sans-serif; }
        body { background-color: var(--light); color: var(--dark); height: 100vh; overflow: hidden; display: flex; flex-direction: column; }
        .view { display: none; width: 100%; height: 100%; overflow-y: auto; padding: 1.5rem; }
        .view.active { display: flex; flex-direction: column; }
        .card { background: white; padding: 2rem; border-radius: 1rem; box-shadow: 0 1px 3px rgba(0,0,0,0.1); max-width: 720px; width: 100%; margin: auto; border: 1px solid var(--border); }
        h1, h2, h3 { color: var(--dark); text-align: center; }
        .crest { width: 64px; height: 64px; background: #064e3b; color: #fde047; border: 2px solid #facc15; border-radius: 1rem; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 1.15rem; margin: 0 auto 1rem auto; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); }
        .btn { background: var(--primary); color: white; padding: 0.75rem 1.5rem; border: none; border-radius: 0.5rem; font-size: 0.95rem; font-weight: 700; cursor: pointer; transition: all 0.2s; display: inline-flex; align-items: center; justify-content: center; gap: 0.5rem; }
        .btn:hover { background: var(--primary-hover); }
        .btn-amber { background: #f59e0b; color: #022c22; }
        .btn-amber:hover { background: #d97706; color: white; }
        .btn-outline { background: white; color: #334155; border: 1px solid var(--border); }
        .btn-outline:hover { background: #f1f5f9; }
        .form-group { margin-bottom: 1.25rem; }
        label { display: block; margin-bottom: 0.4rem; font-size: 0.8rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #475569; }
        input, select { width: 100%; padding: 0.65rem 0.85rem; border: 1px solid var(--border); border-radius: 0.5rem; font-size: 0.9rem; background: #f8fafc; }
        input:focus, select:focus { outline: none; border-color: var(--primary); background: white; }
        .exam-header { background: #064e3b; color: white; padding: 0.75rem 1.5rem; display: flex; justify-content: space-between; align-items: center; height: 64px; flex-shrink: 0; border-bottom: 1px solid #047857; }
        .exam-body { display: flex; flex: 1; height: calc(100vh - 64px); overflow: hidden; }
        .sidebar { width: 300px; background: white; border-right: 1px solid var(--border); padding: 1rem; display: flex; flex-direction: column; overflow-y: auto; }
        .nav-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 0.4rem; margin-top: 0.75rem; flex: 1; }
        .nav-btn { height: 42px; border: 1px solid var(--border); background: white; border-radius: 0.375rem; font-family: 'IBM Plex Mono', monospace; font-weight: 700; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 0.85rem; }
        .nav-btn.answered { background: var(--secondary); color: white; border-color: var(--secondary); }
        .nav-btn.current { outline: 2px solid var(--primary); outline-offset: 1px; }
        .workspace { flex: 1; padding: 2rem; overflow-y: auto; background: #f1f5f9; display: flex; flex-direction: column; justify-content: space-between; }
        .question-box { background: white; padding: 2rem; border-radius: 0.75rem; border: 1px solid var(--border); margin-bottom: 1.5rem; }
        .option-item { display: flex; align-items: flex-start; gap: 0.85rem; padding: 0.85rem; border: 2px solid var(--border); border-radius: 0.5rem; margin-bottom: 0.65rem; cursor: pointer; transition: all 0.15s; font-size: 0.92rem; }
        .option-item:hover { background: #f8fafc; }
        .option-item.selected { border-color: var(--primary); background: #ecfdf5; font-weight: 600; }
        .option-prefix { width: 28px; height: 28px; background: #e2e8f0; border-radius: 0.25rem; font-family: monospace; font-weight: bold; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .option-item.selected .option-prefix { background: var(--primary); color: white; }
        .timer-box { font-family: 'IBM Plex Mono', monospace; font-weight: 700; font-size: 1.15rem; background: rgba(0,0,0,0.3); padding: 0.35rem 0.85rem; border-radius: 0.375rem; border: 1px solid rgba(255,255,255,0.2); }
        .timer-urgent { background: var(--danger) !important; animation: pulse 1s infinite; }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.6; } }
        .modal { position: fixed; inset: 0; background: rgba(15,23,42,0.8); display: none; align-items: center; justify-content: center; z-index: 50; padding: 1rem; }
        .modal.active { display: flex; }
        .modal-content { background: white; border-radius: 1rem; max-width: 650px; width: 100%; max-height: 90vh; overflow-y: auto; padding: 1.75rem; border: 1px solid var(--border); }
        @media print {
            .exam-header, .sidebar, .btn, .no-print { display: none !important; }
            body, .view { overflow: visible !important; height: auto !important; background: white !important; }
            .card { box-shadow: none !important; border: 1px solid #ccc !important; max-width: 100% !important; }
        }
    </style>
</head>
<body>

    <!-- REGISTRATION VIEW -->
    <div id="view-reg" class="view active">
        <div class="card">
            <div class="crest">CBT</div>
            <h1 style="font-size: 1.5rem; margin-bottom: 0.25rem;">Civil Service & Health CBT Practice Portal</h1>
            <p style="text-align: center; font-size: 0.85rem; color: #065f46; font-weight: 700; text-transform: uppercase; margin-bottom: 1.25rem;">
                Promotional Exam Simulator & Practice Platform
            </p>

            <div style="background: #fffbeb; border: 1px solid #fef3c7; padding: 0.75rem; border-radius: 0.5rem; margin-bottom: 1.25rem; font-size: 0.8rem; color: #92400e;">
                <strong>Disclaimer:</strong> This is an independent practice portal designed for promotional assessment preparation.
            </div>
            
            <div class="form-group">
                <label>Candidate Full Name:</label>
                <input type="text" id="reg-name" placeholder="Enter candidate full name" required>
            </div>

            <div class="form-group">
                <label>Candidate Email Address:</label>
                <input type="email" id="reg-email" placeholder="candidate@example.com" required>
            </div>

            <div class="form-group">
                <label>Promotion Curriculum Stream:</label>
                <select id="reg-grade">
                    <option value="07-10">Grade Level 07 – 10 (Junior to Mid-Level Cadre)</option>
                    <option value="12-13">Grade Level 12 – 13 (Senior Management & Directorate)</option>
                </select>
            </div>

            <div class="form-group">
                <label>Practice Mode:</label>
                <select id="reg-mode">
                    <option value="exam">Timed Exam Simulation (60 Mins, 5-Infractions Auto-Submit)</option>
                    <option value="practice">Self-Paced Study Practice</option>
                </select>
            </div>

            <button class="btn" style="width: 100%; margin-top: 0.5rem;" onclick="app.toInstructions()">
                Proceed to Practice Instructions
            </button>
        </div>
    </div>

    <!-- INSTRUCTIONS VIEW -->
    <div id="view-instructions" class="view">
        <div class="card" style="max-width: 750px;">
            <div class="crest">CBT</div>
            <h2>Practice Assessment Instructions</h2>
            <p style="margin: 0.5rem 0 1.25rem 0; font-weight: 700; text-align: center; color: var(--primary); font-size: 0.9rem;">
                Review assessment rules and keyboard controls
            </p>

            <div style="background: #f8fafc; border: 1px solid var(--border); border-radius: 0.75rem; padding: 1.25rem; margin-bottom: 1.5rem; font-size: 0.85rem; line-height: 1.6;">
                <ul style="padding-left: 1.2rem; display: flex; flex-direction: column; gap: 0.65rem;">
                    <li><strong>Curriculum Scope:</strong> 40 randomized questions are extracted from the curriculum pool for the selected stream.</li>
                    <li><strong>Timer:</strong> 60 minutes countdown. Auto-submits when time expires.</li>
                    <li><strong>Anti-Cheat Security (5 Strikes Max):</strong> Navigating away from the exam window is logged. On the <strong>5th infraction</strong>, the exam will automatically submit.</li>
                    <li><strong>Keyboard Hotkeys:</strong> Use <strong>A, B, C, D</strong> to select options, and <strong>Arrow Keys / N / P</strong> to navigate.</li>
                </ul>
            </div>

            <div style="display: flex; gap: 1rem;">
                <button class="btn btn-outline" style="flex: 1;" onclick="app.showView('reg')">Back</button>
                <button class="btn" style="flex: 2;" onclick="app.startExam()">Begin Practice Assessment</button>
            </div>
        </div>
    </div>

    <!-- EXAM WORKSPACE VIEW -->
    <div id="view-exam" class="view" style="padding: 0; height: 100vh; overflow: hidden;">
        <header class="exam-header">
            <div>
                <strong id="exam-cand-name" style="font-size: 0.95rem;">Candidate</strong>
                <span style="font-size: 0.75rem; opacity: 0.8; margin-left: 0.5rem;">CBT Practice</span>
            </div>
            <div style="display: flex; align-items: center; gap: 1rem;">
                <div id="exam-infraction-badge" style="font-size: 0.8rem; background: rgba(220,38,38,0.3); border: 1px solid #ef4444; padding: 0.25rem 0.65rem; border-radius: 4px; display: none;">
                    Infractions: <span id="exam-infraction-count">0</span>/5
                </div>
                <div class="timer-box" id="exam-timer">60:00</div>
                <button class="btn btn-amber" style="padding: 0.4rem 0.85rem; font-size: 0.8rem;" onclick="app.submitExam()">Finish Practice</button>
            </div>
        </header>

        <div class="exam-body">
            <aside class="sidebar">
                <div style="font-size: 0.75rem; font-weight: 700; text-transform: uppercase; color: #64748b; margin-bottom: 0.5rem;">
                    Question Matrix (40)
                </div>
                <div class="nav-grid" id="nav-grid"></div>
            </aside>

            <main class="workspace">
                <div class="question-box">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 1rem;">
                        <span id="q-counter" style="font-size: 0.8rem; font-weight: 700; color: var(--primary);">Question 1 of 40</span>
                        <span id="q-category" style="font-size: 0.75rem; background: #e2e8f0; padding: 0.2rem 0.5rem; border-radius: 4px; font-weight: 600;">Category</span>
                    </div>
                    <h3 id="q-text" style="font-size: 1.1rem; line-height: 1.5; margin-bottom: 1.5rem; text-align: left;">Question text</h3>
                    <div id="q-options"></div>
                </div>

                <div style="display: flex; justify-content: space-between; align-items: center;" class="no-print">
                    <button class="btn btn-outline" onclick="app.prevQ()">← Previous</button>
                    <div style="font-size: 0.8rem; color: #64748b;">Hotkeys: A, B, C, D | N = Next | P = Prev</div>
                    <button class="btn btn-outline" onclick="app.nextQ()">Next →</button>
                </div>
            </main>
        </div>
    </div>

    <!-- EVALUATION RESULT VIEW -->
    <div id="view-eval" class="view">
        <div class="card" style="max-width: 800px;">
            <div class="crest">CBT</div>
            <h1>Civil Service & Health CBT Practice Portal</h1>
            <p style="text-align: center; font-size: 0.85rem; color: var(--primary); font-weight: 700; text-transform: uppercase; margin-bottom: 1.5rem;">
                Practice Assessment Evaluation Dossier
            </p>

            <div style="display: grid; grid-template-columns: 2fr 1fr; gap: 1rem; margin-bottom: 1.5rem; background: #f8fafc; padding: 1.25rem; border-radius: 0.75rem; border: 1px solid var(--border);">
                <div style="font-size: 0.85rem; line-height: 1.8;">
                    <div><strong>Candidate:</strong> <span id="res-name"></span></div>
                    <div><strong>Email:</strong> <span id="res-email"></span></div>
                    <div><strong>Curriculum Stream:</strong> Grade Level <span id="res-grade"></span></div>
                    <div><strong>Time Spent:</strong> <span id="res-time"></span></div>
                </div>
                <div style="text-align: center; border-left: 1px solid var(--border); padding-left: 1rem; display: flex; flex-direction: column; justify-content: center;">
                    <div style="font-size: 0.75rem; font-weight: 700; color: #64748b;">SCORE PERCENTAGE</div>
                    <div id="res-pct" style="font-size: 2.25rem; font-weight: 900; color: var(--primary); font-family: monospace;">0%</div>
                    <div id="res-status" style="font-weight: 800; font-size: 0.85rem; margin-top: 0.25rem;">PASS BENCHMARK</div>
                </div>
            </div>

            <div id="res-infractions-box" style="background: #fff1f2; border: 1px solid #fecdd3; padding: 0.85rem; border-radius: 0.5rem; margin-bottom: 1.5rem; font-size: 0.8rem; color: #9f1239;">
                <strong>Integrity Log:</strong> <span id="res-infractions">0 infractions logged.</span>
            </div>

            <div style="display: flex; gap: 0.75rem; flex-wrap: wrap;" class="no-print">
                <button class="btn btn-outline" style="flex: 1;" onclick="window.print()">Print Practice Slip</button>
                <button class="btn btn-outline" style="flex: 1;" onclick="location.reload()">Take New Assessment</button>
                <button class="btn btn-amber" style="flex: 1;" onclick="app.openAdminModal()">View Answer Rationale</button>
            </div>
        </div>
    </div>

    <!-- ANTI-CHEAT MODAL (5 STRIKES) -->
    <div id="modal-anti-cheat" class="modal">
        <div class="modal-content" style="max-width: 450px; text-align: center;">
            <div style="font-size: 3rem; margin-bottom: 0.5rem;">⚠️</div>
            <h3 id="ac-modal-title" style="color: var(--danger); margin-bottom: 0.5rem;">Focus Loss Detected!</h3>
            <p id="ac-modal-desc" style="font-size: 0.85rem; color: #475569; margin-bottom: 1.25rem; line-height: 1.5;">
                You navigated away from the assessment workspace.
            </p>
            <button id="ac-modal-btn" class="btn" style="width: 100%; background: var(--danger);" onclick="app.dismissAntiCheat()">Return to Assessment</button>
        </div>
    </div>

    <!-- ANSWER REVIEW MODAL -->
    <div id="modal-admin" class="modal">
        <div class="modal-content" style="max-width: 750px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; border-bottom: 1px solid var(--border); padding-bottom: 0.75rem;">
                <h3 style="font-size: 1.15rem; color: var(--primary);">Assessment Answer Review & Explanations</h3>
                <button style="border: none; background: none; font-size: 1.25rem; cursor: pointer;" onclick="app.closeAdminModal()">&times;</button>
            </div>

            <div id="admin-content" style="max-height: 60vh; overflow-y: auto;">
                <div id="admin-q-list"></div>
            </div>
        </div>
    </div>

    <script>
    const POOL = ${jsonQuestions};

    const app = {
        candidate: {},
        questions: [],
        currentIndex: 0,
        selectedAnswers: {},
        timerSec: 3600,
        timerInterval: null,
        infractions: 0,

        showView(name) {
            document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
            document.getElementById('view-' + name).classList.add('active');
        },

        toInstructions() {
            const name = document.getElementById('reg-name').value.trim();
            const email = document.getElementById('reg-email').value.trim();
            if(!name || !email) { alert('Please enter candidate name and email address.'); return; }
            app.candidate = {
                name,
                email,
                grade: document.getElementById('reg-grade').value,
                mode: document.getElementById('reg-mode').value
            };
            app.showView('instructions');
        },

        startExam() {
            try {
                if (document.documentElement.requestFullscreen) {
                    document.documentElement.requestFullscreen().catch(() => {});
                }
            } catch(e){}

            const eligible = POOL.filter(q => q.targetGrades.includes(app.candidate.grade));
            const poolToShuffle = eligible.length >= 40 ? eligible : POOL;
            const shuffled = [...poolToShuffle];
            for (let i = shuffled.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
            }
            app.questions = shuffled.slice(0, 40);
            app.currentIndex = 0;
            app.selectedAnswers = {};
            app.timerSec = 3600;
            app.infractions = 0;

            document.getElementById('exam-cand-name').innerText = app.candidate.name + ' (GL ' + app.candidate.grade + ')';

            app.renderNavGrid();
            app.renderCurrentQuestion();
            app.startTimer();
            app.showView('exam');

            // 5-Infraction Focus Tracker
            window.onblur = () => {
                if (document.getElementById('view-exam').classList.contains('active')) {
                    app.infractions++;
                    const badge = document.getElementById('exam-infraction-badge');
                    badge.style.display = 'block';
                    document.getElementById('exam-infraction-count').innerText = app.infractions;

                    const title = document.getElementById('ac-modal-title');
                    const desc = document.getElementById('ac-modal-desc');
                    const btn = document.getElementById('ac-modal-btn');

                    if (app.infractions >= 5) {
                        title.innerText = 'Security Lockout: 5 Infractions Limit Reached!';
                        desc.innerText = 'You have switched away from the exam 5 times. Your session has ended and answers have been automatically submitted.';
                        btn.innerText = 'View Evaluation Results';
                        document.getElementById('modal-anti-cheat').classList.add('active');
                        setTimeout(() => { app.submitExam(); }, 500);
                    } else {
                        title.innerText = 'Security Alert: Focus Lost (' + app.infractions + ' of 5)';
                        desc.innerText = 'You navigated away from the active window. You have ' + (5 - app.infractions) + ' warning(s) remaining before automatic submission.';
                        btn.innerText = 'Return to Assessment (' + (5 - app.infractions) + ' left)';
                        document.getElementById('modal-anti-cheat').classList.add('active');
                    }
                }
            };
        },

        startTimer() {
            clearInterval(app.timerInterval);
            app.timerInterval = setInterval(() => {
                app.timerSec--;
                const mins = Math.floor(app.timerSec / 60);
                const secs = app.timerSec % 60;
                const timerEl = document.getElementById('exam-timer');
                timerEl.innerText = String(mins).padStart(2, '0') + ':' + String(secs).padStart(2, '0');
                if (app.timerSec <= 300) timerEl.classList.add('timer-urgent');
                if (app.timerSec <= 0) {
                    clearInterval(app.timerInterval);
                    alert('Time Expired! Automatically submitting assessment.');
                    app.submitExam();
                }
            }, 1000);
        },

        renderNavGrid() {
            const grid = document.getElementById('nav-grid');
            grid.innerHTML = '';
            app.questions.forEach((q, idx) => {
                const btn = document.createElement('button');
                btn.className = 'nav-btn' + (idx === app.currentIndex ? ' current' : '') + (app.selectedAnswers[q.id] ? ' answered' : '');
                btn.innerText = String(idx + 1).padStart(2, '0');
                btn.onclick = () => { app.currentIndex = idx; app.renderCurrentQuestion(); };
                grid.appendChild(btn);
            });
        },

        renderCurrentQuestion() {
            const q = app.questions[app.currentIndex];
            document.getElementById('q-counter').innerText = 'Question ' + (app.currentIndex + 1) + ' of ' + app.questions.length;
            document.getElementById('q-category').innerText = q.category;
            document.getElementById('q-text').innerText = q.text;

            const optsBox = document.getElementById('q-options');
            optsBox.innerHTML = '';
            q.options.forEach(opt => {
                const isSelected = app.selectedAnswers[q.id] === opt.key;
                const div = document.createElement('div');
                div.className = 'option-item' + (isSelected ? ' selected' : '');
                div.innerHTML = '<div class="option-prefix">' + opt.key + '</div><div>' + opt.text + '</div>';
                div.onclick = () => {
                    app.selectedAnswers[q.id] = opt.key;
                    app.renderNavGrid();
                    app.renderCurrentQuestion();
                };
                optsBox.appendChild(div);
            });

            app.renderNavGrid();
        },

        nextQ() {
            if (app.currentIndex < app.questions.length - 1) {
                app.currentIndex++;
                app.renderCurrentQuestion();
            }
        },

        prevQ() {
            if (app.currentIndex > 0) {
                app.currentIndex--;
                app.renderCurrentQuestion();
            }
        },

        dismissAntiCheat() {
            document.getElementById('modal-anti-cheat').classList.remove('active');
            if (app.infractions >= 5) {
                app.showView('eval');
            }
        },

        submitExam() {
            clearInterval(app.timerInterval);
            let score = 0;
            app.questions.forEach(q => {
                if (app.selectedAnswers[q.id] === q.correctAnswer) score++;
            });
            const pct = Math.round((score / app.questions.length) * 100);

            document.getElementById('res-name').innerText = app.candidate.name;
            document.getElementById('res-email').innerText = app.candidate.email;
            document.getElementById('res-grade').innerText = app.candidate.grade;
            const timeTaken = 3600 - app.timerSec;
            document.getElementById('res-time').innerText = Math.floor(timeTaken / 60) + 'm ' + (timeTaken % 60) + 's';
            document.getElementById('res-pct').innerText = pct + '%';
            document.getElementById('res-status').innerText = pct >= 60 ? 'READY / PASS BENCHMARK' : 'NEEDS IMPROVEMENT';
            document.getElementById('res-status').style.color = pct >= 60 ? '#059669' : '#dc2626';
            document.getElementById('res-infractions').innerText = app.infractions >= 5
                ? '5/5 infractions reached (Assessment auto-submitted by security engine).'
                : app.infractions + ' focus loss infraction(s) logged during session.';

            app.showView('eval');
        },

        openAdminModal() {
            document.getElementById('modal-admin').classList.add('active');
            app.renderAdminList();
        },

        closeAdminModal() {
            document.getElementById('modal-admin').classList.remove('active');
        },

        renderAdminList() {
            const container = document.getElementById('admin-q-list');
            container.innerHTML = '';
            app.questions.forEach((q, idx) => {
                const userAns = app.selectedAnswers[q.id];
                const isCorrect = userAns === q.correctAnswer;
                const card = document.createElement('div');
                card.style = 'border: 1px solid ' + (isCorrect ? '#a7f3d0' : '#fecdd3') + '; background: ' + (isCorrect ? '#f0fdf4' : '#fff1f2') + '; padding: 0.85rem; border-radius: 0.5rem; margin-bottom: 0.75rem; font-size: 0.82rem;';
                card.innerHTML = '<strong>Q' + (idx + 1) + ': ' + q.text + '</strong>' +
                    '<div style="margin-top: 0.4rem;">' +
                    '<div>Candidate Choice: <strong>' + (userAns || 'None') + '</strong> ' + (isCorrect ? '✅' : '❌') + '</div>' +
                    '<div>Official Answer: <strong>' + q.correctAnswer + '</strong></div>' +
                    '<div style="color: #475569; margin-top: 0.25rem;"><em>' + q.explanation + '</em></div>' +
                    '<div style="color: #065f46; font-size: 0.75rem; margin-top: 0.2rem;">Ref: ' + q.referencePolicy + '</div>' +
                    '</div>';
                container.appendChild(card);
            });
        }
    };

    // Keyboard Shortcuts listener
    window.addEventListener('keydown', (e) => {
        if (!document.getElementById('view-exam').classList.contains('active')) return;
        const key = e.key.toUpperCase();
        if (['A', 'B', 'C', 'D'].includes(key)) {
            const q = app.questions[app.currentIndex];
            if (q) {
                app.selectedAnswers[q.id] = key;
                app.renderNavGrid();
                app.renderCurrentQuestion();
            }
        } else if (e.key === 'ArrowRight' || key === 'N') {
            app.nextQ();
        } else if (e.key === 'ArrowLeft' || key === 'P') {
            app.prevQ();
        }
    });
    </script>
</body>
</html>`;
}

export function downloadStandaloneHtmlFile() {
  const htmlContent = generateStandaloneHtml();
  const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'civil_service_cbt_practice_portal.html';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
