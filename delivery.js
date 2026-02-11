import firebaseConfig from './firebase-config.js';
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.2.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/11.2.0/firebase-auth.js";
import { getDatabase, ref, query, orderByChild, equalTo, get, update, set, remove } from "https://www.gstatic.com/firebasejs/11.2.0/firebase-database.js";

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);

// Global Error Handler for debugging
window.onerror = function (message, source, lineno, colno, error) {
    console.error("Global Error:", message);
    const errorDiv = document.createElement('div');
    errorDiv.style.position = 'fixed';
    errorDiv.style.top = '0';
    errorDiv.style.left = '0';
    errorDiv.style.right = '0';
    errorDiv.style.background = '#e74c3c';
    errorDiv.style.color = 'white';
    errorDiv.style.padding = '10px';
    errorDiv.style.zIndex = '9999';
    errorDiv.style.textAlign = 'center';
    errorDiv.style.fontWeight = 'bold';
    errorDiv.innerText = `System Error: ${message}`;
    document.body.appendChild(errorDiv);
};

// DOM Elements
const loadingOverlay = document.getElementById('loading-overlay');
const dashboardContent = document.getElementById('dashboard-content');
const availableContainer = document.getElementById('available-tasks-container');
const pendingContainer = document.getElementById('pending-tasks-container');
const completedContainer = document.getElementById('completed-tasks-container');
const noAvailableMsg = document.getElementById('no-available-msg');
const noTasksMsg = document.getElementById('no-tasks-msg');
const noHistoryMsg = document.getElementById('no-history-msg');
// ... (rest of controls)

// ...

// Load Deliveries
async function loadAssignedDeliveries() {
    if (!pendingContainer) return;

    // Reset UI
    if (availableContainer) availableContainer.innerHTML = '';
    pendingContainer.innerHTML = '<p style="text-align:center;">Loading...</p>';
    completedContainer.innerHTML = '';

    if (noAvailableMsg) noAvailableMsg.style.display = 'none';
    noTasksMsg.style.display = 'none';
    noHistoryMsg.style.display = 'none';

    // ... Inside loadAssignedDeliveries ...

    try {
        const donationsRef = ref(db, 'donations');
        const snapshot = await get(donationsRef);

        pendingContainer.innerHTML = ''; // Clear loading text

        if (snapshot.exists()) {
            const data = snapshot.val();
            const allDonations = Object.entries(data).map(([key, val]) => ({ id: key, ...val }));

            // 1. Available for Pickup (Pending & Unassigned)
            // Logic: Status is Pending OR (Status is Assigned/In Progress but BUT assignedTo is empty - edge case)
            const availableTasks = allDonations.filter(d =>
                (!d.assignedTo) && (!d.status || d.status.toLowerCase() === 'pending')
            );

            // 2. My Active Deliveries
            const myActiveTasks = allDonations.filter(d =>
                d.assignedTo === currentUser.uid &&
                (['assigned', 'in progress'].includes(d.status ? d.status.toLowerCase() : ''))
            );

            // 3. My History
            const myHistory = allDonations.filter(d =>
                d.assignedTo === currentUser.uid &&
                (['received', 'completed', 'rejected'].includes(d.status ? d.status.toLowerCase() : ''))
            );

            // --- DEBUG PANEL (Temporary) ---
            const debugPanel = document.getElementById('debug-panel') || document.createElement('div');
            debugPanel.id = 'debug-panel';
            debugPanel.style.position = 'fixed';
            debugPanel.style.bottom = '10px';
            debugPanel.style.right = '10px';
            debugPanel.style.backgroundColor = 'rgba(0,0,0,0.8)';
            debugPanel.style.color = 'lime';
            debugPanel.style.padding = '10px';
            debugPanel.style.fontSize = '12px';
            debugPanel.style.zIndex = '10000';
            debugPanel.innerHTML = `
                <b>Debug Stats</b><br>
                Total Fetch: ${allDonations.length}<br>
                Available: ${availableTasks.length}<br>
                Active: ${myActiveTasks.length}<br>
                History: ${myHistory.length}<br>
                My UID: ...${currentUser.uid.slice(-5)}
            `;
            document.body.appendChild(debugPanel);
            // --------------------------------

            // Render Available
            if (availableContainer) {
                if (availableTasks.length > 0) {
                    availableContainer.innerHTML = ''; // Clear explicit msg
                    availableTasks.forEach(task => {
                        const card = renderTaskCard(task, 'available');
                        availableContainer.appendChild(card);
                    });
                } else {
                    noAvailableMsg.style.display = 'block';
                }
            }

            // ... (rest of render logic)

            // Render Active
            if (myActiveTasks.length > 0) {
                myActiveTasks.forEach(task => {
                    const card = renderTaskCard(task, 'active');
                    pendingContainer.appendChild(card);
                });
            } else {
                noTasksMsg.style.display = 'block';
            }

            // Render History
            if (myHistory.length > 0) {
                myHistory.forEach(task => {
                    const card = renderTaskCard(task, 'history');
                    completedContainer.appendChild(card);
                });
            } else {
                noHistoryMsg.style.display = 'block';
            }

        } else {
            if (noAvailableMsg) noAvailableMsg.style.display = 'block';
            noTasksMsg.style.display = 'block';
            noHistoryMsg.style.display = 'block';
        }
    } catch (error) {
        console.error("Error loading tasks:", error);
        pendingContainer.innerHTML = `<p style="text-align:center; color:red;">Error loading tasks: ${error.message}</p>`;
    }
}

