const mongoose = require('mongoose');

const giftCardSchema = new mongoose.Schema({
    recipient: {
        type: String,
        required: true,
        maxlength: 30
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
        // Use a more robust email validation regex or library
        match: /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6}$/ 
    },
    amount: {
        type: Number,
        required: true,
        enum: [1000, 2000, 5000]
    },
    cardNumber: {
        type: Number,
        required: true,
        unique: true // Unique index for cardNumber
    },
    expiryDate: {
        type: Date,
        required: true
    },
    qrCode: {
        type: String, // Or Buffer if encrypted token is very long
        required: true
    },
    giftCardImage: {
        type: String,
        required: true
    }
}, {
    timestamps: true
});

const GiftCard = mongoose.model('GiftCard', giftCardSchema);

module.exports = GiftCard;