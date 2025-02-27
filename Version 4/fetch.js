function processPaymentData(paymentData) {
    const orderEndpointUrl = 'http://localhost:3000/process-payment'; // Ensure the URL is correct

    // Gather gift card data from the form
    const recipient = document.getElementById('recipient').value;
    const message = document.getElementById('message').value;
    const email = document.getElementById('email').value;
    const amount = parseInt(document.getElementById('giftAmount').innerText.split(': ')[1].replace(' RSD', ''));
    const termsAccepted = document.getElementById('terms').checked;

    fetch(orderEndpointUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            recipient: recipient,
            message: message,
            email: email,
            amount: amount,
            termsAccepted: termsAccepted
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            console.log('Payment successful:', data); // Debug log
            showNotification('Payment successful! Thank you for your purchase.');
        } else if (data.errors) {
            alert(data.errors.map(error => error.msg).join("\n"));
        } else if (data.error) {
            alert(data.error);
        }
    })
    .catch(error => {
        console.error('Error processing payment:', error);
        showNotification('Payment failed. Please try again.');
    });
}

function showNotification(message) {
    console.log('Showing notification:', message); // Debug log
    const notification = document.createElement('div');
    notification.className = 'notification';
    notification.innerText = message;
    document.body.appendChild(notification);

    setTimeout(() => {
        notification.remove();
    }, 5000); // Remove the notification after 5 seconds
}

// Add some basic styles for the notification
const style = document.createElement('style');
style.innerHTML = `
.notification {
    position: fixed;
    top: 20px;
    right: 20px;
    background-color: #4CAF50;
    color: white;
    padding: 15px;
    border-radius: 5px;
    box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
    z-index: 1000;
}
`;
document.head.appendChild(style);

function sanitizeInput(input) {
    return input.replace(/[<>/'"]/g, ''); // Removes potentially dangerous characters
}

const recipient = sanitizeInput(document.getElementById('recipient').value.trim());
const message = sanitizeInput(document.getElementById('message').value.trim());
const email = sanitizeInput(document.getElementById('email').value.trim());
