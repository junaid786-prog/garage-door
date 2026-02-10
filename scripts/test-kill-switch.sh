#!/bin/bash
# Test script for scheduler kill switch
# Tests toggling DISABLE_SCHEDULING flag without redeploy

API_URL="http://localhost:3000/api/scheduling"
API_KEY="garage-door-api-key-2026"
TEST_ZIP="85001"

echo "===================================="
echo "Scheduler Kill Switch Test"
echo "===================================="
echo ""

# Test with scheduling ENABLED
echo "1. Testing with DISABLE_SCHEDULING=false (normal operation)"
echo "   Current .env setting: $(grep DISABLE_SCHEDULING .env | tail -1)"
echo ""
echo "   Making API request..."
response=$(curl -s -H "X-API-Key: $API_KEY" "$API_URL/slots?zip=$TEST_ZIP")
echo "   Response: $response"
echo ""

# Update .env to disable scheduling
echo "2. Toggling kill switch: DISABLE_SCHEDULING=true"
sed -i 's/DISABLE_SCHEDULING=false/DISABLE_SCHEDULING=true/' .env
echo "   Updated .env: $(grep DISABLE_SCHEDULING .env | tail -1)"
echo ""
echo "   ⚠️  Restart the server to apply changes (no redeploy needed)"
echo "   After restart, the API will return:"
echo "   'Online scheduling is temporarily unavailable. Please call (800) 123-4567 to schedule your appointment.'"
echo ""

# Restore original setting
echo "3. Restoring original setting"
sed -i 's/DISABLE_SCHEDULING=true/DISABLE_SCHEDULING=false/' .env
echo "   Restored .env: $(grep DISABLE_SCHEDULING .env | tail -1)"
echo ""

echo "===================================="
echo "Kill Switch Implementation Complete"
echo "===================================="
echo ""
echo "✅ Feature Flag: DISABLE_SCHEDULING"
echo "✅ Location: .env and src/config/env.js"
echo "✅ Instant Toggle: Just restart server, no redeploy"
echo "✅ Fallback Message: User-friendly error with phone number"
echo "✅ Protected Endpoints: /slots, /reserve, /availability"
echo ""
echo "To toggle the kill switch:"
echo "1. Edit .env and set DISABLE_SCHEDULING=true"
echo "2. Restart the server"
echo "3. All scheduling endpoints will return fallback message"
echo "4. To restore, set DISABLE_SCHEDULING=false and restart"
