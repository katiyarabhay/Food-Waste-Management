require('dotenv').config();
const express = require('express');
const cors = require('cors');
const Razorpay = require('razorpay');
const crypto = require('crypto');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Initialize Razorpay
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET
});

// Serve Razorpay Key ID to Frontend
app.get('/api/config', (req, res) => {
  if (!process.env.RAZORPAY_KEY_ID) {
    return res.status(500).json({ error: 'Razorpay Key ID is not configured in .env' });
  }
  res.json({ key_id: process.env.RAZORPAY_KEY_ID });
});

// Serve Direct UPI Details to Frontend
app.get('/api/upi-config', (req, res) => {
  res.json({
    upi_id: process.env.UPI_ID || '6387279295@pthdfc',
    upi_name: process.env.UPI_NAME || 'HappiPlates Foundation'
  });
});

// In-memory store for recorded UTRs
const recordedUtrs = new Map();

// Endpoint: Verify UTR ID
app.post('/api/verify-utr', (req, res) => {
  try {
    const { utr } = req.body;
    if (!utr) {
      return res.status(400).json({ valid: false, error: 'UTR ID is required.' });
    }

    const cleanUtr = String(utr).trim().replace(/[\s-]/g, '');

    // Standard Indian UPI UTR is 12 digits
    const isValidFormat = /^\d{12}$/.test(cleanUtr);
    if (!isValidFormat) {
      return res.status(400).json({
        valid: false,
        utr: cleanUtr,
        error: 'Invalid UTR format. Standard UPI UTR / Ref No must be 12 digits.'
      });
    }

    const existingTx = recordedUtrs.get(cleanUtr);
    if (existingTx) {
      return res.json({
        valid: true,
        utr: cleanUtr,
        isDuplicate: true,
        message: 'Warning: This UTR has already been submitted previously.',
        previousTransaction: {
          name: existingTx.name,
          amount: existingTx.amount,
          timestamp: existingTx.timestamp
        }
      });
    }

    res.json({
      valid: true,
      utr: cleanUtr,
      isDuplicate: false,
      message: 'Valid 12-digit UTR format.'
    });
  } catch (err) {
    console.error('Error verifying UTR:', err);
    res.status(500).json({ valid: false, error: 'Failed to verify UTR ID.' });
  }
});

// Endpoint: Record Direct UPI Donation
app.post('/api/record-upi-donation', (req, res) => {
  try {
    const { name, email, phone, amount, utr, screenshot, message } = req.body;
    if (!name || !amount) {
      return res.status(400).json({ error: 'Name and Amount are required.' });
    }

    if (!screenshot && !utr) {
      return res.status(400).json({ error: 'Payment proof (Screenshot or UTR ID) is required.' });
    }

    const cleanUtr = utr ? String(utr).trim().replace(/[\s-]/g, '') : '';
    const is12Digit = /^\d{12}$/.test(cleanUtr);
    const isDuplicate = cleanUtr && recordedUtrs.has(cleanUtr);

    let utrStatus = 'Screenshot Attached';
    if (cleanUtr) {
      if (isDuplicate) {
        utrStatus = 'Duplicate UTR';
      } else if (is12Digit) {
        utrStatus = 'Verified (12-Digit)';
      } else {
        utrStatus = 'Pending Verification';
      }
    }

    const transaction = {
      id: `UPI_${Date.now()}`,
      name,
      email,
      phone,
      amount: parseFloat(amount),
      utr: cleanUtr || 'Screenshot Attached',
      utrVerified: is12Digit && !isDuplicate,
      utrStatus,
      hasScreenshot: Boolean(screenshot),
      message: message || '',
      status: 'Pending Verification',
      timestamp: new Date().toISOString()
    };

    if (cleanUtr) {
      recordedUtrs.set(cleanUtr, transaction);
    }

    console.log('Recorded Direct UPI Donation:', transaction);

    res.json({
      success: true,
      message: is12Digit 
        ? 'UPI Donation submitted with verified 12-digit UTR ID! Our team will process your contribution.'
        : 'UPI Donation submitted successfully! Our team will verify your payment shortly.',
      transaction
    });
  } catch (err) {
    console.error('Error recording UPI donation:', err);
    res.status(500).json({ error: 'Failed to record UPI donation.' });
  }
});


// Endpoint: Create Order
app.post('/api/create-order', async (req, res) => {
  try {
    const { amount, currency, receipt } = req.body;

    // Validation
    if (!amount) {
      return res.status(400).json({ error: 'Amount is required' });
    }

    const amountInPaise = parseInt(amount, 10);
    if (isNaN(amountInPaise) || amountInPaise < 100) {
      return res.status(400).json({ error: 'Amount must be a valid integer and at least 100 paise (1 INR)' });
    }

    // Call Razorpay API
    const options = {
      amount: amountInPaise,
      currency: currency || 'INR',
      receipt: receipt || `receipt_order_${Date.now()}`
    };

    const order = await razorpay.orders.create(options);
    
    res.json({
      order_id: order.id,
      amount: order.amount,
      currency: order.currency
    });

  } catch (error) {
    console.error('Error creating Razorpay order:', error);

    // Handle authentication / auth failure
    if (error.statusCode === 401 || (error.error && error.error.description && error.error.description.includes('key'))) {
      return res.status(401).json({ error: 'Razorpay authentication failed. Check your API credentials.' });
    }

    res.status(500).json({ error: error.description || error.message || 'Failed to create order' });
  }
});

// Endpoint: Verify Signature
app.post('/api/verify-payment', (req, res) => {
  try {
    const { razorpay_payment_id, razorpay_order_id, razorpay_signature } = req.body;

    // Missing fields validation
    if (!razorpay_payment_id || !razorpay_order_id || !razorpay_signature) {
      return res.status(400).json({ error: 'Missing required signature verification fields' });
    }

    // Generate expected signature
    const hmac = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET);
    hmac.update(`${razorpay_order_id}|${razorpay_payment_id}`);
    const generated_signature = hmac.digest('hex');

    // Compare signatures
    if (generated_signature === razorpay_signature) {
      res.json({ success: true, message: 'Payment verified successfully' });
    } else {
      res.status(400).json({ success: false, error: 'Signature verification failed. Potential payment tampering.' });
    }

  } catch (error) {
    console.error('Error verifying payment:', error);
    res.status(500).json({ error: 'Internal server error during verification' });
  }
});

// Serve Static Frontend Files
app.use(express.static(path.join(__dirname)));



// Start Server
app.listen(PORT, () => {
  console.log(`HappiPlates server running at http://localhost:${PORT}`);
});
