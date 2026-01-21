// script.js
const mobileMenu = document.getElementById('mobile-menu');
const navLinks = document.querySelector('.nav-links');

mobileMenu.addEventListener('click', () => {
    navLinks.classList.toggle('active');
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
    donationForm.addEventListener('submit', (e) => {
        e.preventDefault();

        // Serialize form data
        const formData = new FormData(donationForm);
        const data = Object.fromEntries(formData);

        console.log('Donation Submitted:', data);

        // Simulate Success
        alert(`Thank you, ${data.name}! We have received your request to donate ${data.category}. We will contact you at ${data.phone || data.email} shortly.`);

        // Reset and Close
        donationForm.reset();
        modal.style.display = 'none';
    });
});