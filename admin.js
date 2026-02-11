import firebaseConfig, { ADMIN_EMAILS } from './firebase-config.js';
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.2.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut, updatePassword } from "https://www.gstatic.com/firebasejs/11.2.0/firebase-auth.js";
import { getDatabase, ref, get, update } from "https://www.gstatic.com/firebasejs/11.2.0/firebase-database.js";

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);

// DOM Elements
const loadingOverlay = document.getElementById('loading-overlay');
const adminContent = document.getElementById('admin-content');
const donationsList = document.getElementById('donations-list');
const noDataMsg = document.getElementById('no-data-msg');
const refreshBtn = document.getElementById('refresh-btn');
const logoutBtn = document.getElementById('logout-btn');

// View Switching
const viewDonationsBtn = document.getElementById('view-donations-btn');
const viewPartnersBtn = document.getElementById('view-partners-btn');
const donationsSection = document.getElementById('donations-section');
const partnersSection = document.getElementById('partners-section');

// Partner Management
const partnersList = document.getElementById('partners-list');
const noPartnersMsg = document.getElementById('no-partners-msg');
const newPartnerEmailInput = document.getElementById('new-partner-email');
const addPartnerBtn = document.getElementById('add-partner-btn');

// Assignment Modal
const assignmentModal = document.getElementById('assignment-modal');
const closeAssignmentBtn = document.getElementById('close-assignment');
const assignmentList = document.getElementById('assignment-list');
const assignDonationIdInput = document.getElementById('assign-donation-id');


// Check Admin Access
onAuthStateChanged(auth, (user) => {
    if (user) {
        // Quick Client-Side Check (Real rules should be on DB)
        // Here we just check allowed emails from config
        // OR we check if user role is admin in DB (better for scale)
        // For now, sticking to config list + DB role check combo if needed
        // Assuming ADMIN_EMAILS is the source of truth for "Super Admins"

        if (ADMIN_EMAILS.includes(user.email)) {
            console.log("Admin access granted:", user.email);
            loadingOverlay.style.display = 'none';
            adminContent.style.display = 'block';
            loadDonations();
        } else {
            // Optional: Check DB for 'admin' role if not in hardcoded list
            checkDbAdmin(user);
        }
    } else {
        window.location.href = "login.html";
    }
});

async function checkDbAdmin(user) {
    try {
        const snapshot = await get(ref(db, `users/${user.uid}`));
        if (snapshot.exists() && snapshot.val().role === 'admin') {
            loadingOverlay.style.display = 'none';
            adminContent.style.display = 'block';
            loadDonations();
        } else {
            alert("Access Denied.");
            window.location.href = "index.html";
        }
    } catch (e) {
        window.location.href = "index.html";
    }
}


// --- Tab Switching ---
viewDonationsBtn.addEventListener('click', () => {
    donationsSection.style.display = 'block';
    partnersSection.style.display = 'none';
    viewDonationsBtn.style.backgroundColor = '#333';
    viewDonationsBtn.style.color = 'white';
    viewPartnersBtn.style.backgroundColor = '';
    viewPartnersBtn.style.color = '';
    loadDonations();
});

viewPartnersBtn.addEventListener('click', () => {
    donationsSection.style.display = 'none';
    partnersSection.style.display = 'block';
    viewPartnersBtn.style.backgroundColor = '#333';
    viewPartnersBtn.style.color = 'white';
    viewDonationsBtn.style.backgroundColor = '';
    viewDonationsBtn.style.color = '';
    loadPartners();
});


// --- Donation Logic ---
let allUsersCache = []; // Store users to map UIDs to Names

async function loadDonations() {
    donationsList.innerHTML = '';
    noDataMsg.style.display = 'none';

    // Fetch users first to map names/roles if needed (lightweight enough for now)
    await loadUsersCache();

    try {
        const donationsRef = ref(db, 'donations');
        const snapshot = await get(donationsRef);

        if (snapshot.exists()) {
            const data = snapshot.val();
            const donations = Object.entries(data).map(([key, value]) => ({
                id: key,
                ...value
            }));

            // Metrics
            const total = donations.length;
            const pending = donations.filter(d => !d.status || d.status.toLowerCase() === 'pending').length;
            const received = donations.filter(d => d.status && ['received', 'completed'].includes(d.status.toLowerCase())).length;

            document.getElementById('count-total').textContent = total;
            document.getElementById('count-pending').textContent = pending;
            document.getElementById('count-received').textContent = received;

            // Sort
            donations.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

            donations.forEach(donation => {
                renderDonationRow(donation);
            });
        } else {
            noDataMsg.style.display = 'block';
        }
    } catch (error) {
        console.error("Error loading donations:", error);
    }
}

async function loadUsersCache() {
    try {
        const s = await get(ref(db, 'users'));
        if (s.exists()) {
            const data = s.val();
            allUsersCache = Object.entries(data).map(([uid, val]) => ({ uid, ...val }));
        }
    } catch (e) {
        console.error("Error caching users:", e);
    }
}

