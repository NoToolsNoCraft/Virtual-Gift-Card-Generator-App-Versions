const express = require('express');
const mongoose = require('mongoose');
const GiftCard = require('./models/mongo');
const { body, validationResult } = require('express-validator');
const crypto = require('crypto'); // ✅ Secure number generation
const dotenv = require('dotenv');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const csrf = require('csurf');
const cookieParser = require('cookie-parser');
const bwipjs = require('bwip-js'); // Import bwip-js

dotenv.config();

const app = express();
app.use(cors({
    origin: 'http://127.0.0.1:5500', // Replace with your frontend's origin
    credentials: true // Allow credentials (cookies, authorization headers, etc.)
}));
app.use(express.json());
app.use(cookieParser());
app.use(helmet()); // Add Helmet to enhance API's security

// Rate limiting middleware
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100 // limit each IP to 100 requests per windowMs
});
app.use(limiter);

// CSRF protection middleware
const csrfProtection = csrf({ cookie: true });
app.use(csrfProtection);

const port = 3000;

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
.then(() => console.log('✅ Connected to MongoDB'))
.catch(err => console.error('❌ Error connecting to MongoDB:', err));

// Function to generate a unique card number
const generateUniqueCardNumber = async () => {
    let isUnique = false;
    let cardNumber = null;
    while (!isUnique) {
        // Generate a secure random card number
        cardNumber = crypto.randomInt(100000000000, 999999999999);

        // Check if the card number already exists in the database
        const existingCard = await GiftCard.findOne({ cardNumber });
        if (!existingCard) {
            isUnique = true; // Unique card number found
        }
    }
    return cardNumber;
};

// Route to get CSRF token
app.get('/get-csrf-token', csrfProtection, (req, res) => {
    res.json({ csrfToken: req.csrfToken() });
});

// Route to process payment data
app.post('/process-payment', csrfProtection, [
    body('recipient').trim().escape().isLength({ min: 1, max: 30 }),
    body('message').trim().escape().isLength({ min: 1, max: 180 }),
    body('email').isEmail().withMessage("A valid email address is required.").normalizeEmail(),
    body('amount').isIn([1000, 2000, 5000]),
    body('termsAccepted').equals('true') // Ensure terms are explicitly accepted
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    try {
        const { recipient, message, email, amount } = req.body;
        const cardNumber = await generateUniqueCardNumber();
        const expiryDate = new Date();
        expiryDate.setFullYear(expiryDate.getFullYear() + 1);
        const expiryDateString = `${expiryDate.getMonth() + 1}/${expiryDate.getFullYear()}`;

        // Generate barcode data
        bwipjs.toBuffer({
            bcid: 'code128', // Barcode type (Code 128)
            text: String(cardNumber), // Data to encode
            scale: 3, // Scaling factor
            height: 10, // Bar height, in millimeters
            includetext: true, // Show human-readable text
            textxalign: 'center' // Center text below the barcode
        }, async (err, png) => {
            if (err) {
                console.error('❌ Error generating barcode:', err);
                return res.status(500).json({ error: 'Barcode generation failed' });
            }

            // Store the barcode data as a Buffer in MongoDB
            const newGiftCard = new GiftCard({
                recipient,
                message,
                email,
                amount,
                cardNumber,
                expiryDate: expiryDateString,
                barcode: png // Store the barcode buffer
            });

            await newGiftCard.save();

            res.status(200).json({
                success: true,
                giftCard: {
                    recipient,
                    message,
                    email,
                    amount,
                    cardNumber,
                    expiryDate: expiryDateString,
                    barcode: png.toString('base64') //Send barcode as base64 string.
                }
            });
        });

    } catch (error) {
        console.error('❌ Error processing payment:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// Start the server
app.listen(port, () => {
    console.log(`🚀 Server running on http://localhost:${port}`);
});
