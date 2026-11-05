const orderData = JSON.parse(localStorage.getItem('orderData'));
const orderId = localStorage.getItem('orderId');

if (!orderData || !orderId) {
    window.location.href = '/';
} else {
    document.getElementById('orderId').textContent = 'Order #: ' + orderId;
    
    const orderDate = new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
    document.getElementById('orderDate').textContent = orderDate;

    document.getElementById('packageName').textContent = orderData.package.name + ' Package';
    document.getElementById('packagePrice').textContent = '$' + orderData.package.price + '/month';

    if (orderData.package.name === 'Custom') {
        const customDetails = document.getElementById('customPackageDetails');
        customDetails.style.display = 'block';
        
        const downloadSpeed = orderData.package.downloadSpeed >= 1000 
            ? '1 Gbps' 
            : orderData.package.downloadSpeed + ' Mbps';
        document.getElementById('customDownloadSpeed').textContent = downloadSpeed;
        document.getElementById('customUploadSpeed').textContent = orderData.package.uploadSpeed + ' Mbps';
        
        if (orderData.package.features && orderData.package.features.length > 0) {
            const featuresDisplay = document.getElementById('customFeaturesDisplay');
            featuresDisplay.innerHTML = '<div class="detail-row" style="margin-top: 15px; padding-top: 15px; border-top: 1px solid rgba(255, 255, 255, 0.1);"><span class="detail-label" style="font-weight: 700;">Additional Features:</span></div>';
            
            orderData.package.features.forEach(feature => {
                const featureRow = document.createElement('div');
                featureRow.className = 'detail-row';
                featureRow.innerHTML = `<span class="detail-label">• ${feature.name}</span><span class="detail-value">+$${feature.price.toFixed(2)}/mo</span>`;
                featuresDisplay.appendChild(featureRow);
            });
        }
    }

    document.getElementById('customerName').textContent = orderData.fullName;
    document.getElementById('customerEmail').textContent = orderData.email;
    document.getElementById('customerPhone').textContent = orderData.phone;

    document.getElementById('installAddress').textContent = orderData.address;
    document.getElementById('installCity').textContent = orderData.city;
    document.getElementById('installZip').textContent = orderData.zipCode;
    
    const installDate = new Date(orderData.installDate).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
    document.getElementById('installDate').textContent = installDate;

    const monthlyFee = orderData.package.price;
    const tax = monthlyFee * 0.1;
    const total = monthlyFee + tax;

    document.getElementById('summaryMonthly').textContent = '$' + monthlyFee.toFixed(2);
    document.getElementById('summaryTax').textContent = '$' + tax.toFixed(2);
    document.getElementById('summaryTotal').textContent = '$' + total.toFixed(2);

    const paymentMethods = {
        'credit-card': 'Credit Card',
        'debit-card': 'Debit Card',
        'bank-transfer': 'Bank Transfer',
        'paypal': 'PayPal'
    };
    document.getElementById('paymentMethod').textContent = paymentMethods[orderData.paymentMethod] || orderData.paymentMethod;
}

function printOrder() {
    window.print();
}