function renderDonationRow(donation) {
    const date = new Date(donation.timestamp).toLocaleDateString() + ' ' + new Date(donation.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    let statusClass = "status-pending";
    let statusText = donation.status || "Pending";
    const lowerStatus = statusText.toLowerCase();

    if (['received', 'completed'].includes(lowerStatus)) statusClass = "status-completed";
    else if (['rejected', 'cancelled'].includes(lowerStatus)) statusClass = "status-rejected";

    const mapBtn = (donation.latitude && donation.longitude)
        ? `<button class="action-btn" style="background-color: #3498db; margin-top:5px;" onclick="viewLocation('${donation.latitude}', '${donation.longitude}', '${donation.name}')"><i class="fas fa-map-marker-alt"></i> View Map</button>`
        : '';

    // Assignment Info
    let assignedName = "-";
    if (donation.assignedTo) {
        const partner = allUsersCache.find(u => u.uid === donation.assignedTo);
        assignedName = partner ? partner.name : "Unknown ID";
    }


    const isCompleted = ['received', 'completed'].includes(lowerStatus);
    const assignBtn = isCompleted
        ? `<button class="action-btn" style="background-color: #ccc; cursor: not-allowed;" disabled>Done</button>`
        : `<button class="action-btn" style="background-color: #f39c12;" onclick="openAssignmentModal('${donation.id}')">Assign</button>`;

    const row = document.createElement('tr');
    row.innerHTML = `
        <td>${date}</td>
        <td>${donation.name || 'Anonymous'}<br><small>${donation.linkedUserEmail || ''}</small></td>
        <td>${donation.phone || '-'}<br>${donation.email || '-'}</td>
        <td>${donation.category}</td>
        <td>${donation.quantity}</td>
        <td><small>${donation.address || '-'}</small><br>${mapBtn}</td>
        <td><span class="${statusClass}">${statusText}</span></td>
        <td>${assignedName}</td>
        <td>
            ${assignBtn}
            <button class="action-btn btn-approve" onclick="updateStatus('${donation.id}', 'Received')">Accept</button>
            <button class="action-btn btn-reject" onclick="updateStatus('${donation.id}', 'Rejected')">Reject</button>
        </td>
    `;

    donationsList.appendChild(row);
}


// --- Partner Management Logic ---
const pendingSection = document.getElementById('pending-section');
const pendingList = document.getElementById('pending-list');

async function loadPartners() {
    partnersList.innerHTML = '';
    pendingList.innerHTML = '';
    noPartnersMsg.style.display = 'none';
    pendingSection.style.display = 'none';

    try {
        const usersRef = ref(db, 'users');
        const snapshot = await get(usersRef);

        if (snapshot.exists()) {
            const users = Object.entries(snapshot.val()).map(([uid, val]) => ({ uid, ...val }));

            // Pending
            const pending = users.filter(u => u.role === 'pending_delivery');
            if (pending.length > 0) {
                pendingSection.style.display = 'block';
                pending.forEach(p => {
                    const row = document.createElement('tr');
                    row.innerHTML = `
                        <td>${p.name}</td>
                        <td>${p.email}</td>
                        <td>
                            <button class="action-btn btn-approve" onclick="changeUserRole('${p.uid}', 'delivery')">Approve</button>
                            <button class="action-btn btn-reject" onclick="changeUserRole('${p.uid}', 'user')">Reject</button>
                        </td>
                    `;
                    pendingList.appendChild(row);
                });
            }

            // Active Partners
            const partners = users.filter(u => u.role === 'delivery');

            if (partners.length > 0) {
                partners.forEach(p => {
                    const row = document.createElement('tr');
                    row.innerHTML = `
                        <td>${p.name}</td>
                        <td>${p.email}</td>
                        <td><span style="background:#e8f5e9; color:#2e7d32; padding:2px 6px; border-radius:4px;">${p.role}</span></td>
                        <td>
                            <button class="action-btn btn-reject" onclick="changeUserRole('${p.uid}', 'user')">Demote</button>
                        </td>
                    `;
                    partnersList.appendChild(row);
                });
            } else {
                noPartnersMsg.style.display = 'block';
            }
        } else {
            noPartnersMsg.style.display = 'block';
        }
    } catch (e) {
        console.error("Error loading partners:", e);
    }
}

addPartnerBtn.addEventListener('click', async () => {
    const email = newPartnerEmailInput.value.trim();
    if (!email) return alert("Enter an email");

    addPartnerBtn.disabled = true;
    addPartnerBtn.innerText = "Searching...";

    try {
        // Find user by email
        const usersRef = ref(db, 'users');
        const snapshot = await get(usersRef);
        let foundUser = null;

        if (snapshot.exists()) {
            const users = snapshot.val();
            // Iterate to find by email
            for (const [uid, user] of Object.entries(users)) {
                if (user.email && user.email.toLowerCase() === email.toLowerCase()) {
                    foundUser = { uid, ...user };
                    break;
                }
            }
        }

        if (foundUser) {
            await changeUserRole(foundUser.uid, 'delivery');
            newPartnerEmailInput.value = '';
            loadPartners(); // Refresh list
        } else {
            alert("User not found. They must sign up/login first so their profile is created.");
        }

    } catch (e) {
        console.error(e);
        alert("Error: " + e.message);
    } finally {
        addPartnerBtn.disabled = false;
        addPartnerBtn.innerText = "Promote User";
    }
});

window.changeUserRole = async (uid, newRole) => {
    if (!confirm(`Change role to ${newRole}?`)) return;
    try {
        await update(ref(db, `users/${uid}`), { role: newRole });
        loadPartners(); // Refresh
        // Also refresh donations if viewing them, but we are likely on partners tab
    } catch (e) {
        alert("Failed to update role");
    }
};


// --- Assignment Modal Logic ---

window.openAssignmentModal = async (donationId) => {
    assignmentModal.style.display = 'block';
    assignDonationIdInput.value = donationId;
    assignmentList.innerHTML = "Loading partners...";

    // Fetch partners
    await loadUsersCache(); // refresh cache
    const partners = allUsersCache.filter(u => u.role === 'delivery');

    assignmentList.innerHTML = '';

    if (partners.length === 0) {
        assignmentList.innerHTML = "<p>No Delivery Partners found.</p>";
        return;
    }

    partners.forEach(partner => {
        const div = document.createElement('div');
        div.style.padding = "10px";
        div.style.borderBottom = "1px solid #eee";
        div.style.cursor = "pointer";
        div.style.display = "flex";
        div.style.justifyContent = "space-between";
        div.onmouseover = () => div.style.background = "#f5f5f5";
        div.onmouseout = () => div.style.background = "white";

        div.innerHTML = `<span><strong>${partner.name}</strong> (${partner.email})</span> <button class="button-33" style="padding:4px 8px; font-size:12px;">Select</button>`;

        div.onclick = () => assignToPartner(donationId, partner.uid);

        assignmentList.appendChild(div);
    });
};

async function assignToPartner(donationId, partnerUid) {
    try {
        await update(ref(db, `donations/${donationId}`), {
            assignedTo: partnerUid,
            status: 'Assigned'
        });

        alert("Donation assigned successfully!");
        assignmentModal.style.display = 'none';
        loadDonations(); // Refresh

    } catch (e) {
        console.log(e);
        alert("Error assigning: " + e.message);
    }
}

closeAssignmentBtn.onclick = () => assignmentModal.style.display = 'none';
window.onclick = (e) => {
    if (e.target == assignmentModal) assignmentModal.style.display = 'none';
    if (e.target == mapModal) mapModal.style.display = 'none';
    const settingsModal = document.getElementById('settings-modal');
    if (e.target == settingsModal) settingsModal.style.display = 'none';
    const mapModalEl = document.getElementById('map-modal'); // Re-declared to be safe
    if (e.target == mapModalEl) mapModalEl.style.display = 'none';
};


// --- Global Actions ---
window.updateStatus = async (donationId, newStatus) => {
    if (!confirm(`Are you sure you want to mark this donation as ${newStatus}?`)) return;
    try {
        const updates = { status: newStatus };
        if (newStatus === 'Received' || newStatus === 'Completed') {
            updates.completedTime = Date.now();
        }
        await update(ref(db, `donations/${donationId}`), updates);
        loadDonations();
    } catch (error) {
        alert("Failed to update status.");
    }
};

window.viewLocation = (lat, lng, name) => {
    const modal = document.getElementById('map-modal');
    const mapDiv = document.getElementById('map');
    modal.style.display = 'block';

    if (!window.mapInstance) { // Use global prop to avoid re-init collision issues if any
        window.mapInstance = L.map('map').setView([lat, lng], 15);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap'
        }).addTo(window.mapInstance);
    } else {
        setTimeout(() => {
            window.mapInstance.invalidateSize();
            window.mapInstance.setView([lat, lng], 15);
        }, 100);
    }

    if (window.markerInstance) {
        window.mapInstance.removeLayer(window.markerInstance);
    }

    window.markerInstance = L.marker([lat, lng]).addTo(window.mapInstance)
        .bindPopup(`<b>${name}</b><br>Donation Location`)
        .openPopup();

    setTimeout(() => {
        window.mapInstance.invalidateSize();
    }, 100);
};

// Close Map
const closeMap = document.querySelector('.close-map');
if (closeMap) {
    closeMap.addEventListener('click', () => {
        document.getElementById('map-modal').style.display = 'none';
    });
}

// Global Refresh
refreshBtn.addEventListener('click', () => {
    if (donationsSection.style.display !== 'none') loadDonations();
    else loadPartners();
});

// Logout
logoutBtn.addEventListener('click', async () => {
    await signOut(auth);
    window.location.href = "login.html";
});
