import firebaseConfig, { ADMIN_EMAILS } from './firebase-config.js';
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.2.0/firebase-app.js";
import { getDatabase, ref, push, set, get } from "https://www.gstatic.com/firebasejs/11.2.0/firebase-database.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/11.2.0/firebase-auth.js";
import { FoodFreshnessPredictor, generateFreshnessUI } from './freshness-predictor.js';

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

    // Prefill form and Redirect Logic
    onAuthStateChanged(auth, async (user) => {
        const logoutBtn = document.getElementById('logout-btn');
        const loginBtnNav = document.querySelector('.login-btn-nav');
        const accountNavLink = document.getElementById('account-nav-link');

        if (user) {
            // Manage navbar links visibility
            if (loginBtnNav) loginBtnNav.style.display = 'none';
            if (accountNavLink) accountNavLink.style.display = 'block';

            // Check User Role for Redirection
            try {
                const userRef = ref(db, `users/${user.uid}`);
                const snapshot = await get(userRef);

                if (snapshot.exists()) {
                    const userData = snapshot.val();
                    if (userData.role === 'delivery') {
                        // Redirect to Delivery Dashboard
                        window.location.href = "delivery.html";
                        return; // Stop further execution
                    } else if (userData.role === 'pending_delivery') {
                        console.log("User is pending delivery approval.");
                    }
                }
            } catch (e) {
                console.error("Role check error", e);
            }

            // Admin Link Check
            if (ADMIN_EMAILS.includes(user.email)) {
                const myAccountLink = document.getElementById('account-nav-link') || document.querySelector('a[href="my-account.html"]');
                if (myAccountLink) {
                    myAccountLink.href = "admin.html";
                    myAccountLink.textContent = "ADMIN DASHBOARD";
                }
            }

            // Prefill donation modal inputs
            const nameInput = document.getElementById('name');
            const emailInput = document.getElementById('email');
            const fundsNameInput = document.getElementById('funds-name');
            const fundsEmailInput = document.getElementById('funds-email');

            if (nameInput && user.displayName) nameInput.value = user.displayName;
            if (emailInput && user.email) emailInput.value = user.email;
            if (fundsNameInput && user.displayName) fundsNameInput.value = user.displayName;
            if (fundsEmailInput && user.email) fundsEmailInput.value = user.email;

            // Show Logout
            if (logoutBtn) {
                logoutBtn.style.display = 'block';
                logoutBtn.parentElement.style.display = 'block';
            }
        } else {
            // Manage navbar links visibility for guests
            if (loginBtnNav) loginBtnNav.style.display = 'block';
            if (accountNavLink) accountNavLink.style.display = 'none';

            if (logoutBtn) {
                logoutBtn.style.display = 'none';
                logoutBtn.parentElement.style.display = 'none';
            }
        }
    });

    // Open Modal
    const fundsModal = document.getElementById('funds-modal');
    donateButtons.forEach(button => {
        button.addEventListener('click', (e) => {
            e.preventDefault();
            const category = button.getAttribute('data-category');
            if (category === 'Funds') {
                if (fundsModal) fundsModal.style.display = 'block';
            } else {
                if (category) {
                    categorySelect.value = category;
                }
                modal.style.display = 'block';
            }
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
                        const accuracy = position.coords.accuracy;

                        // Open Map Modal for Confirmation
                        openLocationPicker(latitude, longitude, accuracy);
                    },
                    (error) => {
                        console.error("Error getting location:", error);
                        let errorMsg = "Unable to retrieve your location.";
                        if (error.code === error.PERMISSION_DENIED) errorMsg = "Location permission denied.";
                        else if (error.code === error.TIMEOUT) errorMsg = "Location request timed out.";

                        locationStatus.textContent = errorMsg;
                        locationStatus.style.color = "red";
                        getLocationBtn.disabled = false;
                    },
                    {
                        enableHighAccuracy: true,
                        timeout: 10000,
                        maximumAge: 0
                    }
                );
            });
        }
    });

    // Location Picker Logic
    let pickerMap;
    let pickerMarker;
    let tempLat, tempLng;
    const locationModal = document.getElementById('location-modal');
    const confirmBtn = document.getElementById('confirm-location-btn');
    const cancelBtn = document.getElementById('cancel-location-btn');
    const locationStatus = document.getElementById('location-status');
    const latInput = document.getElementById('latitude');
    const longInput = document.getElementById('longitude');
    const getLocationBtn = document.getElementById('get-location-btn');

    function openLocationPicker(lat, lng, accuracy) {
        locationModal.style.display = 'block';
        tempLat = lat;
        tempLng = lng;

        if (!pickerMap) {
            pickerMap = L.map('location-map').setView([lat, lng], 18);
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '&copy; OpenStreetMap contributors'
            }).addTo(pickerMap);

            // Add Search Bar
            try {
                const geocoder = L.Control.geocoder({
                    defaultMarkGeocode: false
                })
                    .on('markgeocode', function (e) {
                        const bbox = e.geocode.bbox;
                        const poly = L.polygon([
                            bbox.getSouthEast(),
                            bbox.getNorthEast(),
                            bbox.getNorthWest(),
                            bbox.getSouthWest()
                        ]);
                        pickerMap.fitBounds(poly.getBounds());

                        const center = e.geocode.center;
                        pickerMarker.setLatLng(center);
                        tempLat = center.lat;
                        tempLng = center.lng;
                        pickerMarker.bindPopup(e.geocode.name).openPopup();
                    })
                    .addTo(pickerMap);
                console.log("Geocoder search bar added to map.");
            } catch (err) {
                console.error("Failed to add Geocoder:", err);
            }
        } else {
            // Resize trigger
            setTimeout(() => {
                pickerMap.invalidateSize();
                pickerMap.setView([lat, lng], 18);
            }, 100);
        }

        if (pickerMarker) {
            pickerMap.removeLayer(pickerMarker);
        }

        pickerMarker = L.marker([lat, lng], { draggable: true }).addTo(pickerMap)
            .bindPopup("Drag me to your exact location")
            .openPopup();

        // Update temp coords on drag
        pickerMarker.on('dragend', function (event) {
            const position = pickerMarker.getLatLng();
            tempLat = position.lat;
            tempLng = position.lng;
        });

        // Resize map again just in case
        setTimeout(() => {
            pickerMap.invalidateSize();
        }, 200);
    }

    if (confirmBtn) {
        confirmBtn.addEventListener('click', () => {
            latInput.value = tempLat;
            longInput.value = tempLng;

            locationStatus.textContent = `Location confirmed! ✅`;
            locationStatus.style.color = "green";
            getLocationBtn.disabled = false;
            locationModal.style.display = 'none';
        });
    }

    if (cancelBtn) {
        cancelBtn.addEventListener('click', () => {
            locationModal.style.display = 'none';
            getLocationBtn.disabled = false;
            locationStatus.textContent = "Location selection cancelled.";
            locationStatus.style.color = "orange";
        });
    }

    // Close Modal
    closeBtn.addEventListener('click', () => {
        modal.style.display = 'none';
    });

    const fundsCloseBtn = document.getElementById('close-funds-btn');
    if (fundsCloseBtn) {
        fundsCloseBtn.addEventListener('click', () => {
            if (fundsModal) fundsModal.style.display = 'none';
        });
    }

    // Close if clicked outside
    window.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.style.display = 'none';
        }
        if (fundsModal && e.target === fundsModal) {
            fundsModal.style.display = 'none';
        }
    });

    // Handle Form Submission for Food Donations
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
            alert(`Thank you, ${data.name}! We have received your request to donate ${data.category}. We will contact you at ${data.phone || data.email} shortly.`);

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

    // Handle Funds Form & Direct UPI Payment Logic
    const fundsForm = document.getElementById('funds-form');
    const payMethodUpiBtn = document.getElementById('pay-method-upi');
    const payMethodRazorpayBtn = document.getElementById('pay-method-razorpay');
    const upiBox = document.getElementById('upi-payment-details-box');
    const fundsSubmitBtn = document.getElementById('funds-submit-btn');
    const fundsAmountInput = document.getElementById('funds-amount');
    const upiQrImage = document.getElementById('upi-qr-image');
    const upiVpaDisplay = document.getElementById('upi-vpa-display');
    const copyUpiBtn = document.getElementById('copy-upi-btn');
    const upiMobileLink = document.getElementById('upi-mobile-link');
    const upiUtrInput = document.getElementById('upi-utr-id');

    let currentPaymentMode = 'upi'; // 'upi' or 'razorpay'
    let configuredUpiId = '6387279295@pthdfc';
    let configuredUpiName = 'HappiPlates Foundation';
    let currentScreenshotDataUrl = null;

    // Screenshot Drag & Drop Handling
    const upiScreenshotDropzone = document.getElementById('upi-screenshot-dropzone');
    const upiScreenshotInput = document.getElementById('upi-screenshot-input');
    const upiScreenshotPreviewContainer = document.getElementById('upi-screenshot-preview-container');
    const upiScreenshotPreview = document.getElementById('upi-screenshot-preview');
    const upiScreenshotName = document.getElementById('upi-screenshot-name');
    const upiScreenshotLabel = document.getElementById('upi-screenshot-label');

    if (upiScreenshotDropzone && upiScreenshotInput) {
        upiScreenshotDropzone.addEventListener('click', () => upiScreenshotInput.click());

        upiScreenshotDropzone.addEventListener('dragover', (e) => {
            e.preventDefault();
            upiScreenshotDropzone.style.background = '#f0fdf4';
            upiScreenshotDropzone.style.borderColor = '#10b981';
        });

        upiScreenshotDropzone.addEventListener('dragleave', () => {
            upiScreenshotDropzone.style.background = '#ffffff';
            upiScreenshotDropzone.style.borderColor = '#008080';
        });

        upiScreenshotDropzone.addEventListener('drop', (e) => {
            e.preventDefault();
            upiScreenshotDropzone.style.background = '#ffffff';
            upiScreenshotDropzone.style.borderColor = '#008080';
            if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                processScreenshotFile(e.dataTransfer.files[0]);
            }
        });

        upiScreenshotInput.addEventListener('change', (e) => {
            if (e.target.files && e.target.files[0]) {
                processScreenshotFile(e.target.files[0]);
            }
        });

        function processScreenshotFile(file) {
            if (!file || !file.type.startsWith('image/')) {
                alert("Please select a valid screenshot image file (PNG, JPG, JPEG, WEBP).");
                return;
            }
            const reader = new FileReader();
            reader.onload = (e) => {
                currentScreenshotDataUrl = e.target.result;
                if (upiScreenshotPreview) upiScreenshotPreview.src = currentScreenshotDataUrl;
                if (upiScreenshotName) upiScreenshotName.textContent = `Attached: ${file.name}`;
                if (upiScreenshotPreviewContainer) upiScreenshotPreviewContainer.style.display = 'block';
                if (upiScreenshotLabel) upiScreenshotLabel.style.display = 'none';
            };
            reader.readAsDataURL(file);
        }
    }

    // Fetch UPI Configuration
    async function loadUpiConfig() {
        try {
            const res = await fetch('/api/upi-config');
            if (res.ok) {
                const data = await res.json();
                configuredUpiId = data.upi_id || '6387279295@pthdfc';
                configuredUpiName = data.upi_name || 'HappiPlates Foundation';
            }
        } catch (e) {
            console.warn("Using fallback UPI ID", e);
        }
        if (upiVpaDisplay) upiVpaDisplay.textContent = configuredUpiId;
        updateUpiQrAndLink();
    }

    const liveQrBadge = document.getElementById('live-qr-badge');
    const amountChips = document.querySelectorAll('.amount-chip-btn');

    function updateUpiQrAndLink() {
        const amountVal = parseFloat(fundsAmountInput ? fundsAmountInput.value : 0) || 100;
        const upiUri = `upi://pay?pa=${configuredUpiId}&pn=${encodeURIComponent(configuredUpiName)}&am=${amountVal}&cu=INR&tn=Donation`;
        
        if (upiQrImage) {
            upiQrImage.style.opacity = '0.6';
            upiQrImage.src = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(upiUri)}`;
            upiQrImage.onload = () => { upiQrImage.style.opacity = '1'; };
        }
        if (upiMobileLink) {
            upiMobileLink.href = upiUri;
        }
        if (liveQrBadge) {
            liveQrBadge.textContent = `LIVE: ₹${amountVal}`;
        }
    }

    if (fundsAmountInput) {
        fundsAmountInput.addEventListener('input', () => {
            updateUpiQrAndLink();
            const currentVal = fundsAmountInput.value;
            amountChips.forEach(chip => {
                if (chip.getAttribute('data-val') === currentVal) {
                    chip.style.background = '#008080';
                    chip.style.color = 'white';
                } else {
                    chip.style.background = '#e6f2f2';
                    chip.style.color = '#008080';
                }
            });
        });
    }

    amountChips.forEach(chip => {
        chip.addEventListener('click', () => {
            const val = chip.getAttribute('data-val');
            if (fundsAmountInput) {
                fundsAmountInput.value = val;
                updateUpiQrAndLink();
            }
            amountChips.forEach(c => {
                c.style.background = '#e6f2f2';
                c.style.color = '#008080';
            });
            chip.style.background = '#008080';
            chip.style.color = 'white';
        });
    });

    if (copyUpiBtn) {
        copyUpiBtn.addEventListener('click', () => {
            navigator.clipboard.writeText(configuredUpiId);
            const originalText = copyUpiBtn.textContent;
            copyUpiBtn.textContent = 'Copied! ✅';
            setTimeout(() => { copyUpiBtn.textContent = originalText; }, 2000);
        });
    }

    // Toggle Payment Method Tabs
    if (payMethodUpiBtn && payMethodRazorpayBtn) {
        payMethodUpiBtn.addEventListener('click', () => {
            currentPaymentMode = 'upi';
            payMethodUpiBtn.style.background = '#008080';
            payMethodUpiBtn.style.color = 'white';
            payMethodRazorpayBtn.style.background = 'transparent';
            payMethodRazorpayBtn.style.color = '#475569';
            if (upiBox) upiBox.style.display = 'block';
            if (fundsSubmitBtn) fundsSubmitBtn.textContent = 'Submit Direct UPI Donation';
        });

        payMethodRazorpayBtn.addEventListener('click', () => {
            currentPaymentMode = 'razorpay';
            payMethodRazorpayBtn.style.background = '#008080';
            payMethodRazorpayBtn.style.color = 'white';
            payMethodUpiBtn.style.background = 'transparent';
            payMethodUpiBtn.style.color = '#475569';
            if (upiBox) upiBox.style.display = 'none';
            if (fundsSubmitBtn) fundsSubmitBtn.textContent = 'Proceed with Razorpay Checkout';
        });
    }

    // Load UPI config when opening modal
    if (fundsModal) {
        loadUpiConfig();
    }

    if (fundsForm) {
        fundsForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const submitBtn = fundsSubmitBtn || fundsForm.querySelector('.submit-btn');
            const originalBtnText = submitBtn.innerText;

            const formData = new FormData(fundsForm);
            const data = Object.fromEntries(formData);
            const amount = parseFloat(data.quantity);

            if (isNaN(amount) || amount < 1) {
                alert("Please enter a valid amount of at least ₹1.");
                return;
            }

            data.timestamp = new Date().toISOString();
            data.category = "Funds";
            const user = auth.currentUser;
            if (user) {
                data.userId = user.uid;
                data.linkedUserEmail = user.email;
            }

            // MODE 1: Direct UPI Payment with Screenshot
            if (currentPaymentMode === 'upi') {
                if (!currentScreenshotDataUrl) {
                    alert("Please upload a screenshot of your payment receipt to complete donation submission.");
                    if (upiScreenshotDropzone) upiScreenshotDropzone.scrollIntoView({ behavior: 'smooth' });
                    return;
                }

                submitBtn.disabled = true;
                submitBtn.innerText = 'Submitting UPI Screenshot...';

                data.status = "Pending Verification";
                data.paymentMethod = "Direct UPI";
                data.quantity = `₹${amount}`;
                data.paymentScreenshot = currentScreenshotDataUrl;

                try {
                    // 1. Record via backend API
                    await fetch('/api/record-upi-donation', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            name: data.name,
                            email: data.email,
                            phone: data.phone,
                            amount: amount,
                            screenshot: currentScreenshotDataUrl,
                            message: data.message
                        })
                    });

                    // 2. Save to Firebase Realtime Database
                    const donationsRef = ref(db, 'donations');
                    const newDonationRef = push(donationsRef);
                    await set(newDonationRef, data);

                    alert(`Thank you, ${data.name}! Your Direct UPI Donation of ₹${amount} with Payment Screenshot has been submitted for verification.`);
                    fundsForm.reset();
                    currentScreenshotDataUrl = null;
                    if (upiScreenshotPreviewContainer) upiScreenshotPreviewContainer.style.display = 'none';
                    if (upiScreenshotLabel) upiScreenshotLabel.style.display = 'block';
                    if (fundsModal) fundsModal.style.display = 'none';
                } catch (err) {
                    console.error("Error submitting UPI donation screenshot:", err);
                    alert("Error submitting UPI donation: " + err.message);
                } finally {
                    submitBtn.disabled = false;
                    submitBtn.innerText = originalBtnText;
                }
                return;
            }

            // MODE 2: Razorpay Payment Gateway
            submitBtn.disabled = true;
            submitBtn.innerText = 'Initializing Razorpay...';

            try {
                // Fetch Key ID
                const configRes = await fetch('/api/config');
                const configData = await configRes.json();
                if (!configRes.ok || !configData.key_id) {
                    throw new Error(configData.error || 'Failed to fetch payment configuration');
                }

                // Create Razorpay Order
                const orderRes = await fetch('/api/create-order', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        amount: Math.round(amount * 100), // convert to paise
                        currency: 'INR'
                    })
                });
                const orderData = await orderRes.json();
                if (!orderRes.ok || !orderData.order_id) {
                    throw new Error(orderData.error || 'Failed to create payment order');
                }

                // Initialize Checkout Modal
                const options = {
                    key: configData.key_id,
                    amount: orderData.amount,
                    currency: orderData.currency,
                    name: "HappiPlates",
                    description: "Donation of Funds",
                    order_id: orderData.order_id,
                    handler: async function (response) {
                        submitBtn.innerText = 'Verifying Payment...';
                        try {
                            const verifyRes = await fetch('/api/verify-payment', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                    razorpay_payment_id: response.razorpay_payment_id,
                                    razorpay_order_id: response.razorpay_order_id,
                                    razorpay_signature: response.razorpay_signature
                                })
                            });
                            const verifyData = await verifyRes.json();
                            if (verifyRes.ok && verifyData.success) {
                                data.status = "Paid";
                                data.paymentMethod = "Razorpay";
                                data.razorpayPaymentId = response.razorpay_payment_id;
                                data.razorpayOrderId = response.razorpay_order_id;
                                data.razorpaySignature = response.razorpay_signature;
                                data.quantity = `₹${amount}`;

                                const donationsRef = ref(db, 'donations');
                                const newDonationRef = push(donationsRef);
                                await set(newDonationRef, data);

                                alert(`Thank you, ${data.name}! Your donation of ₹${amount} has been successfully received.`);
                                fundsForm.reset();
                                if (fundsModal) fundsModal.style.display = 'none';
                            } else {
                                alert("Payment verification failed: " + (verifyData.error || 'Signature mismatch'));
                            }
                        } catch (verifyErr) {
                            console.error("Verification error:", verifyErr);
                            alert("Error verifying payment: " + verifyErr.message);
                        } finally {
                            submitBtn.innerText = originalBtnText;
                            submitBtn.disabled = false;
                        }
                    },
                    prefill: {
                        name: data.name || '',
                        email: data.email || '',
                        contact: data.phone || ''
                    },
                    theme: {
                        color: "#008080"
                    },
                    modal: {
                        ondismiss: function () {
                            alert("Payment cancelled.");
                            submitBtn.innerText = originalBtnText;
                            submitBtn.disabled = false;
                        }
                    }
                };

                const rzp = new Razorpay(options);
                rzp.on('payment.failed', function (response) {
                    alert(`Payment failed: ${response.error.description}`);
                    submitBtn.innerText = originalBtnText;
                    submitBtn.disabled = false;
                });
                rzp.open();

            } catch (err) {
                console.error("Payment setup error:", err);
                alert("Failed to initialize payment: " + err.message);
                submitBtn.innerText = originalBtnText;
                submitBtn.disabled = false;
            }
        });
    }

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

    // Food Waste Impact Calculator
    const calcCategory = document.getElementById('calc-category');
    const calcQty = document.getElementById('calc-qty');
    const resMeals = document.getElementById('res-meals');
    const resWater = document.getElementById('res-water');
    const resCo2 = document.getElementById('res-co2');

    function calculateImpact() {
        if (!calcCategory || !calcQty || !resMeals || !resWater || !resCo2) return;
        const selectedOption = calcCategory.options[calcCategory.selectedIndex];
        const qty = parseFloat(calcQty.value) || 0;
        
        const mealsPerKg = parseFloat(selectedOption.getAttribute('data-meals')) || 0;
        const waterPerKg = parseFloat(selectedOption.getAttribute('data-water')) || 0;
        const co2PerKg = parseFloat(selectedOption.getAttribute('data-co2')) || 0;

        const totalMeals = Math.round(qty * mealsPerKg);
        const totalWater = Math.round(qty * waterPerKg);
        const totalCo2 = (qty * co2PerKg).toFixed(1);

        resMeals.textContent = `${totalMeals.toLocaleString()} meals`;
        resWater.textContent = `${totalWater.toLocaleString()} liters`;
        resCo2.textContent = `${totalCo2} kg`;
    }

    if (calcCategory && calcQty) {
        calcCategory.addEventListener('change', calculateImpact);
        calcQty.addEventListener('input', calculateImpact);
        calculateImpact(); // Initial run
    }

    // FAQ Accordion
    const faqHeaders = document.querySelectorAll('.faq-header');
    faqHeaders.forEach(header => {
        header.addEventListener('click', () => {
            const item = header.parentElement;
            document.querySelectorAll('.faq-item').forEach(otherItem => {
                if (otherItem !== item) {
                    otherItem.classList.remove('active');
                }
            });
            item.classList.toggle('active');
        });
    });

    // Handle Active Navigation Link highlights during scroll
    const sections = document.querySelectorAll('section[id], main');
    const navLinksList = document.querySelectorAll('.nav-links a:not(.login-btn-nav)');

    window.addEventListener('scroll', () => {
        let currentSectionId = '';
        const scrollPosition = window.scrollY + 100;

        sections.forEach(section => {
            const sectionTop = section.offsetTop;
            const sectionHeight = section.offsetHeight;
            if (scrollPosition >= sectionTop && scrollPosition < sectionTop + sectionHeight) {
                currentSectionId = section.getAttribute('id');
            }
        });

        navLinksList.forEach(link => {
            link.classList.remove('active');
            if (currentSectionId && link.getAttribute('href') === `#${currentSectionId}`) {
                link.classList.add('active');
            }
        });
    });

    // ==========================================================
    // AI FOOD FRESHNESS PREDICTOR INTEGRATION
    // ==========================================================
    const freshnessPredictor = new FoodFreshnessPredictor();
    let currentHomeImage = null;
    let currentModalImage = null;

    // --- 1. Standalone Home Page AI Scanner ---
    const homeDropzone = document.getElementById('home-dropzone');
    const homeDropzoneTrigger = document.getElementById('home-dropzone-trigger');
    const homeFileInput = document.getElementById('home-food-image');
    const homeTimeSlider = document.getElementById('home-time-elapsed');
    const homeTimeDisplay = document.getElementById('home-time-display');
    const homeAnalyzeBtn = document.getElementById('home-analyze-btn');
    const homeScanWrapper = document.getElementById('home-scan-wrapper');
    const homePreviewImg = document.getElementById('home-preview-img');
    const homeLaser = document.getElementById('home-laser');
    const homeScanStatus = document.getElementById('home-scan-status-label');
    const homeAnalysisResults = document.getElementById('home-analysis-results');

    if (homeDropzone && homeFileInput) {
        homeDropzone.addEventListener('click', () => homeFileInput.click());

        homeDropzone.addEventListener('dragover', (e) => {
            e.preventDefault();
            homeDropzone.classList.add('dragover');
        });

        homeDropzone.addEventListener('dragleave', () => {
            homeDropzone.classList.remove('dragover');
        });

        homeDropzone.addEventListener('drop', (e) => {
            e.preventDefault();
            homeDropzone.classList.remove('dragover');
            if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                handleHomeImageUpload(e.dataTransfer.files[0]);
            }
        });

        homeFileInput.addEventListener('change', (e) => {
            if (e.target.files && e.target.files[0]) {
                handleHomeImageUpload(e.target.files[0]);
            }
        });

        function handleHomeImageUpload(file) {
            if (!file || !file.type.startsWith('image/')) {
                alert('Please select a valid picture format (JPG, PNG, WEBP).');
                return;
            }
            const reader = new FileReader();
            reader.onload = (e) => {
                currentHomeImage = new Image();
                currentHomeImage.src = e.target.result;
                currentHomeImage.onload = () => {
                    homeAnalyzeBtn.disabled = false;
                    if (homeDropzoneTrigger) {
                        homeDropzoneTrigger.querySelector('h4').textContent = `Loaded: ${file.name}`;
                        homeDropzoneTrigger.querySelector('p').textContent = "Ready for CNN Freshness Evaluation";
                    }
                    homeAnalysisResults.innerHTML = '';
                    homeScanWrapper.style.display = 'none';
                };
            };
            reader.readAsDataURL(file);
        }

        if (homeTimeSlider && homeTimeDisplay) {
            homeTimeSlider.addEventListener('input', (e) => {
                const hrs = e.target.value;
                homeTimeDisplay.textContent = `${hrs} hour${hrs !== '1' ? 's' : ''}`;
                if (homeAnalysisResults.innerHTML !== '' && currentHomeImage) {
                    runHomeScan();
                }
            });
        }

        if (homeAnalyzeBtn) {
            homeAnalyzeBtn.addEventListener('click', () => runHomeScan());
        }

        async function runHomeScan() {
            if (!currentHomeImage) return;
            homeAnalyzeBtn.disabled = true;
            homeAnalyzeBtn.textContent = '⚡ Running CNN Analysis...';
            homeScanWrapper.style.display = 'block';
            homePreviewImg.src = currentHomeImage.src;
            if (homeLaser) homeLaser.style.display = 'block';
            if (homeScanStatus) {
                homeScanStatus.style.display = 'block';
                homeScanStatus.textContent = "⏳ Initiating multi-parameter image analysis across 8 indicators...";
            }
            homeAnalysisResults.innerHTML = '';

            // Simulate deep learning diagnostic processing time (1.5 seconds)
            setTimeout(async () => {
                const hours = parseFloat(homeTimeSlider.value) || 0;
                const result = await freshnessPredictor.analyze(currentHomeImage, hours, "General");
                
                if (homeLaser) homeLaser.style.display = 'none';
                if (homeScanStatus) {
                    homeScanStatus.textContent = `✅ Scan Complete: ${result.statusText}`;
                    homeScanStatus.style.color = "#10b981";
                }
                
                homeAnalysisResults.innerHTML = generateFreshnessUI(result, currentHomeImage.src);
                homeAnalyzeBtn.disabled = false;
                homeAnalyzeBtn.textContent = '⚡ Re-run CNN Freshness Scan';
            }, 1500);
        }
    }

    // --- 2. Donation Modal AI Scanner Integration ---
    const modalScannerBox = document.getElementById('modal-scanner-box');
    const modalUploadTrigger = document.getElementById('modal-upload-trigger');
    const modalFileInput = document.getElementById('modal-food-image');
    const modalTimeSlider = document.getElementById('modal-time-elapsed');
    const modalTimeDisplay = document.getElementById('modal-time-display');
    const modalScanPreview = document.getElementById('modal-scan-preview');
    const modalPreviewImg = document.getElementById('modal-preview-img');
    const modalScanStatus = document.getElementById('modal-scan-status');
    const modalScanResult = document.getElementById('modal-scan-result');

    // Hidden input fields in donation form
    const inputFreshnessScore = document.getElementById('freshnessScore');
    const inputFreshnessStatus = document.getElementById('freshnessStatus');
    const inputFreshnessParams = document.getElementById('freshnessParameters');
    const inputScannedPreview = document.getElementById('scannedImagePreview');

    if (categorySelect && modalScannerBox) {
        const toggleScannerVisibility = () => {
            modalScannerBox.style.display = 'block';
        };
        categorySelect.addEventListener('change', toggleScannerVisibility);
        donateButtons.forEach(btn => btn.addEventListener('click', () => setTimeout(toggleScannerVisibility, 50)));
    }

    if (modalUploadTrigger && modalFileInput) {
        modalUploadTrigger.addEventListener('click', () => modalFileInput.click());

        modalFileInput.addEventListener('change', (e) => {
            if (e.target.files && e.target.files[0]) {
                const file = e.target.files[0];
                const reader = new FileReader();
                reader.onload = (event) => {
                    currentModalImage = new Image();
                    currentModalImage.src = event.target.result;
                    currentModalImage.onload = () => {
                        modalUploadTrigger.textContent = `📸 Change Picture (${file.name})`;
                        runModalScan();
                    };
                };
                reader.readAsDataURL(file);
            }
        });

        if (modalTimeSlider && modalTimeDisplay) {
            modalTimeSlider.addEventListener('input', (e) => {
                const hrs = e.target.value;
                modalTimeDisplay.textContent = `${hrs} hour${hrs !== '1' ? 's' : ''}`;
                if (currentModalImage) {
                    runModalScan(true);
                }
            });
        }

        function runModalScan(isFastUpdate = false) {
            if (!currentModalImage) return;
            modalScanPreview.style.display = 'block';
            modalPreviewImg.src = currentModalImage.src;
            modalScanResult.innerHTML = '';

            const delay = isFastUpdate ? 200 : 1300;
            if (!isFastUpdate && modalScanStatus) {
                modalScanStatus.textContent = "⏳ Analyzing food picture via CNN algorithms...";
                modalScanStatus.style.color = "#008080";
            }

            setTimeout(async () => {
                const hours = parseFloat(modalTimeSlider ? modalTimeSlider.value : 0) || 0;
                const cat = categorySelect ? categorySelect.value : "General";
                const res = await freshnessPredictor.analyze(currentModalImage, hours, cat);

                if (modalScanStatus) {
                    modalScanStatus.textContent = `Quality Certified: ${res.freshnessPercentage}% Fresh (${res.statusText})`;
                    modalScanStatus.style.color = res.isDonationRecommended ? "#10b981" : "#ef4444";
                }

                modalScanResult.innerHTML = generateFreshnessUI(res, currentModalImage.src);

                if (inputFreshnessScore) inputFreshnessScore.value = `${res.freshnessPercentage}%`;
                if (inputFreshnessStatus) inputFreshnessStatus.value = res.statusText;
                if (inputFreshnessParams) inputFreshnessParams.value = JSON.stringify(res.parameters);
                if (inputScannedPreview && currentModalImage.src.length < 50000) {
                    inputScannedPreview.value = modalFileInput.files[0] ? modalFileInput.files[0].name : "scanned_food.jpg";
                }
            }, delay);
        }

        if (closeBtn) {
            closeBtn.addEventListener('click', resetModalScannerState);
        }
        window.addEventListener('click', (e) => {
            if (e.target === modal) resetModalScannerState();
        });
        if (donationForm) {
            donationForm.addEventListener('reset', resetModalScannerState);
        }

        function resetModalScannerState() {
            currentModalImage = null;
            if (modalUploadTrigger) modalUploadTrigger.textContent = "📸 Upload Food Picture to Test Quality";
            if (modalScanPreview) modalScanPreview.style.display = 'none';
            if (modalScanResult) modalScanResult.innerHTML = '';
            if (modalTimeSlider) modalTimeSlider.value = 0;
            if (modalTimeDisplay) modalTimeDisplay.textContent = "0 hours";
            if (inputFreshnessScore) inputFreshnessScore.value = "";
            if (inputFreshnessStatus) inputFreshnessStatus.value = "";
            if (inputFreshnessParams) inputFreshnessParams.value = "";
        }
    }

    // ==========================================================
    // DONATION CAROUSEL HORIZONTAL SCROLL CONTROLS
    // ==========================================================
    const donationCarousel = document.getElementById('donation-options-carousel');
    const donatePrevBtn = document.getElementById('donate-prev-btn');
    const donateNextBtn = document.getElementById('donate-next-btn');

    if (donationCarousel && donatePrevBtn && donateNextBtn) {
        donatePrevBtn.addEventListener('click', () => {
            donationCarousel.scrollBy({ left: -320, behavior: 'smooth' });
        });
        donateNextBtn.addEventListener('click', () => {
            donationCarousel.scrollBy({ left: 320, behavior: 'smooth' });
        });
    }
});