import firebaseConfig, { ADMIN_EMAILS } from './firebase-config.js';
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.2.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut, updateProfile, updatePassword } from "https://www.gstatic.com/firebasejs/11.2.0/firebase-auth.js";
import { getDatabase, ref, query, orderByChild, equalTo, get, onValue, off } from "https://www.gstatic.com/firebasejs/11.2.0/firebase-database.js";

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);

// DOM Elements
const loadingDiv = document.getElementById('loading');
const profileContentDiv = document.getElementById('profile-content');
const userEmailSpan = document.getElementById('user-email');
const displayNameView = document.getElementById('display-name-view');
const logoutBtn = document.getElementById('logout-btn');

// Settings Elements
const updateNameInput = document.getElementById('update-name');
const updateProfileBtn = document.getElementById('update-profile-btn');

// History Elements
const historyLoading = document.getElementById('history-loading');
const historyTable = document.getElementById('history-table');
const historyList = document.getElementById('history-list');
const noHistoryMsg = document.getElementById('no-history-msg');

// Tracking Map Elements
const mapModal = document.getElementById('map-modal');
const closeMapBtn = document.querySelector('.close-map');
const trackStatusSpan = document.getElementById('track-status');
let mapInstance = null;
let markerInstance = null;
let currentTrackingRef = null;


// Check Auth State
onAuthStateChanged(auth, async (user) => {
    if (user) {
        // Redirect Admin to Admin Dashboard
        if (ADMIN_EMAILS.includes(user.email)) {
            window.location.href = "admin.html";
            return;
        }

        // User is signed in
        console.log("User found:", user.email);
        userEmailSpan.textContent = user.email;
        displayNameView.textContent = user.displayName || "Not Set";
        updateNameInput.value = user.displayName || "";

        loadingDiv.style.display = 'none';
        profileContentDiv.style.display = 'block';

        // Load Donation History
        loadDonationHistory(user.email);

    } else {
        // User is signed out
        console.log("No user found, redirecting to login...");
        window.location.href = "login.html";
    }
});

// Load Donation History Function
async function loadDonationHistory(email) {
    historyLoading.style.display = 'block';
    historyTable.style.display = 'none';
    noHistoryMsg.style.display = 'none';
    historyList.innerHTML = '';

    try {
        // Fetch all donations and filter client-side to avoid "Index not defined" errors
        const donationsRef = ref(db, 'donations');
        const snapshot = await get(donationsRef);

        if (snapshot.exists()) {
            const data = snapshot.val();
            const donations = Object.entries(data).map(([key, val]) => ({ id: key, ...val }));

            // Filter by email or userId
            const userDonations = donations.filter(donation => {
                return (donation.email === email) ||
                    (donation.userId && auth.currentUser && donation.userId === auth.currentUser.uid) ||
                    (donation.linkedUserEmail === email);
            });

            if (userDonations.length > 0) {
                // Sort by timestamp descending
                userDonations.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

                userDonations.forEach(donation => {
                    const date = new Date(donation.timestamp).toLocaleDateString();

                    // Determine Status and Class
                    let statusText = donation.status || "Submitted";
                    let statusClass = "status-pending"; // Default orange
                    let actionHtml = "";

                    // Normalize for comparison
                    const lowerStatus = statusText.toLowerCase();

                    if (lowerStatus === 'received' || lowerStatus === 'confirmed' || lowerStatus === 'completed') {
                        statusClass = "status-completed"; // Green
                        statusText = "Received";
                    } else if (lowerStatus === 'rejected' || lowerStatus === 'cancelled') {
                        statusClass = "status-rejected";
                    } else if (lowerStatus === 'in progress') {
                        statusClass = "status-completed"; // Re-use green or create blue
                        statusText = "In Progress";
                        if (donation.assignedTo) {
                            actionHtml = `<button class="btn btn-primary" style="padding: 4px 8px; font-size: 0.8em;" onclick="window.trackDonation('${donation.assignedTo}')">Track Live</button>`;
                        }
                    }

                    const row = document.createElement('tr');
                    row.innerHTML = `
                        <td>${date}</td>
                        <td>${donation.category}</td>
                        <td>${donation.quantity}</td>
                        <td>
                            <span class="${statusClass}">${statusText}</span>
                            ${actionHtml}
                        </td>
                    `;
                    historyList.appendChild(row);
                });

                historyTable.style.display = 'table';
            } else {
                noHistoryMsg.style.display = 'block';
            }

        } else {
            noHistoryMsg.style.display = 'block';
        }

    } catch (error) {
        console.error("Error loading history:", error);
        noHistoryMsg.textContent = "Error loading history.";
        noHistoryMsg.style.display = 'block';
    } finally {
        historyLoading.style.display = 'none';
    }
}


