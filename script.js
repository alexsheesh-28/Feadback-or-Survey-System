import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js";
import { getDatabase, ref, push, get, remove } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-database.js";

const app = initializeApp(window.firebaseConfig);
const database = getDatabase(app);

window.firebaseDB = database;
window.firebaseRef = ref;
window.firebasePush = push;

function showFrame(id) {
    document.querySelectorAll('.frame').forEach(f => f.style.display = 'none');
    document.getElementById(id).style.display = 'block';
}

function updateFbProgress() {
    const total = 11;
    let completed = 0;
    const radios = document.querySelectorAll('#feedback input[type="radio"]:checked');
    const texts = document.querySelectorAll('#feedback textarea');
    completed += radios.length;
    texts.forEach(t => { if (t.value.trim()) completed++; });
    document.getElementById('fb-progress').textContent = `${completed}/${total}`;
    document.getElementById('fb-progress-fill').style.width = `${(completed / total) * 100}%`;
}

function updateSurveyProgress() {
    const total = 20;
    let completed = 0;
    const radios = document.querySelectorAll('#survey input[type="radio"]:checked');
    const texts = document.querySelectorAll('#survey textarea');
    const otherInput = document.getElementById('survey-hear-other');
    completed += radios.length;
    texts.forEach(t => { if (t.value.trim()) completed++; });
    if (otherInput && otherInput.value.trim() && otherInput.style.display !== 'none') completed++;
    document.getElementById('survey-progress').textContent = `${completed}/${total}`;
    document.getElementById('survey-progress-fill').style.width = `${(completed / total) * 100}%`;
}

async function submitFeedback() {
    const data = { type: 'Feedback', timestamp: new Date().toISOString() };
    const radios = document.querySelectorAll('#feedback input[type="radio"]:checked');
    radios.forEach(r => data[r.name] = r.value);
    const texts = document.querySelectorAll('#feedback textarea');
    texts.forEach(t => { if (t.value.trim()) data[t.id] = t.value; });
    // Basic validation: ensure at least some fields are filled
    if (Object.keys(data).length <= 2) { // only type and timestamp
        alert('Please fill out the feedback form.');
        return;
    }
    const saved = await saveToStorage(data);
    if (saved) {
        showSummary(data);
    }
}

async function submitSurvey() {
    const data = { type: 'Survey', timestamp: new Date().toISOString() };
    const radios = document.querySelectorAll('#survey input[type="radio"]:checked');
    radios.forEach(r => data[r.name] = r.value);
    const texts = document.querySelectorAll('#survey textarea');
    texts.forEach(t => { if (t.value.trim()) data[t.id] = t.value; });
    const otherInput = document.getElementById('survey-hear-other');
    if (otherInput && otherInput.value.trim()) data['survey-hear-other'] = otherInput.value;
    if (Object.keys(data).length <= 2) { 
        alert('Please fill out the survey form.');
        return;
    }
    const saved = await saveToStorage(data);
    if (saved) {
        showSummary(data);
    }
}

async function saveToStorage(data) {
    try {
        const submissionsRef = window.firebaseRef(window.firebaseDB, 'submissions');
        await window.firebasePush(submissionsRef, data);
        console.log('Data saved to Firebase');
        return true;
    } catch (error) {
        console.error('Error saving to Firebase:', error);
        alert('Failed to save submission. Please try again.');
        return false;
    }
}

function showSummary(data) {
    const content = document.getElementById('summary-content');
    let html = '<h3>Submission Details</h3>';
    html += '<p><strong>Type:</strong> ' + data.type + '</p>';
    html += '<p><strong>Timestamp:</strong> ' + new Date(data.timestamp).toLocaleString() + '</p>';
    html += '<ul>';
    for (const key in data) {
        if (key !== 'type' && key !== 'timestamp') {
            const value = data[key].toString().replace(/</g, '<').replace(/>/g, '>');
            html += '<li><strong>' + key.replace(/fb-|survey-/, '').replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) + ':</strong> ' + value + '</li>';
        }
    }
    html += '</ul>';
    content.innerHTML = html;
    showFrame('summary');
}

function resetForms() {
    document.querySelectorAll('input, textarea, select').forEach(el => el.value = '');
    document.querySelectorAll('input[type="radio"]').forEach(r => r.checked = false);
    updateFbProgress();
    updateSurveyProgress();
    showFrame('home');
}

document.addEventListener('DOMContentLoaded', function() {
    document.querySelectorAll('input[name="survey-hear"]').forEach(r => {
        r.addEventListener('change', function() {
            document.getElementById('survey-hear-other').style.display = this.value === 'Other' ? 'block' : 'none';
        });
    });

    // Add event listeners
    document.querySelectorAll('.card').forEach(card => {
        card.addEventListener('click', function() {
            const frameId = this.getAttribute('data-frame');
            if (frameId) {
                showFrame(frameId);
            }
        });
    });
});

// Admin login
function adminLogin() {
    const password = prompt("Enter admin password:");
    if (password === "admin") {
        loadAdminDashboard();
    } else {
        alert("Incorrect password.");
    }
}

// Load admin dashboard
async function loadAdminDashboard() {
    // Hide login elements
    document.querySelector('#admin .button').style.display = 'none';
    document.querySelector('#admin p').style.display = 'none';

    try {
        const submissionsRef = window.firebaseRef(window.firebaseDB, 'submissions');
        const snapshot = await get(submissionsRef);
        const data = snapshot.val();
        const content = document.getElementById('admin-content');
        if (data) {
            let html = '<h3>Submissions</h3><table class="admin-table"><tr><th>Type</th><th>Timestamp</th><th>Details</th></tr>';
            for (const key in data) {
                const submission = data[key];
                const details = Object.keys(submission).filter(k => k !== 'type' && k !== 'timestamp').map(k => `${k}: ${submission[k]}`).join('<br>');
                html += `<tr><td>${submission.type}</td><td>${new Date(submission.timestamp).toLocaleString()}</td><td>${details}</td></tr>`;
            }
            html += '</table>';
            content.innerHTML = html;
        } else {
            content.innerHTML = '<p>No submissions yet.</p>';
        }
    } catch (error) {
        console.error('Error loading submissions:', error);
        alert('Failed to load submissions.');
        // Show login elements on error
        document.querySelector('#admin .button').style.display = 'block';
        document.querySelector('#admin p').style.display = 'block';
    }
}

// Expose functions
window.showFrame = showFrame;
window.updateFbProgress = updateFbProgress;
window.updateSurveyProgress = updateSurveyProgress;
window.submitFeedback = submitFeedback;
window.submitSurvey = submitSurvey;
window.resetForms = resetForms;
window.adminLogin = adminLogin;
window.loadAdminDashboard = loadAdminDashboard;

