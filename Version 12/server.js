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
const qrcode = require('qrcode'); // Import qrcode
const htmlToImage = require('node-html-to-image');
const fs = require('fs').promises; // Import fs.promises for async file operations
const path = require('path'); // Import path for file path manipulation
const puppeteer = require('puppeteer');
const nodemailer = require('nodemailer');

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

const generateUniqueCardNumber = async () => {
    let isUnique = false;
    let cardNumber = null;
    let attempts = 0; // Track attempts
    while (!isUnique && attempts < 1000) { // Add attempt limit
        attempts++;
        cardNumber = crypto.randomInt(100000000000, 999999999999);
        const existingCard = await GiftCard.findOne({ cardNumber });
        if (!existingCard) {
            isUnique = true;
        }
    }
    console.log(`Card number generated after ${attempts} attempts.`); // Log attempts
    if (!isUnique) {
      throw new Error("Could not generate unique card number after 1000 attempts");
    }
    return cardNumber;
};


// Encryption and decryption functions (for demonstration purposes)
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY; // Store securely!
const IV_LENGTH = 16;

function encrypt(text) {
    let iv = crypto.randomBytes(IV_LENGTH);
    let cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY, 'hex'), iv); // Key should be a buffer from hex
    let encrypted = cipher.update(text);

    encrypted = Buffer.concat([encrypted, cipher.final()]);

    return iv.toString('hex') + ':' + encrypted.toString('hex');
}

function decrypt(text) {
    let textParts = text.split(':');
    let iv = Buffer.from(textParts.shift(), 'hex');
    let encryptedText = Buffer.from(textParts.join(':'), 'hex');
    let decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), iv);
    let decrypted = decipher.update(encryptedText);

    decrypted = Buffer.concat([decrypted, decipher.final()]);

    return decrypted.toString();
}

// Function to generate gift card image
const generateGiftCardImage = async (recipient, message, amount, cardNumber, qrCodeDataUrl) => {
    const backgroundImagePath = path.join(__dirname, 'pepcoBackground.webp');
    const backgroundImageBuffer = await fs.readFile(backgroundImagePath);
    const backgroundImageBase64 = `data:image/webp;base64,${backgroundImageBuffer.toString('base64')}`;

    const html = `
        <html>
        <head>
            <style>
                * { margin: 0; padding: 0; box-sizing: border-box; }
                body { width: 300px; height: 550px; display: flex; justify-content: center; align-items: center; }
                .card {
                    width: 300px;
                    height: 550px;
                    background: url('${backgroundImageBase64}') no-repeat center center/cover;
                    color: white;
                    display: flex;
                    flex-direction: column;
                    justify-content: flex-start;
                    align-items: center;
                    border-radius: 20px;
                    padding-top: 20px;
                    position: relative;
                }
                p { font-size: 16px; margin: 10px; text-align: center; }
                .qrcode {
                    width: 150px;
                    position: absolute;
                    margin-top: 270px;
                }
            </style>
        </head>
        <body>
            <div class="card">
                <p style="font-size: 20px;">${recipient}</p>
                <p>${message}</p>
                <p>Amount: ${amount} RSD</p>
                ${qrCodeDataUrl ? `<img class="qrcode" src="${qrCodeDataUrl}" />` : ''}
            </div>
        </body>
        </html>
    `;

    return htmlToImage({
        html: html,
        quality: 100,
        type: 'png',
        puppeteer: puppeteer,
        encoding: 'buffer',
        viewport: { width: 300, height: 550 },
        transparent: true
    });
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
    body('termsAccepted').equals('true')
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    try {

        const { recipient, message, email, amount, paymentStatus} = req.body;
        
        if (paymentStatus !== "success") { // Check payment status
            return res.status(400).json({ success: false, error: "Payment was not successful." });
        }

        const cardNumber = await generateUniqueCardNumber();
        const expiryDate = new Date();
        expiryDate.setFullYear(expiryDate.getFullYear() + 1);

        const token = crypto.randomBytes(20).toString('hex');
        const encryptedToken = encrypt(token);
        const qrCodeDataUrl = await qrcode.toDataURL(encryptedToken);

        const giftCardImageBuffer = await generateGiftCardImage(recipient, message, amount, cardNumber, qrCodeDataUrl);

        const imageFileName = `giftcard-${cardNumber}.png`;
        const imagePath = path.join(__dirname, imageFileName);
        await fs.writeFile(imagePath, giftCardImageBuffer);

        const newGiftCard = new GiftCard({
            recipient,
            message,
            email,
            amount,
            cardNumber,
            expiryDate: expiryDate,
            qrCode: encryptedToken,
            giftCardImage: imageFileName
        });

        await newGiftCard.save();
        console.log("Gift card saved successfully.");
        
        const transporter = nodemailer.createTransport({
            host: 'smtp.zoho.eu',
            port: 465,
            secure: true,
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS,
            },
        });

        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: email,
            subject: 'Your Gift Card',
            text: `Dear ${recipient},\n\nHere is your gift card.`,
            attachments: [{
                filename: imageFileName,
                content: giftCardImageBuffer,
                encoding: 'base64',
            }],
        };

        transporter.sendMail(mailOptions, (error, info) => {
            if (error) {
                console.error('❌ Error sending email:', error);
            } else {
                console.log('✅ Email sent:', info.response);
            }
        });

        res.status(200).json({
            success: true,
            giftCard: {
                recipient,
                message,
                email,
                amount,
                cardNumber,
                expiryDate: expiryDate,
                qrCode: encryptedToken,
                giftCardImage: giftCardImageBuffer.toString('base64'),
                imageFileName: imageFileName
            }
        });

    } catch (error) {
        console.error('❌ Error processing payment:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});


app.post('/redeem-giftcard', async (req, res) => {
    try {
        const { encryptedToken } = req.body;
        const decryptedToken = decrypt(encryptedToken);
        const giftCard = await GiftCard.findOne({ qrCode: encryptedToken }); // Find by the encrypted token

        if (!giftCard) {
            return res.status(404).json({ error: 'Gift card not found' });
        }

        // Perform validation (e.g., expiry date, usage limits)

        // Process the gift card transaction

        res.json({ success: true, giftCard });
    } catch (error) {
        console.error('Error redeeming gift card:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});


// Start the server
app.listen(port, () => {
    console.log(`🚀 Server running on http://localhost:${port}`);
});