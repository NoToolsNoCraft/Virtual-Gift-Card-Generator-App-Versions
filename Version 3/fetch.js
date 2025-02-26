function processPaymentData(paymentData) {
    const orderEndpointUrl = 'http://localhost:3000/process-payment';

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
        if (data.message) {
            console.log(data.message);
            // Trigger Google Pay here
        } else if (data.error) {
            alert(data.error);
        }
    })
    .catch(error => console.error('Error processing payment:', error));
}
