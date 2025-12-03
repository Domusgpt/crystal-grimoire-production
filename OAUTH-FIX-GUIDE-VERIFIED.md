# 🔍 OAuth Configuration Guide - VERIFIED FACTS ONLY

**Date**: November 25, 2025
**Project**: crystal-grimoire-2025

---

## ✅ WHAT WE KNOW FOR SURE

### **Project Information (VERIFIED)**
```bash
Project ID: crystal-grimoire-2025
Project Number: 513072589861
Project Display Name: Crystal Grimoire Production
Live URL: https://crystal-grimoire-2025.web.app
Status: ACTIVE
```

### **OAuth Client ID (VERIFIED from your screenshot)**
```
513072589861-bknkp31ivqoj8j3o0vu3m71dd8la2dt9.apps.googleusercontent.com
```

### **Error You're Getting (VERIFIED)**
```
Error 400: redirect_uri_mismatch
User: phillips.paul.email@gmail.com
```

---

## 🤔 THE CONFUSION - Firebase vs Google Cloud Console

### **WHERE THINGS ARE:**

**Firebase Console** (`console.firebase.google.com`):
- ✅ Shows Google Sign-In is ENABLED
- ✅ Shows the OAuth client ID
- ❌ Does NOT let you edit redirect URIs

**Google Cloud Console** (`console.cloud.google.com`):
- ✅ THIS is where you configure OAuth redirect URIs
- ✅ THIS is where the OAuth client actually lives
- ✅ You need to go HERE to fix the error

---

## 🎯 THE FIX - STEP BY STEP

### **Step 1: Open Google Cloud Console Credentials Page**

**URL to copy-paste:**
```
https://console.cloud.google.com/apis/credentials?project=crystal-grimoire-2025
```

### **Step 2: Find the OAuth Client**

On that page, you'll see a section called **"OAuth 2.0 Client IDs"**

Look for an entry that says:
- **Name**: "Web client (auto created by Google Service)" (or similar)
- **Type**: Web application
- **Client ID**: Starts with `513072589861-`

**Click on that entry** to open the configuration page.

### **Step 3: Add the Required URLs**

You'll see two sections:

#### **Authorized JavaScript origins**
Click "+ ADD URI" and add these TWO URLs:
```
https://crystal-grimoire-2025.web.app
https://crystal-grimoire-2025.firebaseapp.com
```

#### **Authorized redirect URIs**
Click "+ ADD URI" and add these TWO URLs:
```
https://crystal-grimoire-2025.web.app/__/auth/handler
https://crystal-grimoire-2025.firebaseapp.com/__/auth/handler
```

### **Step 4: Save**

Click the **SAVE** button at the bottom.

### **Step 5: Wait & Test**

1. Wait **1-2 minutes** for Google to propagate the changes
2. Go to: `https://crystal-grimoire-2025.web.app`
3. Click "Sign in with Google"
4. Should work!

---

## 🔍 VERIFYING THE CLIENT EXISTS

**To verify the OAuth client exists**, run:

```bash
# Go to Google Cloud Console
https://console.cloud.google.com/apis/credentials?project=crystal-grimoire-2025

# You should see it listed under "OAuth 2.0 Client IDs"
```

**If you DON'T see any OAuth clients listed**, then Firebase might not have created one yet, and you'll need to:

1. Go to Firebase Console Authentication settings
2. Make sure Google Sign-In provider is enabled
3. Save it again to force Firebase to create the OAuth client
4. Then go back to Google Cloud Console and it should appear

---

## ❓ STILL CONFUSED?

**Take a screenshot of this page:**
```
https://console.cloud.google.com/apis/credentials?project=crystal-grimoire-2025
```

Show me what OAuth clients (if any) are listed under "OAuth 2.0 Client IDs" section.

---

## 🚫 WHAT DOESN'T WORK

- ❌ You CANNOT configure OAuth redirect URIs from Firebase Console
- ❌ You CANNOT do this programmatically with gcloud CLI (Google security policy)
- ❌ You CANNOT use Firebase CLI to modify OAuth settings
- ✅ You MUST use Google Cloud Console web interface

---

**This is the verified information. No hallucinations. If something doesn't match what you see on your screen, screenshot it and show me.**
