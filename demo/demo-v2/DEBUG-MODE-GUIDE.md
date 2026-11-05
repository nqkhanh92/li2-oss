# Server-Side SDK Debug Mode Demo Guide

This demo has been enhanced to demonstrate the **Server-Side SDK Debug Mode** feature, which allows you to track and debug all SDK requests in real-time.

## 🎯 What's New

The demo now includes:
- **Live Debug Panel** - Floating debug panel showing all tracking events
- **Request ID Display** - View the `request_id` returned from the API
- **Real-time Logging** - See tracking events as they happen
- **Status Indicators** - Visual feedback on successful tracking

## 🚀 How to Use

### Step 1: Enable Debug Mode in Dashboard

1. Navigate to **Analytics Settings** in your Li2.ai dashboard
2. Scroll to the **Debug Mode** section
3. Toggle the **Enable Debug Mode** switch to ON
4. You'll see a warning about sensitive data in logs

### Step 2: Run the Demo

```bash
# Navigate to the demo directory
cd /home/trungbmt/repositories/li2/quik_proximity_marketing/demo/demo-v2

# Serve the demo (if using Docker)
docker-compose up

# Or use a simple HTTP server
python3 -m http.server 8080
# or
npx serve
```

### Step 3: Test SDK Tracking

1. **Open the demo** in your browser (e.g., http://localhost:8080)
2. **Click the floating 🐛 button** in the bottom-right corner to open the debug panel
3. **Select a package** (Basic, Premium, or Custom) and click "Subscribe Now"
4. **Fill out the checkout form** (or click "Auto Fill Sample")
5. **Complete the order** - this triggers a `trackSale` event

### Step 4: View Debug Logs in Dashboard

1. Go back to **Analytics Settings → Debug Mode** in your dashboard
2. You'll see a real-time table showing all SDK requests
3. **Each log entry shows:**
   - **Timestamp** - When the request was made
   - **Type** - lead, sale, pageview, interaction
   - **Request ID** - Unique identifier for correlation
   - **Status** - HTTP response status
   - **Batch Size** - Number of events in the request

4. **Click on a log row** to expand and view:
   - Full request payload (body sent to API)
   - Full response body
   - Metadata (IP, User Agent, Referrer)
   - Error messages (if any)

### Step 5: Verify Request ID Flow

The demo shows how `request_id` flows through the system:

1. **In the Debug Panel** (on the demo page):
   - After a tracking event, you'll see the `request_id` returned by the API
   - This confirms the API received and processed your request

2. **In the Dashboard Debug Logs**:
   - Find the same `request_id` in the logs table
   - Verify the request payload matches what you sent
   - Check the response status is 200 (success)

## 🔍 Testing Different Event Types

### Lead Tracking
While the demo focuses on sales, you can test lead tracking by:
```javascript
// In browser console
li2Analytics.trackLead({
  email: 'test@example.com',
  name: 'Test User',
  phone: '+1234567890',
  eventName: 'newsletter_signup'
});
```

### Sale Tracking
This is automatically triggered when completing checkout:
```javascript
li2Analytics.trackSale({
  customerExternalId: 'customer@example.com',
  amount: 5900, // Amount in cents ($59.00)
  eventName: 'internet_package_purchase',
  currency: 'USD',
  invoiceId: 'INV-ABC123',
  metadata: {
    packageName: 'Premium',
  }
});
```

### Pageview & Interaction Tracking
These are automatically tracked when enabled in SDK initialization:
- **Pageviews** - Tracked on every page navigation
- **Clicks** - Tracked on button/link clicks
- **Scroll** - Tracked on page scroll events

## 📊 Debug Panel Features

### Visual Indicators
- 📧 **Lead** - Blue badge
- 💰 **Sale** - Green badge
- 👁️ **Pageview** - Purple badge
- 🖱️ **Interaction** - Orange badge

### Actions
- **Clear** - Remove all logs from the panel
- **Minimize (−)** - Hide the debug panel
- **🐛 Toggle Button** - Show/hide the panel

### Auto-Features
- **Auto-scroll** - New logs appear at the top
- **Pulse Animation** - Toggle button pulses when new events arrive
- **Success Status** - Green checkmark when API confirms tracking

## 🔧 Configuration

The SDK is initialized in `js/li2-analytics.js`:

```javascript
s.setAttribute("data-publishable-key", "li2_pk_...");
s.setAttribute("data-api-url", "http://localhost:8088");
s.setAttribute("data-pageview", "true");
s.setAttribute("data-clicks", "true");
s.setAttribute("data-scroll", "true");
s.setAttribute("data-debug", "true"); // Enable console logging
```

## 🛠️ Troubleshooting

### Debug Panel Not Showing
- Make sure `debug-panel.js` is loaded after `li2-analytics.js`
- Check browser console for errors
- Verify the 🐛 toggle button appears in bottom-right corner

### Request ID Not Appearing
- Ensure debug mode is **enabled** in Analytics Settings
- Check that the API is returning `request_id` in the response
- Verify the SDK is properly initialized

### Logs Not Appearing in Dashboard
- Confirm debug mode is **ON** in Analytics Settings
- Check that the correct `publishable_key` is being used
- Verify the API URL is correct
- Check browser network tab for API request status

### No Events Being Tracked
- Open browser console and look for SDK initialization logs
- Verify the `data-publishable-key` is correct
- Check allowed hostnames in Analytics Settings
- Ensure CORS is properly configured

## 💡 Best Practices

1. **Use Custom Request IDs** for easier correlation:
   ```javascript
   li2Analytics.trackSale({
     request_id: 'my-unique-id-123', // Optional custom ID
     // ... other fields
   });
   ```

2. **Clear Debug Logs Regularly** - The logs can grow large with high traffic

3. **Disable Debug Mode in Production** - Only use for debugging/testing

4. **Test Different Scenarios**:
   - Valid tracking events
   - Invalid data (missing required fields)
   - Network failures
   - Large batch sizes (pageviews/interactions)

5. **Use Filters** in the Dashboard:
   - Filter by request type (lead, sale, pageview, interaction)
   - Filter by date range
   - Search by request_id

## 📝 Example Debug Log Entry

When you complete an order, you'll see a log like this in the dashboard:

```json
{
  "id": "log_abc123",
  "created_at": "2026-03-10T12:34:56Z",
  "organization_id": "org_xyz789",
  "request_id": "req_def456",
  "request_type": "sale",
  "request_payload": {
    "customerExternalId": "john.smith@example.com",
    "amount": 5900,
    "eventName": "internet_package_purchase",
    "currency": "USD",
    "invoiceId": "INV-ABC123",
    "metadata": {
      "packageName": "Premium"
    }
  },
  "response_status": 200,
  "response_body": {
    "success": true,
    "request_id": "req_def456",
    "customer_id": "cus_ghi789"
  },
  "ip": "192.168.1.1",
  "user_agent": "Mozilla/5.0...",
  "referrer": "http://localhost:8080/",
  "publishable_key": "li2_pk_...",
  "batch_size": 1,
  "error_message": null
}
```

## 🎓 Learning Resources

- [SDK Documentation](https://docs.li2.ai/sdk)
- [Debug Mode API Reference](https://docs.li2.ai/api/debug-mode)
- [Analytics Settings Guide](https://docs.li2.ai/settings/analytics)

## 🤝 Need Help?

If you encounter issues:
1. Check this guide first
2. Review the troubleshooting section
3. Open the browser console for error messages
4. Contact support with your request_id for assistance

---

**Happy Debugging! 🐛✨**
