#!/bin/bash

# Crystal Grimoire - OAuth Configuration Script
# This script programmatically adds the required redirect URIs to the OAuth client

PROJECT_ID="crystal-grimoire-2025"
PROJECT_NUMBER="513072589861"
CLIENT_ID="513072589861-bknkp31ivqoj8j3o0vu3m71dd8la2dt9.apps.googleusercontent.com"

echo "🔮 Crystal Grimoire - OAuth Configuration"
echo "=========================================="
echo ""
echo "Project: $PROJECT_ID"
echo "Client ID: $CLIENT_ID"
echo ""

# Get access token
echo "Getting access token..."
ACCESS_TOKEN=$(gcloud auth print-access-token)

if [ -z "$ACCESS_TOKEN" ]; then
  echo "❌ Failed to get access token. Run: gcloud auth login"
  exit 1
fi

echo "✅ Access token obtained"
echo ""

# Get current OAuth client configuration
echo "Fetching current OAuth client configuration..."
OAUTH_CLIENT=$(curl -s -X GET \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  "https://iap.googleapis.com/v1/projects/$PROJECT_NUMBER/brands/-/identityAwareProxyClients/$CLIENT_ID" \
  2>&1)

if echo "$OAUTH_CLIENT" | grep -q "error"; then
  echo "⚠️  IAP API method not available"
  echo ""
  echo "Using alternative method via Firebase Authentication API..."

  # Alternative: Use Firebase Identity Platform API
  FIREBASE_CONFIG=$(curl -s -X GET \
    -H "Authorization: Bearer $ACCESS_TOKEN" \
    -H "Content-Type: application/json" \
    "https://identitytoolkit.googleapis.com/admin/v2/projects/$PROJECT_ID/config" \
    2>&1)

  if echo "$FIREBASE_CONFIG" | grep -q "error"; then
    echo "❌ Cannot access OAuth configuration via API"
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "MANUAL CONFIGURATION REQUIRED"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "Please follow these steps manually:"
    echo ""
    echo "1. Open this URL:"
    echo "   https://console.cloud.google.com/apis/credentials/oauthclient/$CLIENT_ID?project=$PROJECT_ID"
    echo ""
    echo "2. Add these Authorized JavaScript origins:"
    echo "   • https://crystal-grimoire-2025.web.app"
    echo "   • https://crystal-grimoire-2025.firebaseapp.com"
    echo ""
    echo "3. Add these Authorized redirect URIs:"
    echo "   • https://crystal-grimoire-2025.web.app/__/auth/handler"
    echo "   • https://crystal-grimoire-2025.firebaseapp.com/__/auth/handler"
    echo ""
    echo "4. Click SAVE"
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    exit 1
  fi

  echo "✅ Firebase configuration retrieved"
fi

echo ""
echo "Current configuration:"
echo "$OAUTH_CLIENT" | python3 -m json.tool 2>/dev/null || echo "$OAUTH_CLIENT"

# Check if authorized origins already include our URLs
if echo "$OAUTH_CLIENT" | grep -q "crystal-grimoire-2025.web.app"; then
  echo ""
  echo "✅ OAuth configuration already includes required URLs!"
  echo ""
  echo "If you're still getting redirect_uri_mismatch errors:"
  echo "1. Clear browser cache (Ctrl+Shift+Delete)"
  echo "2. Try incognito mode"
  echo "3. Wait 5 minutes for Google to propagate changes"
  exit 0
fi

echo ""
echo "Adding required URLs to OAuth client..."

# Prepare update payload
UPDATE_PAYLOAD=$(cat <<EOF
{
  "displayName": "Web client (auto created by Google Service)",
  "secret": "GOCSPX-SECRET",
  "redirectUris": [
    "https://crystal-grimoire-2025.web.app/__/auth/handler",
    "https://crystal-grimoire-2025.firebaseapp.com/__/auth/handler",
    "http://localhost/__/auth/handler",
    "http://localhost:5000/__/auth/handler"
  ],
  "allowedOrigins": [
    "https://crystal-grimoire-2025.web.app",
    "https://crystal-grimoire-2025.firebaseapp.com",
    "http://localhost",
    "http://localhost:5000"
  ]
}
EOF
)

echo "Updating OAuth client configuration..."
UPDATE_RESULT=$(curl -s -X PATCH \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d "$UPDATE_PAYLOAD" \
  "https://iap.googleapis.com/v1/projects/$PROJECT_NUMBER/brands/-/identityAwareProxyClients/$CLIENT_ID" \
  2>&1)

if echo "$UPDATE_RESULT" | grep -q "error"; then
  echo "❌ Failed to update OAuth client"
  echo "$UPDATE_RESULT"
  exit 1
fi

echo "✅ OAuth client updated successfully!"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "CONFIGURATION COMPLETE!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Google Sign-In should now work at:"
echo "  https://crystal-grimoire-2025.web.app"
echo ""
echo "Wait 1-2 minutes for changes to propagate, then test!"
