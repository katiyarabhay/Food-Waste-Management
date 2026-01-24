import firebaseConfig, { ADMIN_EMAILS } from './firebase-config.js';
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.2.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut, updatePassword } from "https://www.gstatic.com/firebasejs/11.2.0/firebase-auth.js";
import { getDatabase, ref, get, update } from "https://www.gstatic.com/firebasejs/11.2.0/firebase-database.js";

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);

// Configuration moved to firebase-config.js

// DOM Elements
const loadingOverlay = document.getElementById('loading-overlay');
const adminContent = document.getElementById('admin-content');
const donationsList = document.getElementById('donations-list');
const noDataMsg = document.getElementById('no-data-msg');
const refreshBtn = document.getElementById('refresh-btn');
const logoutBtn = document.getElementById('logout-btn');


// Check Admin Access
onAuthStateChanged(auth, (user) => {
    if (user) {
        if (ADMIN_EMAILS.includes(user.email)) {
            console.log("Admin access granted:", user.email);
            loadingOverlay.style.display = 'none';
            adminContent.style.display = 'block';
            loadDonations();
        } else {
            alert("Access Denied: You are not authorized to view this page.");
            window.location.href = "index.html";
        }
    } else {
        // Redirect to login if not signed in
        window.location.href = "login.html";
    }
});

// Load All Donations
async function loadDonations() {
    donationsList.innerHTML = '';
    noDataMsg.style.display = 'none';

    try {
        const donationsRef = ref(db, 'donations');
        const snapshot = await get(donationsRef);

        if (snapshot.exists()) {
            const data = snapshot.val();
            // Convert to array with ID to keep track of keys for updates
            const donations = Object.entries(data).map(([key, value]) => ({
                id: key,
                ...value
            }));

            // Calculate Metrics
            const total = donations.length;
            const pending = donations.filter(d => !d.status || d.status.toLowerCase() === 'pending').length;
            const received = donations.filter(d => d.status && ['received', 'confirmed', 'completed'].includes(d.status.toLowerCase())).length;

            document.getElementById('count-total').textContent = total;
            document.getElementById('count-pending').textContent = pending;
            document.getElementById('count-received').textContent = received;

            // Sort by timestamp descending
            donations.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

            donations.forEach(donation => {
                renderDonationRow(donation);
            });
        } else {
            noDataMsg.style.display = 'block';
        }
    } catch (error) {
        console.error("Error loading donations:", error);
        alert("Error loading data: " + error.message);
    }
}

function renderDonationRow(donation) {
    const date = new Date(donation.timestamp).toLocaleDateString() + ' ' + new Date(donation.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    let statusClass = "status-pending";
    let statusText = donation.status || "Pending";
    const lowerStatus = statusText.toLowerCase();

    if (['received', 'confirmed', 'completed'].includes(lowerStatus)) {
        statusClass = "status-completed";
    } else if (['rejected', 'cancelled'].includes(lowerStatus)) {
        statusClass = "status-rejected";
    }

    const row = document.createElement('tr');
    row.innerHTML = `
        <td>${date}</td>
        <td>${donation.name || 'Anonymous'}<br><small>${donation.linkedUserEmail || ''}</small></td>
        <td>${donation.phone || '-'}<br>${donation.email || '-'}</td>
        <td>${donation.category}</td>
        <td>${donation.quantity}</td>
        <td><small>Addr: ${donation.address || '-'}<br>Msg: ${donation.message || '-'}</small></td>
        <td><span class="${statusClass}" id="status-${donation.id}">${statusText}</span></td>
        <td>
            <button class="action-btn btn-approve" onclick="updateStatus('${donation.id}', 'Received')">Accept</button>
            <button class="action-btn btn-reject" onclick="updateStatus('${donation.id}', 'Rejected')">Reject</button>
        </td>
    `;
    donationsList.appendChild(row);
}

// Make functions accessible globally for onclick events
window.updateStatus = async (donationId, newStatus) => {
    if (!confirm(`Are you sure you want to mark this donation as ${newStatus}?`)) return;

    try {
        const donationRef = ref(db, `donations/${donationId}`);
        await update(donationRef, { status: newStatus });

        // Optimistic update in UI or reload? 
        // We can just reload for simplicity or update the specific span
        loadDonations();
        // alert(`Donation marked as ${newStatus}`);

    } catch (error) {
        console.error("Error updating status:", error);
        alert("Failed to update status.");
    }
};

refreshBtn.addEventListener('click', loadDonations);

logoutBtn.addEventListener('click', async () => {
    await signOut(auth);
    window.location.href = "login.html";
});

// --- Admin Settings Modal Logic ---
const settingsBtn = document.getElementById('settings-btn');
const settingsModal = document.getElementById('settings-modal');
const closeSettingsBtn = document.getElementById('close-settings');
const adminUpdatePasswordBtn = document.getElementById('admin-update-password-btn');
const adminNewPassInput = document.getElementById('admin-new-password');
const adminConfirmPassInput = document.getElementById('admin-confirm-password');

// Open Modal
if (settingsBtn) {
    settingsBtn.addEventListener('click', () => {
        settingsModal.style.display = 'block';
    });
}

// Close Modal
if (closeSettingsBtn) {
    closeSettingsBtn.addEventListener('click', () => {
        settingsModal.style.display = 'none';
    });
}

// Close on outside click
window.addEventListener('click', (e) => {
    if (e.target === settingsModal) {
        settingsModal.style.display = 'none';
    }
});

// Update Password
if (adminUpdatePasswordBtn) {
    adminUpdatePasswordBtn.addEventListener('click', async () => {
        const newPass = adminNewPassInput.value;
        const confirmPass = adminConfirmPassInput.value;

        if (newPass.length < 6) return alert("Password must be at least 6 characters.");
        if (newPass !== confirmPass) return alert("Passwords do not match.");

        adminUpdatePasswordBtn.disabled = true;
        adminUpdatePasswordBtn.textContent = "Updating...";

        try {
            await updatePassword(auth.currentUser, newPass);
            alert("Admin password updated successfully!");
            adminNewPassInput.value = '';
            adminConfirmPassInput.value = '';
            settingsModal.style.display = 'none';
        } catch (error) {
            console.error("Admin Password Update Error:", error);
            if (error.code === 'auth/requires-recent-login') {
                alert("For security, please logout and login again before changing your password.");
                await signOut(auth);
                window.location.href = "login.html";
            } else {
                alert("Failed to update password: " + error.message);
            }
        } finally {
            adminUpdatePasswordBtn.disabled = false;
            adminUpdatePasswordBtn.textContent = "Update Password";
        }
    });
}