// --- Tracking Logic ---
window.trackDonation = (assignedPartnerUid) => {
    mapModal.style.display = 'block';
    trackStatusSpan.innerText = "Connecting to partner...";

    // Initialize Map
    if (!mapInstance) {
        mapInstance = L.map('track-map').setView([20.5937, 78.9629], 5); // Default India view
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap'
        }).addTo(mapInstance);
    }

    // Subscribe to location updates
    const locRef = ref(db, `locations/${assignedPartnerUid}`);
    currentTrackingRef = locRef; // Save ref to unsubscribe later

    onValue(locRef, (snapshot) => {
        if (snapshot.exists()) {
            const data = snapshot.val();
            const { lat, lng, timestamp } = data;

            // Update Marker
            if (markerInstance) {
                markerInstance.setLatLng([lat, lng]);
            } else {
                markerInstance = L.marker([lat, lng], {
                    icon: L.icon({
                        iconUrl: 'https://cdn-icons-png.flaticon.com/512/3304/3304567.png',
                        iconSize: [38, 38],
                        iconAnchor: [19, 38]
                    })
                }).addTo(mapInstance).bindPopup("Your Delivery Hero");
            }

            // Center Map
            mapInstance.setView([lat, lng], 15);
            trackStatusSpan.innerText = `Updating Live... Last seen: ${new Date(timestamp).toLocaleTimeString()}`;

        } else {
            trackStatusSpan.innerText = "Partner location not available (Offline or GPS off)";
        }
    });
};

// Close Map & Cleanup
const closeMap = () => {
    mapModal.style.display = 'none';
    if (currentTrackingRef) {
        off(currentTrackingRef); // Unsubscribe
        currentTrackingRef = null;
    }
};

if (closeMapBtn) closeMapBtn.onclick = closeMap;
window.onclick = (e) => {
    if (e.target == mapModal) closeMap();
};


// Handle Logout
logoutBtn.addEventListener('click', async () => {
    try {
        await signOut(auth);
        alert("Logged out successfully.");
        window.location.href = "login.html";
    } catch (error) {
        console.error("Logout Error:", error);
        alert("Error logging out: " + error.message);
    }
});

// Handle Profile Update
updateProfileBtn.addEventListener('click', async () => {
    const newName = updateNameInput.value.trim();
    if (!newName) return alert("Please enter a name.");

    updateProfileBtn.disabled = true;
    updateProfileBtn.textContent = "Saving...";

    try {
        await updateProfile(auth.currentUser, {
            displayName: newName
        });

        alert("Profile updated successfully!");
        displayNameView.textContent = newName;

    } catch (error) {
        console.error("Update Error:", error);
        alert("Failed to update profile: " + error.message);
    } finally {
        updateProfileBtn.disabled = false;
        updateProfileBtn.textContent = "Save Changes";
    }
});

// Handle Password Update
const updatePasswordBtn = document.getElementById('update-password-btn');
const newPasswordInput = document.getElementById('new-password');
const confirmPasswordInput = document.getElementById('confirm-password');

if (updatePasswordBtn) {
    updatePasswordBtn.addEventListener('click', async () => {
        const newPass = newPasswordInput.value;
        const confirmPass = confirmPasswordInput.value;

        if (newPass.length < 6) return alert("Password must be at least 6 characters.");
        if (newPass !== confirmPass) return alert("Passwords do not match.");

        updatePasswordBtn.disabled = true;
        updatePasswordBtn.textContent = "Updating...";

        try {
            await updatePassword(auth.currentUser, newPass);
            alert("Password updated successfully! You can now login with this password.");
            newPasswordInput.value = '';
            confirmPasswordInput.value = '';
        } catch (error) {
            console.error("Password Update Error:", error);
            if (error.code === 'auth/requires-recent-login') {
                alert("For security, please logout and login again before changing your password.");
            } else {
                alert("Failed to update password: " + error.message);
            }
        } finally {
            updatePasswordBtn.disabled = false;
            updatePasswordBtn.textContent = "Update Password";
        }
    });
}
