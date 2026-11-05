const selectedPackage = JSON.parse(localStorage.getItem('selectedPackage'));

if (!selectedPackage) {
    window.location.href = '/';
} else {
    document.getElementById('summaryPackageName').textContent = selectedPackage.name + ' Package';
    document.getElementById('summaryPackagePrice').textContent = '$' + selectedPackage.price + '/month';
    document.getElementById('monthlyFee').textContent = '$' + selectedPackage.price.toFixed(2);
    
    if (selectedPackage.name === 'Custom') {
        const customDetails = document.getElementById('customDetails');
        customDetails.style.display = 'block';
        
        const downloadSpeed = selectedPackage.downloadSpeed >= 1000 
            ? '1 Gbps' 
            : selectedPackage.downloadSpeed + ' Mbps';
        document.getElementById('customDownload').textContent = downloadSpeed;
        document.getElementById('customUpload').textContent = selectedPackage.uploadSpeed + ' Mbps';
        
        if (selectedPackage.features && selectedPackage.features.length > 0) {
            const featuresList = document.getElementById('customFeaturesList');
            featuresList.innerHTML = '<div class="summary-item" style="border-top: 1px solid rgba(255, 255, 255, 0.1); padding-top: 15px; margin-top: 10px;"><span style="font-weight: 600; color: white;">Additional Features</span></div>';
            
            selectedPackage.features.forEach(feature => {
                const featureItem = document.createElement('div');
                featureItem.className = 'summary-item';
                featureItem.style.padding = '8px 0';
                featureItem.style.fontSize = '0.9em';
                featureItem.innerHTML = `<span>${feature.name}</span><span>+$${feature.price.toFixed(2)}</span>`;
                featuresList.appendChild(featureItem);
            });
        }
        
        if (selectedPackage.email) {
            const emailInput = document.getElementById('emailInput');
            emailInput.value = selectedPackage.email;
            emailInput.disabled = true;
            emailInput.style.opacity = '0.6';
            emailInput.style.cursor = 'not-allowed';
        }
    }
    
    const tax = selectedPackage.price * 0.1;
    document.getElementById('tax').textContent = '$' + tax.toFixed(2);
    
    const total = selectedPackage.price + tax;
    document.getElementById('total').textContent = '$' + total.toFixed(2);
}

const today = new Date().toISOString().split('T')[0];
document.getElementById('installDateInput').setAttribute('min', today);

document.getElementById('checkoutForm').addEventListener('submit', function(e) {
    e.preventDefault();
    
    const formData = {
        fullName: document.getElementById('fullNameInput').value,
        email: document.getElementById('emailInput').value,
        phone: document.getElementById('phoneInput').value,
        address: document.getElementById('addressInput').value,
        city: document.getElementById('cityInput').value,
        zipCode: document.getElementById('zipCodeInput').value,
        installDate: document.getElementById('installDateInput').value,
        paymentMethod: document.getElementById('paymentMethodSelect').value,
        package: selectedPackage
    };

    if (validateForm(formData)) {
        // Set loading state on button
        const submitButton = document.getElementById('completeOrderBtn');
        const originalText = submitButton.innerHTML;
        submitButton.disabled = true;
        submitButton.innerHTML = '<span class="inline-block animate-spin mr-2">⏳</span> Processing...';
        submitButton.style.opacity = '0.7';
        submitButton.style.cursor = 'not-allowed';

        // Track sale with Li2 Analytics immediately
        if (window.li2Analytics && window.li2Analytics.trackSale) {
            const amountInCents = Math.round(selectedPackage.price * 100);
            
            window.li2Analytics.trackSale({
                customerExternalId: formData.email,
                amount: amountInCents,
                eventName: 'internet_package_purchase',
                currency: 'USD',
                invoiceId: 'INV-' + Math.random().toString(36).substring(2, 11).toUpperCase(),
                metadata: {
                    packageName: selectedPackage.name,
                }
            });
        }

        // Save order data immediately
        localStorage.setItem('orderData', JSON.stringify(formData));
        
        const orderId = 'ORD-' + Date.now();
        localStorage.setItem('orderId', orderId);

        // Wait 1 second before redirect
        setTimeout(() => {
            window.location.href = 'thankyou';
        }, 1000);
    }
});

function validateForm(data) {
    let isValid = true;

    if (!data.fullName || data.fullName.trim().length < 3) {
        showError('fullNameError');
        isValid = false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(data.email)) {
        showError('emailError');
        isValid = false;
    }

    if (!data.phone || data.phone.trim().length < 10) {
        showError('phoneError');
        isValid = false;
    }

    if (!data.address || data.address.trim().length < 5) {
        showError('addressError');
        isValid = false;
    }

    return isValid;
}

function showError(errorId) {
    const errorElement = document.getElementById(errorId);
    errorElement.style.display = 'block';
    setTimeout(() => {
        errorElement.style.display = 'none';
    }, 3000);
}

function autoFillForm() {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    document.getElementById('fullNameInput').value = 'John Smith';
    
    const emailInput = document.getElementById('emailInput');
    if (!emailInput.disabled) {
        emailInput.value = 'john.smith@example.com';
    }
    
    document.getElementById('phoneInput').value = '+1 (555) 123-4567';
    document.getElementById('addressInput').value = '123 Main Street, Apt 4B';
    document.getElementById('cityInput').value = 'New York';
    document.getElementById('zipCodeInput').value = '10001';
    document.getElementById('installDateInput').value = tomorrowStr;
    document.getElementById('paymentMethodSelect').value = 'credit-card';

    const inputs = document.querySelectorAll('input:not(:disabled), select');
    inputs.forEach(input => {
        input.classList.add('border-purple-500');
        setTimeout(() => {
            input.classList.remove('border-purple-500');
        }, 1000);
    });
}

document.querySelectorAll('input, select').forEach(input => {
    input.addEventListener('input', function() {
        const errorId = this.id + 'Error';
        const errorElement = document.getElementById(errorId);
        if (errorElement) {
            errorElement.style.display = 'none';
        }
    });
});
