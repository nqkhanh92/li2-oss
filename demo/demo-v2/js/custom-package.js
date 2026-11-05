const downloadSlider = document.getElementById('downloadSpeed');
const uploadSlider = document.getElementById('uploadSpeed');
const downloadValue = document.getElementById('downloadValue');
const uploadValue = document.getElementById('uploadValue');
const emailInput = document.getElementById('emailInput');
const featureOptions = document.querySelectorAll('.feature-option');
const featureCheckboxes = document.querySelectorAll('input[name="features"]');

const basePrice = 49;
let speedTierPrice = 0;
let featuresPrice = 0;

downloadSlider.addEventListener('input', function() {
    const speed = this.value;
    downloadValue.textContent = speed >= 1000 ? '1 Gbps' : speed + ' Mbps';
    calculatePrice();
});

uploadSlider.addEventListener('input', function() {
    const speed = this.value;
    uploadValue.textContent = speed + ' Mbps';
    calculatePrice();
});

featureOptions.forEach(option => {
    option.addEventListener('click', function(e) {
        if (e.target.tagName !== 'INPUT') {
            const checkbox = this.querySelector('input[type="checkbox"]');
            checkbox.checked = !checkbox.checked;
        }
        this.classList.toggle('selected', this.querySelector('input[type="checkbox"]').checked);
        calculatePrice();
    });
});

featureCheckboxes.forEach(checkbox => {
    checkbox.addEventListener('change', function() {
        calculatePrice();
    });
});

function calculatePrice() {
    const downloadSpeed = parseInt(downloadSlider.value);
    const uploadSpeed = parseInt(uploadSlider.value);

    if (downloadSpeed <= 100) {
        speedTierPrice = 0;
    } else if (downloadSpeed <= 300) {
        speedTierPrice = 20;
    } else if (downloadSpeed <= 500) {
        speedTierPrice = 40;
    } else if (downloadSpeed <= 750) {
        speedTierPrice = 60;
    } else {
        speedTierPrice = 80;
    }

    if (uploadSpeed > 50) {
        speedTierPrice += 10;
    }
    if (uploadSpeed > 100) {
        speedTierPrice += 10;
    }

    featuresPrice = 0;
    featureCheckboxes.forEach(checkbox => {
        if (checkbox.checked) {
            const price = parseInt(checkbox.closest('.feature-option').dataset.price);
            featuresPrice += price;
        }
    });

    const total = basePrice + speedTierPrice + featuresPrice;

    document.getElementById('basePrice').textContent = '$' + basePrice.toFixed(2);
    document.getElementById('speedPrice').textContent = '$' + speedTierPrice.toFixed(2);
    document.getElementById('featuresPrice').textContent = '$' + featuresPrice.toFixed(2);
    document.getElementById('totalPrice').textContent = '$' + total.toFixed(2);
}

document.getElementById('customPackageForm').addEventListener('submit', function(e) {
    e.preventDefault();

    const email = emailInput.value;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(email)) {
        document.getElementById('emailError').style.display = 'block';
        return;
    }

    const selectedFeatures = [];
    featureCheckboxes.forEach(checkbox => {
        if (checkbox.checked) {
            const option = checkbox.closest('.feature-option');
            const name = option.querySelector('.feature-name').textContent;
            const price = parseInt(option.dataset.price);
            selectedFeatures.push({ name, price });
        }
    });

    const customPackage = {
        name: 'Custom',
        email: email,
        downloadSpeed: parseInt(downloadSlider.value),
        uploadSpeed: parseInt(uploadSlider.value),
        features: selectedFeatures,
        basePrice: basePrice,
        speedTierPrice: speedTierPrice,
        featuresPrice: featuresPrice,
        price: basePrice + speedTierPrice + featuresPrice
    };

    // Set loading state on button
    const submitButton = document.getElementById('continueBtn');
    const originalText = submitButton.innerHTML;
    submitButton.disabled = true;
    submitButton.innerHTML = '<span class="inline-block animate-spin mr-2">⏳</span> Loading...';
    submitButton.style.opacity = '0.7';
    submitButton.style.cursor = 'not-allowed';

    // Track lead with Li2 Analytics immediately
    if (window.li2Analytics && window.li2Analytics.trackLead) {
        window.li2Analytics.trackLead({
            customerExternalId: email,
            eventName: 'custom_package_configured',
            customerEmail: email,
            metadata: {
                packageType: 'Custom',
                downloadSpeed: customPackage.downloadSpeed,
                uploadSpeed: customPackage.uploadSpeed,
                basePrice: customPackage.basePrice,
                speedTierPrice: customPackage.speedTierPrice,
                featuresPrice: customPackage.featuresPrice,
                totalPrice: customPackage.price,
                selectedFeatures: selectedFeatures.map(f => f.name).join(', ')
            }
        });
    }

    // Save package immediately
    localStorage.setItem('selectedPackage', JSON.stringify(customPackage));

    // Wait 1 second before redirect
    setTimeout(() => {
        window.location.href = 'checkout';
    }, 1000);
});

emailInput.addEventListener('input', function() {
    document.getElementById('emailError').style.display = 'none';
});

calculatePrice();
