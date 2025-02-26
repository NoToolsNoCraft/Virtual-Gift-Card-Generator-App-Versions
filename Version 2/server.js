const express = require('express');
const mongoose = require('mongoose'); // ✅ Import mongoose
const GiftCard = require('./models/mongo'); // ✅ Import the GiftCard model
const app = express();
require('dotenv').config();  // Make sure this line is at the top of your file
const cors = require('cors');
app.use(cors());
const port = 3000;

// Middleware to parse JSON request bodies
app.use(express.json());

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
.then(() => console.log('✅ Connected to MongoDB'))
.catch(err => console.log('❌ Error connecting to MongoDB:', err));

// Route to process payment data
app.post('/process-payment', async (req, res) => {
    try {
        const { recipient, message, email, amount, termsAccepted } = req.body;

        // Check if recipient's name is valid (max 30 characters)
        if (!recipient || recipient.length > 30) {
            return res.status(400).json({ error: 'Recipient name must be between 1 and 30 characters.' });
        }

        // Check if message is valid (1-180 characters)
        if (!message || message.length < 1 || message.length > 180) {
            return res.status(400).json({ error: 'Message must be between 1 and 180 characters.' });
        }

        // Check if email is provided and is valid
        if (!email || !validateEmail(email)) {
            return res.status(400).json({ error: 'A valid email address is required.' });
        }

        // Check if amount is one of the valid options
        if (![1000, 2000, 5000].includes(amount)) {
            return res.status(400).json({ error: 'Amount must be one of the following: 1000, 2000, 5000.' });
        }

        // Check if terms are accepted
        if (!termsAccepted) {
            return res.status(400).json({ error: 'You must accept the terms of use to proceed.' });
        }

        // Generate a random card number
        const cardNumber = Math.floor(100000000000 + Math.random() * 900000000000); 

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

// Helper function to validate email format
function validateEmail(email) {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
}

// Start the server
app.listen(port, () => {
    console.log(`🚀 Server running on http://localhost:${port}`);
});
