/*
 * app.js
 * Core logic for Iron Log PWA
 */

// --- 1. Configuration & Data ---

const DEFAULT_TRAINING_DAYS = {
  "training_days": [
    {
      "id": "squat_day",
      "name": "Squat Day",
      "main_lift": { "exercise_id": "back_squat", "name": "Back Squat", "sets": 5, "reps": 5, "rest_seconds": 120, "intensity_note": "Heavy (75–85% 1RM)" },
      "accessories": [
        { "exercise_id": "romanian_deadlift", "name": "Romanian Deadlift", "sets": 4, "reps": 8, "rest_seconds": 90 },
        { "exercise_id": "walking_lunges", "name": "Walking Lunges", "sets": 3, "reps": "10 each leg", "rest_seconds": 60 },
        { "exercise_id": "leg_press", "name": "Leg Press", "sets": 3, "reps": 12, "rest_seconds": 60 },
        { "exercise_id": "calf_raises", "name": "Calf Raises", "sets": 4, "reps": 12, "rest_seconds": 45 },
        { "exercise_id": "barbell_row", "name": "Barbell Row", "sets": 4, "reps": 8, "rest_seconds": 90 },
        { "exercise_id": "face_pulls", "name": "Face Pulls", "sets": 3, "reps": 15, "rest_seconds": 45 },
        { "exercise_id": "hanging_leg_raises", "name": "Hanging Leg Raises", "sets": 3, "reps": 10, "rest_seconds": 45 }
      ]
    },
    {
      "id": "bench_day",
      "name": "Bench Day",
      "main_lift": { "exercise_id": "bench_press", "name": "Bench Press", "sets": 5, "reps": 5, "rest_seconds": 120, "intensity_note": "Heavy (75–85% 1RM)" },
      "accessories": [
        { "exercise_id": "overhead_press", "name": "Overhead Press", "sets": 4, "reps": 6, "rest_seconds": 90 },
        { "exercise_id": "lat_pulldown", "name": "Lat Pulldown or Pull-Ups", "sets": 3, "reps": 8, "rest_seconds": 90 },
        { "exercise_id": "incline_dumbbell_press", "name": "Incline Dumbbell Press", "sets": 3, "reps": 10, "rest_seconds": 75 },
        { "exercise_id": "lateral_raises", "name": "Dumbbell Lateral Raises", "sets": 3, "reps": 12, "rest_seconds": 45 },
        { "exercise_id": "triceps_pushdowns", "name": "Triceps Pushdowns", "sets": 3, "reps": 12, "rest_seconds": 45 },
        { "exercise_id": "bicep_curls", "name": "Bicep Curls", "sets": 3, "reps": 10, "rest_seconds": 45 },
        { "exercise_id": "rear_delt_flyes", "name": "Rear Delt Flyes", "sets": 3, "reps": 15, "rest_seconds": 45 }
      ]
    },
    {
      "id": "deadlift_day",
      "name": "Deadlift Day",
      "main_lift": { "exercise_id": "deadlift", "name": "Deadlift", "sets": 5, "reps": 3, "rest_seconds": 150, "intensity_note": "Heavy (80–90% 1RM)" },
      "accessories": [
        { "exercise_id": "seated_cable_row", "name": "Seated Cable Row", "sets": 4, "reps": 10, "rest_seconds": 90 },
        { "exercise_id": "hip_thrusts", "name": "Hip Thrusts", "sets": 3, "reps": 8, "rest_seconds": 90 },
        { "exercise_id": "hamstring_curls", "name": "Hamstring Curls", "sets": 3, "reps": 12, "rest_seconds": 60 },
        { "exercise_id": "shrugs", "name": "Shrugs", "sets": 3, "reps": 12, "rest_seconds": 60 },
        { "exercise_id": "hammer_curls", "name": "Hammer Curls", "sets": 3, "reps": 10, "rest_seconds": 45 },
        { "exercise_id": "triceps_rope_extensions", "name": "Triceps Rope Extensions", "sets": 3, "reps": 12, "rest_seconds": 45 },
        { "exercise_id": "cable_crunch", "name": "Cable Crunch", "sets": 3, "reps": 12, "rest_seconds": 45 }
      ]
    }
  ]
};

// --- 2. Data Service (IndexedDB with Fallback) ---

