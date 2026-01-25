import firebaseConfig, { ADMIN_EMAILS } from './firebase-config.js';
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.2.0/firebase-app.js";
import { getDatabase, ref, push, set } from "https://www.gstatic.com/firebasejs/11.2.0/firebase-database.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/11.2.0/firebase-auth.js";

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const auth = getAuth(app);

// script.js
const mobileMenu = document.getElementById('mobile-menu');
const navLinks = document.querySelector('.nav-links');

mobileMenu.addEventListener('click', () => {
    navLinks.classList.toggle('active');
    mobileMenu.classList.toggle('active');
});

// Modal Functionality
document.addEventListener('DOMContentLoaded', () => {
    const modal = document.getElementById('donation-modal');
    const closeBtn = document.querySelector('.close-btn');
    const donateButtons = document.querySelectorAll('.donate-btn');
    const categorySelect = document.getElementById('category');
    const donationForm = document.getElementById('donation-form');

    // Prefill form for logged-in users & Update Nav
    onAuthStateChanged(auth, (user) => {
        const logoutBtn = document.getElementById('logout-btn');
        if (user) {
            // Admin Link Check
            if (ADMIN_EMAILS.includes(user.email)) {
                const myAccountLink = document.querySelector('a[href="my-account.html"]');
                if (myAccountLink) {
                    myAccountLink.href = "admin.html";
                    myAccountLink.textContent = "ADMIN DASHBOARD";
                }
            }

            const nameInput = document.getElementById('name');
            const emailInput = document.getElementById('email');

            if (nameInput && user.displayName) {
                nameInput.value = user.displayName;
            }
            if (emailInput && user.email) {
                emailInput.value = user.email;
            }

            // Show Logout
            if (logoutBtn) {
                logoutBtn.style.display = 'block';
                logoutBtn.parentElement.style.display = 'block'; // Ensure li is visible
            }
        } else {
            // Hide Logout if not logged in
            if (logoutBtn) {
                logoutBtn.style.display = 'none';
                logoutBtn.parentElement.style.display = 'none';
            }
        }
    });

    // Open Modal
    donateButtons.forEach(button => {
        button.addEventListener('click', (e) => {
            e.preventDefault();
            const category = button.getAttribute('data-category');
            if (category) {
                categorySelect.value = category;
            }
            modal.style.display = 'block';
        });

        // Location Capture
        const getLocationBtn = document.getElementById('get-location-btn');
        const locationStatus = document.getElementById('location-status');
        const latInput = document.getElementById('latitude');
        const longInput = document.getElementById('longitude');

        if (getLocationBtn) {
            getLocationBtn.addEventListener('click', () => {
                if (!navigator.geolocation) {
                    locationStatus.textContent = "Geolocation is not supported by your browser.";
                    return;
                }

                locationStatus.textContent = "Locating...";
                getLocationBtn.disabled = true;

                navigator.geolocation.getCurrentPosition(
                    (position) => {
                        const latitude = position.coords.latitude;
                        const longitude = position.coords.longitude;

                        latInput.value = latitude;
                        longInput.value = longitude;

                        locationStatus.textContent = "Location captured! ✅";
                        locationStatus.style.color = "green";
                        getLocationBtn.disabled = false;
                    },
                    (error) => {
                        console.error("Error getting location:", error);
                        locationStatus.textContent = "Unable to retrieve your location.";
                        locationStatus.style.color = "red";
                        getLocationBtn.disabled = false;
                    }
                );
            });
        }
    });

    // Close Modal
    closeBtn.addEventListener('click', () => {
        modal.style.display = 'none';
    });

    // Close if clicked outside
    window.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.style.display = 'none';
        }
    });

    // Handle Form Submission
    donationForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const submitBtn = donationForm.querySelector('.submit-btn');
        const originalBtnText = submitBtn.innerText;
        submitBtn.innerText = 'Submitting...';
        submitBtn.disabled = true;

        // Serialize form data
        const formData = new FormData(donationForm);
        const data = Object.fromEntries(formData);

        // Add timestamp
        data.timestamp = new Date().toISOString();
        data.status = "Pending"; // Default status

        // Add User Info if logged in
        const user = auth.currentUser;
        if (user) {
            data.userId = user.uid;
            // distinct from form email if they typed a different one, but good for tracking
            data.linkedUserEmail = user.email;
        }

        console.log('Submitting Donation:', data);

        try {
            // Save to Realtime Database
            const donationsRef = ref(db, 'donations');
            const newDonationRef = push(donationsRef);
            await set(newDonationRef, data);

            console.log("Donation saved with ID: ", newDonationRef.key);

            // Success Message
            alert(`Thank you, ${data.name}! We have received your request to donate ${data.category}. We will contact you at ${data.phone || data.email} shortly.`);

            // Reset and Close
            donationForm.reset();
            modal.style.display = 'none';

        } catch (error) {
            console.error("Error adding donation: ", error);
            alert("Error submitting donation. Please check your internet connection or try again later. \n\nDebug info: " + error.message);
        } finally {
            submitBtn.innerText = originalBtnText;
            submitBtn.disabled = false;
        }
    });

    // Logout Functionality
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            try {
                await signOut(auth);
                alert("Logged out successfully.");
                window.location.reload();
            } catch (error) {
                console.error("Logout Error:", error);
                alert("Error logging out.");
            }
        });
    }
});