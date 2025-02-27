// Wait for the DOM to load before defining the function
document.addEventListener('DOMContentLoaded', function () {
    const googlePayScript = document.createElement('script');
    googlePayScript.src = 'https://pay.google.com/gp/p/js/pay.js';
    googlePayScript.async = true;

    // Once the script is loaded, initialize Google Pay
    googlePayScript.onload = onGooglePayLoaded;
    document.body.appendChild(googlePayScript);
});

const tokenizationSpecification = {
    type: 'PAYMENT_GATEWAY',
    parameters: {
        gateway: 'example',
        gatewayMerchantId: 'gatewayMerchantId',
    }
};

const cardPaymentMethod = {
    type: 'CARD',
    tokenizationSpecification: tokenizationSpecification,
    parameters: {
        allowedCardNetworks: ['VISA', 'MASTERCARD'],
        allowedAuthMethods: ['PAN_ONLY', 'CRYPTOGRAM_3DS'],
    }
};

const googlePayConfiguration = {
    apiVersion: 2,
    apiVersionMinor: 0,
    allowedPaymentMethods: [cardPaymentMethod]
};

let googlePayClient;

function onGooglePayLoaded() {
    googlePayClient = new google.payments.api.PaymentsClient({
        environment: 'TEST',
    });

    googlePayClient.isReadyToPay(googlePayConfiguration)
        .then(response => {
            if (response.result) {
                createAndAddButton();
            } else {
                console.log('Google Pay is not supported on this device or browser.');
            }
        })
        .catch(error => console.error('isReadyToPay error: ', error));
}

function createAndAddButton() {
    const googlePayButton = googlePayClient.createButton({
        onClick: onGooglePayButtonClicked,
    });

    document.getElementById('buy-now').appendChild(googlePayButton);
}

function onGooglePayButtonClicked() {
    // Perform all validations here before proceeding
    const recipient = document.getElementById('recipient').value.trim();
    const message = document.getElementById('message').value.trim();
    const email = document.getElementById('email').value.trim();
    const amountText = document.getElementById('giftAmount').innerText;
    const termsChecked = document.getElementById('terms').checked;
    const amount = parseInt(amountText.replace("Amount: ", "").replace(" RSD", ""));

    let errors = [];

    if (!recipient) {
        errors.push("Recipient's Name is required.");
    }

    if (!message) {
        errors.push("Message is required.");
    }

    if (!email) {
        errors.push("Recipient's Email is required.");
    } else if (!isValidEmail(email)) {
        errors.push("Recipient's Email is invalid.");
    }

    if (amount !== 1000 && amount !== 2000 && amount !== 5000) {
        errors.push("Please choose a valid amount (1000, 2000, or 5000 RSD).");
    }

    if (!termsChecked) {
        errors.push("Please agree to the Terms of Use.");
    }

    if (errors.length > 0) {
        alert(errors.join("\n"));
        return; // Stop Google Pay if errors exist.
    }

    // All validations passed, proceed with Google Pay
    const selectedItem = { price: amount.toFixed(2) };
    
    const paymentDataRequest = { ...googlePayConfiguration };
    paymentDataRequest.merchantInfo = {
        merchantId: 'BCR2DN4T767ILP3Z',
        merchantName: 'Pepco Virtual Gift Cards',
    };

    paymentDataRequest.transactionInfo = {
        totalPriceStatus: 'FINAL',
        totalPrice: selectedItem.price,
        currencyCode: 'RSD',
        countryCode: 'RS',
    };

    googlePayClient.loadPaymentData(paymentDataRequest)
        .then(paymentData => processPaymentData(paymentData))
        .catch(error => console.error('loadPaymentData error:', error));
}


function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}


function processPaymentData(paymentData) {
    const orderEndpointUrl = '/process-payment'; 

    fetch(orderEndpointUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(paymentData)
    })
    .then(response => response.json())
    .then(data => console.log('Payment successful:', data))
    .catch(error => console.error('Error processing payment:', error));
}