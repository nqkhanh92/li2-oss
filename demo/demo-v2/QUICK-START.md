# 🚀 Quick Start - SDK Debug Mode Demo

## TL;DR

```bash
# 1. Enable debug mode in dashboard
# Settings → Analytics Settings → Debug Mode → Toggle ON

# 2. Start the demo
docker-compose up
# or
python3 -m http.server 8080

# 3. Open http://localhost:8080
# 4. Click the 🐛 button (bottom-right)
# 5. Complete a purchase
# 6. Check dashboard logs!
```

## Step-by-Step (5 minutes)

### 1️⃣ Enable Debug Mode (Dashboard)
```
1. Login to your Li2.ai dashboard
2. Navigate to: Settings → Analytics Settings
3. Scroll to "Debug Mode" section
4. Toggle the switch ON
5. See the warning message (expected)
```

### 2️⃣ Start the Demo
```bash
cd /home/trungbmt/repositories/li2/quik_proximity_marketing/demo/demo-v2

# Option A: Docker (recommended)
docker-compose up

# Option B: Python
python3 -m http.server 8080

# Option C: Node.js
npx serve -p 8080

# Option D: PHP
php -S localhost:8080
```

### 3️⃣ Test the Flow
```
1. Open: http://localhost:8080
2. Click: 🐛 button (bottom-right corner)
3. Select: Any package (Basic, Premium, or Custom)
4. Click: "Subscribe Now"
5. Fill: Checkout form (or click "Auto Fill Sample")
6. Submit: "Complete Order"
```

### 4️⃣ View Debug Logs
```
Debug Panel (On Demo Page):
- See tracking event appear
- Note the Request ID (green text)
- Status shows "✓ Tracked Successfully"

Dashboard (Analytics Settings):
- Open: Debug Mode section
- See: Real-time log table
- Find: Your sale event by Request ID
- Click: Row to expand full details
```

## 🎯 What to Look For

### In Debug Panel (Demo Page)
```
💰 SALE                    12:34:56 PM
Request ID: req_abc123xyz
✓ Tracked Successfully
```

### In Dashboard Debug Logs
| Timestamp | Type | Request ID      | Status | Batch |
|-----------|------|-----------------|--------|-------|
| 2s ago    | sale | req_abc123xyz   | 200    | 1     |

**Click the row** to see:
- ✅ Full request payload
- ✅ Full response body
- ✅ Metadata (IP, User Agent, etc.)

## 🐛 Troubleshooting

### Debug Panel Not Showing?
```javascript
// Check browser console:
console.log(window.li2DebugPanel); // Should be defined

// If undefined, check:
// 1. Is debug-panel.js loaded? (View page source)
// 2. Any console errors?
// 3. Try hard refresh (Ctrl+Shift+R)
```

### No Logs in Dashboard?
```
✓ Debug mode is ON in settings?
✓ Using correct publishable key?
✓ API URL is correct? (check li2-analytics.js)
✓ Hostname allowed in settings?
✓ Browser network tab shows 200 response?
```

### Request ID Not Showing?
```
This means the API didn't return it. Check:
✓ Backend debug mode implementation deployed?
✓ Middleware is active on /track/* routes?
✓ Response includes "request_id" field?
```

## 💡 Quick Tips

1. **Test Multiple Events**
   ```javascript
   // Open browser console:
   li2Analytics.trackLead({ email: 'test@example.com', name: 'Test User' });
   li2Analytics.trackSale({ customerExternalId: 'test@example.com', amount: 5900 });
   ```

2. **Filter Logs in Dashboard**
   - Click badge buttons: All, Lead, Sale, Pageview, Interaction
   - Only shows logs of selected type

3. **Clear Logs**
   - Debug Panel: Click "Clear" button
   - Dashboard: Click "Clear All Logs" button

4. **Copy Request ID**
   - Click the copy icon next to Request ID
   - Use to search in dashboard

## 📝 Demo Checklist

Before showing the demo to others:

- [ ] Debug mode enabled in dashboard
- [ ] Demo server running (http://localhost:8080)
- [ ] Debug panel appears on page load
- [ ] Can toggle panel with 🐛 button
- [ ] Test purchase flow works end-to-end
- [ ] Request ID appears in both places
- [ ] Dashboard shows logs in real-time
- [ ] Can expand/collapse log details
- [ ] Clear logs works in both places

## 🎬 Demo Script (30 seconds)

> "I'll show you how our SDK debug mode works..."

1. **Show debug panel**: *"This panel tracks all SDK events in real-time"*
2. **Complete purchase**: *"Watch what happens when I submit an order..."*
3. **Point to request ID**: *"See this Request ID? Let me find it in the dashboard..."*
4. **Open dashboard**: *"Here's the same event with full request/response details"*
5. **Expand log**: *"We can see exactly what was sent and received"*

> "That's it! No more guessing if tracking works - you can see everything."

## 🔗 Next Steps

- Read [DEBUG-MODE-GUIDE.md](./DEBUG-MODE-GUIDE.md) for detailed usage
- Check [DEMO-FEATURES.md](./DEMO-FEATURES.md) for technical details
- Review [README.md](./README.md) for general demo info

## 🆘 Need Help?

1. Check troubleshooting section above
2. Review browser console for errors
3. Verify backend implementation is deployed
4. Contact support with:
   - Request ID from debug panel
   - Browser console errors
   - Network tab screenshots

---

**Happy Testing! 🎉**

*The debug mode makes SDK integration 10x easier to validate and troubleshoot.*
