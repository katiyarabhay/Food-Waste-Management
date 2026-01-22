import firebaseConfig from './firebase-config.js';
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.2.0/firebase-app.js";
import { getDatabase, ref, push, set } from "https://www.gstatic.com/firebasejs/11.2.0/firebase-database.js";

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

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
});