const mongoose = require('mongoose');

// Define the schema for the gift card
const giftCardSchema = new mongoose.Schema({
    recipient: {
        type: String,
        required: true,
        maxlength: 30 // As per your validation
    },
    message: {
        type: String,
        required: true,
        minlength: 1,
        maxlength: 180
    },
    email: {
        type: String,
        required: true,
        match: /.+\@.+\..+/ // Basic email validation
    },
    amount: {
        type: Number,
        required: true,
        enum: [1000, 2000, 5000] // The allowed amounts
    },
    cardNumber: {
        type: Number,
        required: true
    },
    expiryDate: {
        type: String,
        required: true // Can be modified to a Date object if you prefer
    },
    barcode: { 
        type: Buffer,
        required: true 
    },
    giftCardImage: { // Add the giftCardImage field
        type: Buffer,
        required: true
    }
}, {
    timestamps: true // Adds createdAt and updatedAt fields automatically
});

// Create a model for the schema
const GiftCard = mongoose.model('GiftCard', giftCardSchema);

module.exports = GiftCard;