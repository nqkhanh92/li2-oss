function selectPackage(packageName, price) {
    // Get the button that was clicked
    const button = event.target;
    const originalText = button.innerHTML;
    
    // Set loading state
    button.disabled = true;
    button.innerHTML = '<span class="inline-block animate-spin mr-2">⏳</span> Loading...';
    button.style.opacity = '0.7';
    button.style.cursor = 'not-allowed';
    
    // Save package immediately
    localStorage.setItem('selectedPackage', JSON.stringify({
        name: packageName,
        price: price
    }));
    
    // Wait 1 second before redirect
    setTimeout(() => {
        window.location.href = 'checkout';
    }, 1000);
}