// Render Task Card
function renderTaskCard(task, type = 'active') {
    // type: 'available' | 'active' | 'history'
    const card = document.createElement('div');
    card.className = 'task-card';
    if (task.status === 'In Progress') card.classList.add('tracking-active');

    let actionBtn = '';

    if (type === 'available') {
        actionBtn = `<button class="btn-action btn-approve" onclick="window.acceptTask('${task.id}')">Accept Task</button>`;
    } else if (type === 'active') {
        const isStarted = task.status === 'In Progress';
        actionBtn = !isStarted ?
            `<button class="btn-action btn-start" onclick="window.startDelivery('${task.id}')">Start Pickup</button>` :
            `<button class="btn-action btn-complete" onclick="window.completeDelivery('${task.id}')">Complete Pickup</button>`;
    } else {
        // History
        actionBtn = `<span style="color: green; font-weight: bold;">✓ ${task.status}</span>`;
    }

    // Map Button Logic (Safe check)
    let mapBtn = '';
    if (task.latitude && task.longitude) {
        mapBtn = `<a href="#" class="view-map-link" data-lat="${task.latitude}" data-lng="${task.longitude}">View on Map</a>`;
    }

    card.innerHTML = `
        <div class="task-header">
            <h3>${task.category}</h3>
            <span class="status-badge ${task.status === 'In Progress' ? 'status-completed' : 'status-pending'}">${task.status || 'Pending'}</span>
        </div>
        <div class="task-details">
            <div class="detail-item">
                <strong>Donor Name</strong>
                ${task.name || 'Anonymous'}
            </div>
            <div class="detail-item">
                <strong>Quantity</strong>
                ${task.quantity}
            </div>
            <div class="detail-item">
                <strong>Address</strong>
                ${task.address || 'N/A'} <br>
                ${mapBtn}
            </div>
             <div class="detail-item">
                <strong>Contact</strong>
                ${task.phone || 'N/A'}
            </div>
        </div>
        <div class="task-actions">
            ${actionBtn}
        </div>
    `;

    // Add event listeners for map links
    const mapLink = card.querySelector('.view-map-link');
    if (mapLink) {
        mapLink.addEventListener('click', (e) => {
            e.preventDefault();
            const lat = parseFloat(mapLink.dataset.lat);
            const lng = parseFloat(mapLink.dataset.lng);
            openMap(lat, lng);
        });
    }

    return card;
}

