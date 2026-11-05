#!/bin/bash
#
# Serves the heatmap demo site on port 3001 with CORS headers.
# The dashboard (port 3000) can iframe this page.
#
# Usage:
#   cd demo/heatmap-test-site
#   bash serve.sh
#
# Prerequisites:
#   - Copy the SDK: cp ../../li2-analytics-interaction/dist/index.global.js ./li2-sdk.js
#   - Update index.html: change SDK_PATH to "./li2-sdk.js"
#   - Update index.html: set your actual publishable key
#   - Add "localhost:3001" to your org's allowed_hostnames in Analytics Settings
#

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

# Copy SDK build if not already present
SDK_SRC="$(dirname "$SCRIPT_DIR")/../../li2-analytics-interaction/dist/index.global.js"
if [ -f "$SDK_SRC" ] && [ ! -f "$SCRIPT_DIR/li2-sdk.js" ]; then
  cp "$SDK_SRC" "$SCRIPT_DIR/li2-sdk.js"
  echo "✅ Copied SDK build to li2-sdk.js"
fi

echo "🚀 Serving heatmap demo site on http://localhost:3001"
echo "   Dashboard iframe URL: http://localhost:3001"
echo ""
echo "📋 Checklist:"
echo "   1. SDK script src → ./li2-sdk.js (or your CDN URL)"
echo "   2. data-publishable-key → your org's publishable key"
echo "   3. data-api-url → http://localhost:8080 (or your backend)"
echo "   4. Add 'localhost:3001' to allowed_hostnames in Analytics Settings"
echo ""

npx serve -p 3001 -C --cors "$SCRIPT_DIR"