const DB_NAME = 'IronLogDB';
const DB_VERSION = 1;
const STORE_NAME = 'sessions';

const DataService = {
    db: null,
    
    async init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, DB_VERSION);
            request.onerror = () => resolve(false); // Fallback to local storage conceptually if needed
            request.onsuccess = (e) => {
                this.db = e.target.result;
                resolve(true);
            };
            request.onupgradeneeded = (e) => {
                const db = e.target.result;
                if (!db.objectStoreNames.contains(STORE_NAME)) {
                    db.createObjectStore(STORE_NAME, { keyPath: 'date' });
                }
            };
        });
    },

    async getSession(date) {
        if (!this.db) return JSON.parse(localStorage.getItem('session_' + date) || 'null');
        return new Promise((resolve) => {
            const tx = this.db.transaction([STORE_NAME], 'readonly');
            const req = tx.objectStore(STORE_NAME).get(date);
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => resolve(null);
        });
    },

    async saveSession(session) {
        session.updatedAt = new Date().toISOString();
        if (!this.db) {
            localStorage.setItem('session_' + session.date, JSON.stringify(session));
            return;
        }
        return new Promise((resolve) => {
            const tx = this.db.transaction([STORE_NAME], 'readwrite');
            tx.objectStore(STORE_NAME).put(session);
            tx.oncomplete = () => resolve();
        });
    },

    async getAllSessions() {
        if (!this.db) return []; // LocalStorage fallback not fully implemented for history scan to keep code small
        return new Promise((resolve) => {
            const tx = this.db.transaction([STORE_NAME], 'readonly');
            const req = tx.objectStore(STORE_NAME).getAll();
            req.onsuccess = () => resolve(req.result || []);
        });
    },

    async clearData() {
        if (!this.db) localStorage.clear();
        else {
            const tx = this.db.transaction([STORE_NAME], 'readwrite');
            tx.objectStore(STORE_NAME).clear();
        }
    }
};

// --- 3. App Logic & UI ---

