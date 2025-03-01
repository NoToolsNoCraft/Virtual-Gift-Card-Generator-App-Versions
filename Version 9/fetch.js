

    // Ensure submit button event listener is properly attached
    const submitButton = document.getElementById('submitPaymentButton');
    if (submitButton) {
        submitButton.addEventListener('click', function () {
            const paymentData = {
                recipient: document.getElementById("recipient").value.trim(),
                message: document.getElementById("message").value.trim(),
                email: document.getElementById("email").value.trim(),
                amount: document.getElementById("amount").value.trim()
            };
            processPaymentData(paymentData);
        });
    }
