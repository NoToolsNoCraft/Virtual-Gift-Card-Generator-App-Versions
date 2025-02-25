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
    // Check Terms of Use here before proceeding
    if (!document.getElementById('terms').checked) {
        alert("You must agree to the Terms of Use before proceeding.");
        return; // Stop Google Pay from proceeding if terms are not checked
    }

    const selectedItem = { price: '100.00' };

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
