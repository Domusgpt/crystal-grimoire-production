# 🚨 GOOGLE SIGN-IN FIX - URGENT

## The Problem

**Error:** `Error 400: redirect_uri_mismatch`

**Why:** The Google Cloud OAuth consent screen doesn't have your Firebase hosting URL (`https://crystal-grimoire-2025.web.app`) authorized as a redirect URI.

**Your Client ID:** `513072589861-bknkp31ivqoj8j3o0vu3m71dd8la2dt9.apps.googleusercontent.com`

---

## The Fix (5 Minutes)

### Step 1: Go to Google Cloud Console OAuth Configuration

**Direct Link:**
https://console.cloud.google.com/apis/credentials/oauthclient/513072589861-bknkp31ivqoj8j3o0vu3m71dd8la2dt9.apps.googleusercontent.com?project=crystal-grimoire-2025

### Step 2: Add Authorized JavaScript Origins

Scroll to **"Authorized JavaScript origins"** section and add:

```
https://crystal-grimoire-2025.web.app
https://crystal-grimoire-2025.firebaseapp.com
```

Click **"+ ADD URI"** for each one.

### Step 3: Add Authorized Redirect URIs

Scroll to **"Authorized redirect URIs"** section and add:

```
https://crystal-grimoire-2025.web.app/__/auth/handler
https://crystal-grimoire-2025.firebaseapp.com/__/auth/handler
```

Click **"+ ADD URI"** for each one.

### Step 4: Save

Click **"SAVE"** at the bottom of the page.

---

## What Should Be Configured

After saving, your OAuth client should have:

### **Authorized JavaScript origins:**
- ✅ `https://crystal-grimoire-2025.web.app`
- ✅ `https://crystal-grimoire-2025.firebaseapp.com`
- ✅ `http://localhost` (for local testing)
- ✅ `http://localhost:5000` (for local testing)

### **Authorized redirect URIs:**
- ✅ `https://crystal-grimoire-2025.web.app/__/auth/handler`
- ✅ `https://crystal-grimoire-2025.firebaseapp.com/__/auth/handler`
- ✅ `http://localhost/__/auth/handler` (for local testing)
- ✅ `http://localhost:5000/__/auth/handler` (for local testing)

---

## Test After Fix

1. **Wait 1-2 minutes** for Google to propagate the changes
2. Go to: https://crystal-grimoire-2025.web.app
3. Click "Sign in with Google"
4. Should work immediately!

---

## Alternative: Quick Console Access

If the direct link doesn't work:

1. Go to: https://console.cloud.google.com
2. Select project: **crystal-grimoire-2025**
3. Navigate to: **APIs & Services** → **Credentials**
4. Click on the OAuth 2.0 Client ID:
   - Name: "Web client (auto created by Google Service)"
   - Client ID: 513072589861-bknkp31ivqoj8j3o0vu3m71dd8la2dt9
5. Follow Steps 2-4 above

---

## Why This Happened

When you create a Firebase project, Google automatically creates an OAuth client for Google Sign-In. However, it only configures localhost URLs by default. When you deploy to Firebase Hosting, you must manually add the production URLs to the OAuth configuration.

**This is a one-time fix.** Once configured, it will work permanently.

---

## Still Not Working?

If you still see the error after adding the URLs:

1. **Clear browser cache** (Ctrl+Shift+Delete)
2. **Try incognito mode**
3. **Wait 5 minutes** (Google propagation delay)
4. **Double-check the URLs** are EXACTLY as shown above (no typos, trailing slashes, etc.)

---

## Contact Support

If the issue persists after following these steps:

**Email:** Paul@clearseassolutions.com

Include:
- Screenshot of the error
- Screenshot of your OAuth client configuration
- The URL you're trying to access

---

**© 2025 Paul Phillips - Clear Seas Solutions LLC**
