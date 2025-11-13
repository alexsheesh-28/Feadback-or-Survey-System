import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js";
import { getDatabase, ref, push, get, remove, set, onValue } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-database.js";

const app = initializeApp(window.firebaseConfig);
const database = getDatabase(app);

window.firebaseDB = database;
window.firebaseRef = ref;
window.firebasePush = push;
window.firebaseSet = set;
window.firebaseOnValue = onValue;

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
    const total = 18;
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
    // Validation: ensure all 11 fields are filled
    const totalFields = 11;
    const filledFields = radios.length + Array.from(texts).filter(t => t.value.trim()).length;
    if (filledFields < totalFields) {
        alert('Please fill out all fields in the feedback form.');
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
    // Validation: ensure all 18 fields are filled
    const totalFields = 18;
    const filledFields = radios.length + Array.from(texts).filter(t => t.value.trim()).length + (otherInput && otherInput.value.trim() && otherInput.style.display !== 'none' ? 1 : 0);
    if (filledFields < totalFields) {
        alert('Please fill out all fields in the survey form.');
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

    // Add event listeners to cards for navigation
    document.querySelectorAll('.card').forEach(card => {
        card.addEventListener('click', function() {
            const frameId = this.getAttribute('data-frame');
            if (frameId) {
                showFrame(frameId);
            }
        });
    });
});

// Admin login function
function adminLogin() {
    const password = prompt("Enter admin password:");
    if (password === "admin") {
        loadAdminDashboard();
    } else {
        alert("Incorrect password.");
    }
}

// Load admin dashboard with submissions
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
            let html = '<table class="admin-table"><tr><th>Type</th><th>Timestamp</th><th>Details</th><th>Actions</th></tr>';
            for (const key in data) {
                const submission = data[key];
                const details = Object.keys(submission).filter(k => k !== 'type' && k !== 'timestamp').map(k => `${k}: ${submission[k]}`).join('<br>');
                html += `<tr data-key="${key}"><td>${submission.type}</td><td>${new Date(submission.timestamp).toLocaleString()}</td><td>${details}</td><td><button class="edit-btn" onclick="editSubmission('${key}')">Edit</button><button class="delete-btn" onclick="deleteSubmission('${key}')">Delete</button></td></tr>`;
            }
            html += '</table>';
            content.innerHTML = html;
        } else {
            content.innerHTML = '<p>No submissions yet.</p>';
        }
        // Add event listener for search input
        document.getElementById('search-input').addEventListener('input', searchSubmissions);
        // Start realtime total update
        updateRealtimeTotal();
    } catch (error) {
        console.error('Error loading submissions:', error);
        alert('Failed to load submissions.');
        // Show login elements again on error
        document.querySelector('#admin .button').style.display = 'block';
        document.querySelector('#admin p').style.display = 'block';
    }
}

// Search submissions function
function searchSubmissions() {
    const query = document.getElementById('search-input').value.toLowerCase();
    const rows = document.querySelectorAll('.admin-table tr[data-key]');
    rows.forEach(row => {
        const text = row.textContent.toLowerCase();
        row.style.display = text.includes(query) ? '' : 'none';
    });
}

// Edit submission function
async function editSubmission(key) {
    try {
        const submissionsRef = window.firebaseRef(window.firebaseDB, `submissions/${key}`);
        const snapshot = await get(submissionsRef);
        const data = snapshot.val();
        if (data) {
            const form = document.getElementById('edit-form');
            let html = '';
            for (const k in data) {
                if (k !== 'type' && k !== 'timestamp') {
                    const value = data[k];
                    if (typeof value === 'string' && value.length > 50) {
                        html += `<label>${k.replace(/fb-|survey-/, '').replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}:</label><textarea class="input" data-key="${k}">${value}</textarea><br>`;
                    } else {
                        html += `<label>${k.replace(/fb-|survey-/, '').replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}:</label><input type="text" class="input" data-key="${k}" value="${value}"><br>`;
                    }
                }
            }
            form.innerHTML = html;
            document.getElementById('edit-modal').style.display = 'block';
            // Store key for saving
            window.currentEditKey = key;
        }
    } catch (error) {
        console.error('Error loading submission for edit:', error);
        alert('Failed to load submission for editing.');
    }
}

// Save edit function
async function saveEdit() {
    const key = window.currentEditKey;
    if (!key) return;
    try {
        const form = document.getElementById('edit-form');
        const inputs = form.querySelectorAll('input, textarea');
        const updates = {};
        inputs.forEach(input => {
            const k = input.getAttribute('data-key');
            updates[k] = input.value;
        });
        const submissionsRef = window.firebaseRef(window.firebaseDB, `submissions/${key}`);
        await window.firebaseSet(submissionsRef, { ...updates, type: 'Edited', timestamp: new Date().toISOString() });
        alert('Submission updated successfully.');
        closeEditModal();
        loadAdminDashboard(); // Reload dashboard
    } catch (error) {
        console.error('Error saving edit:', error);
        alert('Failed to save changes.');
    }
}

// Close edit modal
function closeEditModal() {
    document.getElementById('edit-modal').style.display = 'none';
    window.currentEditKey = null;
}

// Delete submission function
async function deleteSubmission(key) {
    if (confirm('Are you sure you want to delete this submission?')) {
        try {
            const submissionsRef = window.firebaseRef(window.firebaseDB, `submissions/${key}`);
            await remove(submissionsRef);
            alert('Submission deleted successfully.');
            loadAdminDashboard(); // Reload dashboard
        } catch (error) {
            console.error('Error deleting submission:', error);
            alert('Failed to delete submission.');
        }
    }
}

// Update realtime total
function updateRealtimeTotal() {
    const submissionsRef = window.firebaseRef(window.firebaseDB, 'submissions');
    window.firebaseOnValue(submissionsRef, (snapshot) => {
        const data = snapshot.val();
        const count = data ? Object.keys(data).length : 0;
        document.getElementById('total-respondents').textContent = count;
    });
}

// Expose functions to global window object for HTML onclick handlers
window.showFrame = showFrame;
window.updateFbProgress = updateFbProgress;
window.updateSurveyProgress = updateSurveyProgress;
window.submitFeedback = submitFeedback;
window.submitSurvey = submitSurvey;
window.resetForms = resetForms;
window.adminLogin = adminLogin;
window.loadAdminDashboard = loadAdminDashboard;
window.searchSubmissions = searchSubmissions;
window.editSubmission = editSubmission;
window.saveEdit = saveEdit;
window.closeEditModal = closeEditModal;
window.deleteSubmission = deleteSubmission;
window.updateRealtimeTotal = updateRealtimeTotal;