const App = {
    currentDate: new Date().toISOString().split('T')[0],
    currentSession: null,
    settings: { sound: true },
    timerInterval: null,

    async init() {
        await DataService.init();
        this.loadSettings();
        this.setupEventListeners();
        this.loadDailyView();
        
        // Service Worker
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('./sw.js');
        }
    },

    loadSettings() {
        const saved = localStorage.getItem('app_settings');
        if (saved) this.settings = JSON.parse(saved);
    },

    saveSettings() {
        localStorage.setItem('app_settings', JSON.stringify(this.settings));
    },

    async loadDailyView() {
        const existing = await DataService.getSession(this.currentDate);
        
        document.getElementById('header-date').textContent = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
        
        if (existing) {
            this.currentSession = existing;
            this.renderSession(existing);
        } else {
            // Show day selector
            this.showDaySelector();
        }
    },

    showDaySelector() {
        const modal = document.getElementById('day-selector-modal');
        const list = document.getElementById('day-options-list');
        list.innerHTML = '';

        DEFAULT_TRAINING_DAYS.training_days.forEach(day => {
            const btn = document.createElement('button');
            btn.textContent = day.name;
            btn.onclick = () => this.startNewSession(day);
            list.appendChild(btn);
        });

        modal.showModal();
    },

    startNewSession(template) {
        const exercises = [];
        
        // Transform template to tracking model
        const addEx = (ex) => {
            const sets = [];
            const repStr = ex.reps.toString();
            for (let i = 0; i < ex.sets; i++) {
                sets.push({ 
                    id: i, 
                    targetReps: repStr, 
                    actualReps: repStr.replace(/\D/g,'') || 0, // simplistic parse
                    weight: '', 
                    completed: false 
                });
            }
            exercises.push({
                id: ex.exercise_id,
                name: ex.name,
                rest: ex.rest_seconds,
                sets: sets,
                note: ex.intensity_note || ''
            });
        };

        addEx(template.main_lift);
        template.accessories.forEach(acc => addEx(acc));

        this.currentSession = {
            date: this.currentDate,
            training_day_id: template.id,
            training_day_name: template.name,
            exercises: exercises,
            createdAt: new Date().toISOString()
        };

        DataService.saveSession(this.currentSession);
        document.getElementById('day-selector-modal').close();
        this.renderSession(this.currentSession);
    },

    renderSession(session) {
        const container = document.getElementById('app-container');
        document.getElementById('header-subtitle').textContent = session.training_day_name;
        container.innerHTML = '';

        session.exercises.forEach((ex, exIndex) => {
            const card = document.createElement('div');
            card.className = 'exercise-card';
            
            let setsHtml = '';
            ex.sets.forEach((set, setIndex) => {
                setsHtml += `
                    <div class="set-row">
                        <span>${setIndex + 1}</span>
                        <input type="number" class="set-input" placeholder="${set.targetReps}" value="${set.actualReps}" data-ex="${exIndex}" data-set="${setIndex}" data-field="actualReps">
                        <input type="text" class="set-input" placeholder="kg/lb" value="${set.weight}" data-ex="${exIndex}" data-set="${setIndex}" data-field="weight">
                        <button class="set-btn ${set.completed ? 'completed' : ''}" data-ex="${exIndex}" data-set="${setIndex}" data-action="toggle">
                            ${set.completed ? '✓' : 'Start'}
                        </button>
                    </div>
                `;
            });

            card.innerHTML = `
                <div class="exercise-header">
                    <span class="exercise-name">${ex.name}</span>
                    <small>${ex.rest}s rest</small>
                </div>
                ${ex.note ? `<p class="exercise-note">${ex.note}</p>` : ''}
                <div style="margin-top:12px;">
                    <div class="sets-grid">
                        <span class="set-header">Set</span>
                        <span class="set-header">Reps</span>
                        <span class="set-header">Weight</span>
                        <span class="set-header">Log</span>
                        ${setsHtml}
                    </div>
                </div>
            `;
            container.appendChild(card);
        });

        this.updateProgress();
    },

    handleSetInteraction(target) {
        const exIdx = target.dataset.ex;
        const setIdx = target.dataset.set;
        const set = this.currentSession.exercises[exIdx].sets[setIdx];

        if (target.dataset.action === 'toggle') {
            set.completed = !set.completed;
            target.classList.toggle('completed');
            target.textContent = set.completed ? '✓' : 'Start';
            
            if (set.completed) {
                this.startRestTimer(this.currentSession.exercises[exIdx].rest);
            }
        } 
        
        this.saveState();
    },

    handleInput(target) {
        const exIdx = target.dataset.ex;
        const setIdx = target.dataset.set;
        const field = target.dataset.field;
        this.currentSession.exercises[exIdx].sets[setIdx][field] = target.value;
        this.saveState();
    },

    saveState() {
        DataService.saveSession(this.currentSession);
        this.updateProgress();
    },

    updateProgress() {
        let total = 0;
        let done = 0;
        this.currentSession.exercises.forEach(ex => {
            ex.sets.forEach(s => {
                total++;
                if(s.completed) done++;
            });
        });

        const pct = total === 0 ? 0 : Math.round((done / total) * 100);
        const offset = 100 - pct; // circumference approx 100 for pathLength calculation simplicity, but we used specific SVG
        // SVG radius 16 -> Circ = 100.5. Stroke-dasharray 100.
        const circle = document.querySelector('.progress-ring__circle');
        const circumference = 2 * Math.PI * 16;
        circle.style.strokeDasharray = `${circumference} ${circumference}`;
        circle.style.strokeDashoffset = circumference - (pct / 100) * circumference;
        document.getElementById('progress-text').textContent = `${pct}%`;
    },

    // --- Timer Logic ---
    startRestTimer(seconds) {
        const overlay = document.getElementById('timer-overlay');
        const display = document.getElementById('timer-display');
        overlay.classList.remove('hidden');

        let remaining = seconds;
        display.textContent = this.formatTime(remaining);

        if (this.timerInterval) clearInterval(this.timerInterval);

        const endTime = Date.now() + (seconds * 1000);

        this.timerInterval = setInterval(() => {
            const now = Date.now();
            remaining = Math.ceil((endTime - now) / 1000);

            if (remaining <= 0) {
                this.stopTimer();
                this.notifyTimerEnd();
            } else {
                display.textContent = this.formatTime(remaining);
            }
        }, 200);
    },

    stopTimer() {
        clearInterval(this.timerInterval);
        document.getElementById('timer-overlay').classList.add('hidden');
    },

    notifyTimerEnd() {
        if (this.settings.sound) {
            // Simple Beep using AudioContext
            const ctx = new (window.AudioContext || window.webkitAudioContext)();
            const osc = ctx.createOscillator();
            osc.type = 'sine';
            osc.frequency.value = 800;
            osc.connect(ctx.destination);
            osc.start();
            osc.stop(ctx.currentTime + 0.2);
            
            // Vibrate if supported
            if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
        }
        this.showToast("Rest finished!");
    },

    formatTime(sec) {
        const m = Math.floor(sec / 60);
        const s = sec % 60;
        return `${m}:${s < 10 ? '0' : ''}${s}`;
    },

    showToast(msg) {
        const t = document.getElementById('toast');
        t.textContent = msg;
        t.classList.remove('hidden');
        t.style.opacity = 1;
        setTimeout(() => {
            t.style.opacity = 0;
            setTimeout(() => t.classList.add('hidden'), 300);
        }, 2000);
    },

    // --- Event Listeners & Routing ---
    setupEventListeners() {
        // Global delegation for inputs and buttons in cards
        document.getElementById('app-container').addEventListener('click', (e) => {
            if (e.target.tagName === 'BUTTON' && e.target.dataset.action) {
                this.handleSetInteraction(e.target);
            }
        });

        document.getElementById('app-container').addEventListener('input', (e) => {
            if (e.target.tagName === 'INPUT') {
                this.handleInput(e.target);
            }
        });

        // Menus
        const menuModal = document.getElementById('menu-modal');
        document.getElementById('fab-menu').onclick = () => menuModal.showModal();
        document.getElementById('btn-close-menu').onclick = () => menuModal.close();

        // Change Day
        document.getElementById('btn-change-day').onclick = () => {
            menuModal.close();
            this.showDaySelector();
        };

        // History
        document.getElementById('btn-history').onclick = async () => {
            const history = await DataService.getAllSessions();
            const list = document.getElementById('history-list');
            list.innerHTML = '';
            
            // Sort desc
            history.sort((a, b) => new Date(b.date) - new Date(a.date));

            history.forEach(h => {
                const btn = document.createElement('button');
                btn.innerHTML = `<b>${h.date}</b> - ${h.training_day_name}`;
                btn.onclick = () => {
                   // Simple view mode: load it as current session (careful: this edits history)
                   // For this MVP, we allow editing history as if it's active
                   this.currentSession = h;
                   this.renderSession(h);
                   document.getElementById('history-modal').close();
                   menuModal.close();
                };
                list.appendChild(btn);
            });
            document.getElementById('history-modal').showModal();
        };
        document.getElementById('btn-close-history').onclick = () => document.getElementById('history-modal').close();

        // Settings
        const settingsModal = document.getElementById('settings-modal');
        document.getElementById('btn-settings').onclick = () => {
            menuModal.close();
            settingsModal.showModal();
        };
        document.getElementById('btn-close-settings').onclick = () => settingsModal.close();
        
        // Settings Actions
        document.getElementById('setting-sound').checked = this.settings.sound;
        document.getElementById('setting-sound').onchange = (e) => {
            this.settings.sound = e.target.checked;
            this.saveSettings();
        };

        document.getElementById('btn-reset').onclick = async () => {
            if(confirm("Are you sure? This will permanently delete local data.")) {
                await DataService.clearData();
                location.reload();
            }
        };

        // Export / Import
        document.getElementById('btn-export').onclick = async () => {
            const data = await DataService.getAllSessions();
            const blob = new Blob([JSON.stringify(data, null, 2)], {type : 'application/json'});
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `iron-log-backup-${this.currentDate}.json`;
            a.click();
        };

        document.getElementById('btn-import').onclick = () => document.getElementById('file-import').click();
        document.getElementById('file-import').onchange = (e) => {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = async (ev) => {
                try {
                    const sessions = JSON.parse(ev.target.result);
                    for (const s of sessions) await DataService.saveSession(s);
                    alert("Import successful. Reloading.");
                    location.reload();
                } catch(err) {
                    alert("Invalid JSON file.");
                }
            };
            reader.readAsText(file);
        };

        // Timer
        document.getElementById('btn-skip-timer').onclick = () => this.stopTimer();
    }
};

// Start App
window.addEventListener('DOMContentLoaded', () => App.init());