// Global functions for buttons
window.acceptTask = async (donationId) => {
    if (!currentUser) return;
    if (!confirm("Accept this delivery task?")) return;

    try {
        await update(ref(db, `donations/${donationId}`), {
            assignedTo: currentUser.uid,
            status: 'Assigned',
            assignedTime: Date.now()
        });
        alert("Task accepted! It is now in your Active Deliveries.");
        loadAssignedDeliveries();
    } catch (e) {
        alert("Error accepting task: " + e.message);
    }
};

// Global functions for buttons
window.startDelivery = async (donationId) => {
    if (!confirm("Start this delivery? This will enable live tracking for the user.")) return;

    try {
        await update(ref(db, `donations/${donationId}`), {
            status: 'In Progress',
            startTime: Date.now()
        });

        startLocationTracking(donationId);
        loadAssignedDeliveries();
    } catch (error) {
        alert("Error starting delivery: " + error.message);
    }
};

window.completeDelivery = async (donationId) => {
    if (!confirm("Confirm delivery completion?")) return;

    try {
        await update(ref(db, `donations/${donationId}`), {
            status: 'Completed',
            completedTime: Date.now()
        });

        stopLocationTracking();
        loadAssignedDeliveries();
    } catch (error) {
        alert("Error completing delivery: " + error.message);
    }
};

// Location Tracking
function startLocationTracking(donationId) {
    if ("geolocation" in navigator) {
        currentTrackingId = donationId;

        // Update immediately
        navigator.geolocation.getCurrentPosition(updateLocationOnDb, handleError);

        // Watch for changes
        watchId = navigator.geolocation.watchPosition(updateLocationOnDb, handleError, {
            enableHighAccuracy: true,
            timeout: 5000,
            maximumAge: 0
        });

        alert("Live tracking started. Location is being shared.");
    } else {
        alert("Geolocation is not supported by your browser.");
    }
}

function updateLocationOnDb(position) {
    if (!currentUser) return;

    const { latitude, longitude } = position.coords;

    // Update location under locations/{userId}
    set(ref(db, `locations/${currentUser.uid}`), {
        lat: latitude,
        lng: longitude,
        timestamp: Date.now(),
        activeTask: currentTrackingId
    });
}

function stopLocationTracking() {
    if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
        watchId = null;
    }

    if (currentUser) {
        // Remove location or mark inactive
        remove(ref(db, `locations/${currentUser.uid}`));
    }

    currentTrackingId = null;
}

function handleError(error) {
    console.warn("Geolocation warning:", error.message);
}


// Map Logic
function openMap(lat, lng) {
    if (!mapModal) return;
    mapModal.style.display = 'block';

    if (!map) {
        map = L.map('map').setView([lat, lng], 13);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors'
        }).addTo(map);
    } else {
        map.invalidateSize();
        map.setView([lat, lng], 13);
    }

    if (destinationMarker) {
        map.removeLayer(destinationMarker);
    }

    destinationMarker = L.marker([lat, lng]).addTo(map)
        .bindPopup("Donor Location")
        .openPopup();

    // Also show my location if available
    if ("geolocation" in navigator) {
        navigator.geolocation.getCurrentPosition(pos => {
            const { latitude, longitude } = pos.coords;
            if (mapMarker) map.removeLayer(mapMarker);

            mapMarker = L.marker([latitude, longitude], {
                icon: L.icon({
                    iconUrl: 'https://cdn-icons-png.flaticon.com/512/3304/3304567.png', // Courier icon
                    iconSize: [38, 38],
                    iconAnchor: [19, 38]
                })
            }).addTo(map).bindPopup("You");

            // Fit bounds
            const group = new L.featureGroup([destinationMarker, mapMarker]);
            map.fitBounds(group.getBounds());
        }, (err) => console.log("No location for map center"));
    }
}


// Close functions
if (closeMapBtn) closeMapBtn.onclick = () => mapModal.style.display = "none";
window.onclick = (event) => {
    if (event.target == mapModal) mapModal.style.display = "none";
};

// Logout
if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
        try {
            await signOut(auth);
            window.location.href = "login.html";
        } catch (e) {
            console.error("Logout error", e);
            window.location.href = "login.html";
        }
    });
}

if (refreshBtn) refreshBtn.addEventListener('click', loadAssignedDeliveries);
