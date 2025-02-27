const express = require('express');
const mongoose = require('mongoose');
const GiftCard = require('./models/mongo');
const { body, validationResult } = require('express-validator');
const crypto = require('crypto'); // ✅ Secure number generation
const dotenv = require('dotenv');
dotenv.config();
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

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

// Route to process payment data
app.post('/process-payment', [
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

        // Generate a unique card number
        const cardNumber = await generateUniqueCardNumber();

        // Set expiry date (12 months from now)
        const expiryDate = new Date();
        expiryDate.setFullYear(expiryDate.getFullYear() + 1);
        const expiryDateString = `${expiryDate.getMonth() + 1}/${expiryDate.getFullYear()}`;

        // Create a new GiftCard document
        const newGiftCard = new GiftCard({
            recipient,
            message,
            email,
            amount,
            cardNumber,
            expiryDate: expiryDateString
        });

        // Save the gift card to MongoDB
        await newGiftCard.save();

        // Return success response
        res.status(200).json({
            success: true,
            giftCard: {
                recipient,
                message,
                email,
                amount,
                cardNumber,
                expiryDate: expiryDateString
            }
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
