# 🚀 Crystal Grimoire - Production Setup Guide

This guide walks you through setting up Stripe payments, Firebase secrets, and deploying the complete admin infrastructure.

---

## Part 1: Stripe Setup (15 minutes)

### Step 1: Create/Access Stripe Account

**🔗 Go to:** https://dashboard.stripe.com/register

1. If you don't have a Stripe account, sign up
2. If you have an account, log in at: https://dashboard.stripe.com/login

### Step 2: Get Your API Keys

**🔗 Go to:** https://dashboard.stripe.com/test/apikeys

1. You'll see two keys:
   - **Publishable key** (starts with `pk_test_`)
   - **Secret key** (starts with `sk_test_`) - Click "Reveal test key"

2. **Copy the Secret Key** - You'll need this for Firebase secrets

   ⚠️ **IMPORTANT**: Start in **TEST MODE** (toggle in top-right should say "Test mode")

### Step 3: Create Products & Pricing

**🔗 Go to:** https://dashboard.stripe.com/test/products

#### Create Product 1: Premium
1. Click **"+ Add product"**
2. Fill in:
   - Name: `Crystal Grimoire Premium`
   - Description: `Premium tier with 5 daily AI consultations`
   - Pricing model: **Recurring**
   - Price: `$9.99 USD`
   - Billing period: **Monthly**
3. Click **"Save product"**
4. **Copy the Price ID** (starts with `price_`) from the product page

#### Create Product 2: Pro
1. Click **"+ Add product"**
2. Fill in:
   - Name: `Crystal Grimoire Pro`
   - Description: `Pro tier with 20 daily AI consultations and priority support`
   - Pricing model: **Recurring**
   - Price: `$29.99 USD`
   - Billing period: **Monthly**
3. Click **"Save product"**
4. **Copy the Price ID** (starts with `price_`)

#### Create Product 3: Founders
1. Click **"+ Add product"**
2. Fill in:
   - Name: `Crystal Grimoire Founders`
   - Description: `Founders tier with unlimited consultations and lifetime access`
   - Pricing model: **Recurring**
   - Price: `$199.00 USD`
   - Billing period: **Yearly**
3. Click **"Save product"**
4. **Copy the Price ID** (starts with `price_`)

### Step 4: Set Up Webhook

**🔗 Go to:** https://dashboard.stripe.com/test/webhooks

1. Click **"+ Add endpoint"**
2. Enter endpoint URL:
   ```
   https://us-central1-crystal-grimoire-2025.cloudfunctions.net/handleStripeWebhook
   ```
3. Click **"Select events"**
4. Select these events:
   - ✅ `checkout.session.completed`
   - ✅ `invoice.payment_succeeded`
   - ✅ `invoice.payment_failed`
   - ✅ `customer.subscription.deleted`
5. Click **"Add endpoint"**
6. **Copy the Signing Secret** (starts with `whsec_`) - You'll need this for Firebase

---

## Part 2: Firebase Secrets Setup (5 minutes)

You have **6 secrets** to set. I'll create a script to make this easy.

### Option A: Interactive Script (RECOMMENDED)

Open your terminal and run:

```bash
cd /mnt/c/Users/millz/crystal-grimoire-fresh-DEPLOY

# Run the setup script
bash setup-stripe-secrets.sh
```

The script will prompt you to paste each value:
1. Stripe Secret Key (sk_test_...)
2. Stripe Webhook Secret (whsec_...)
3. Premium Price ID (price_...)
4. Pro Price ID (price_...)
5. Founders Price ID (price_...)

### Option B: Manual Setup

If the script doesn't work, set each secret manually:

```bash
# 1. Stripe Secret Key
firebase functions:secrets:set STRIPE_SECRET_KEY --project crystal-grimoire-2025
# Paste: sk_test_... (from Step 2)

# 2. Stripe Webhook Secret
firebase functions:secrets:set STRIPE_WEBHOOK_SECRET --project crystal-grimoire-2025
# Paste: whsec_... (from Step 4)

# 3. Premium Price ID
firebase functions:secrets:set STRIPE_PRICE_PREMIUM --project crystal-grimoire-2025
# Paste: price_... (from Step 3, Product 1)

# 4. Pro Price ID
firebase functions:secrets:set STRIPE_PRICE_PRO --project crystal-grimoire-2025
# Paste: price_... (from Step 3, Product 2)

# 5. Founders Price ID
firebase functions:secrets:set STRIPE_PRICE_FOUNDERS --project crystal-grimoire-2025
# Paste: price_... (from Step 3, Product 3)
```

---

## Part 3: Firestore Security Rules (2 minutes)

### Update Security Rules

**🔗 Go to:** https://console.firebase.google.com/project/crystal-grimoire-2025/firestore/rules

1. Click on the **"Rules"** tab
2. Replace the entire content with the rules from:
   `/mnt/c/Users/millz/crystal-grimoire-fresh-DEPLOY/firestore.rules`

3. Or copy this complete ruleset:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Helper function to check if user is admin
    function isAdmin() {
      return request.auth != null &&
        exists(/databases/$(database)/documents/admins/$(request.auth.uid)) &&
        get(/databases/$(database)/documents/admins/$(request.auth.uid)).data.role == 'admin';
    }

    // Helper function to check email verification
    function isEmailVerified() {
      return request.auth != null &&
        request.auth.token.email_verified == true;
    }

    // Admin collection - admin-only access
    match /admins/{adminId} {
      allow read: if isAdmin();
      allow write: if false; // Manually managed
    }

    // Marketplace listings
    match /marketplace/{listing} {
      allow read: if true; // Public read
      allow create: if isEmailVerified(); // Must verify email
      allow update, delete: if request.auth != null &&
        (resource.data.sellerId == request.auth.uid || isAdmin());
    }

    // Moderation queue - admin only
    match /moderation_queue/{item} {
      allow read, write: if isAdmin();
    }

    // Support tickets
    match /support_tickets/{ticket} {
      allow read: if request.auth != null &&
        (resource.data.userId == request.auth.uid || isAdmin());
      allow create: if request.auth != null;
      allow update: if isAdmin();
    }

    // User profiles
    match /users/{userId} {
      allow read: if request.auth != null &&
        (request.auth.uid == userId || isAdmin());
      allow write: if request.auth != null &&
        request.auth.uid == userId;

      // Consultations subcollection
      match /consultations/{consultation} {
        allow read, write: if request.auth != null &&
          request.auth.uid == userId;
      }

      // Collection subcollection
      match /collection/{item} {
        allow read, write: if request.auth != null &&
          request.auth.uid == userId;
      }

      // Dreams/journal subcollection
      match /dreams/{entry} {
        allow read, write: if request.auth != null &&
          request.auth.uid == userId;
      }
    }
  }
}
```

4. Click **"Publish"**

---

## Part 4: Create Admin User (3 minutes)

### Make Yourself an Admin

**🔗 Go to:** https://console.firebase.google.com/project/crystal-grimoire-2025/firestore/data

1. Click **"Start collection"**
2. Collection ID: `admins`
3. Document ID: **YOUR FIREBASE USER ID**

   To find your User ID:
   - Go to: https://console.firebase.google.com/project/crystal-grimoire-2025/authentication/users
   - Find your email, copy the UID column

4. Add fields:
   ```
   role: "admin" (string)
   email: "your-email@example.com" (string)
   permissions: ["all"] (array)
   createdAt: [Click "Add field" → Type: timestamp → Click "Set to current time"]
   ```

5. Click **"Save"**

---

## Part 5: Deploy Cloud Functions (5 minutes)

### Deploy All New Functions

Run this command in your terminal:

```bash
cd /mnt/c/Users/millz/crystal-grimoire-fresh-DEPLOY

# Deploy all new functions at once
FUNCTIONS_DISCOVERY_TIMEOUT=60000 firebase deploy --only functions:createCheckoutSession,functions:handleStripeWebhook,functions:moderateListing,functions:createSupportTicket,functions:getUserTickets --project crystal-grimoire-2025
```

**Expected output:**
```
✔  functions[createCheckoutSession(us-central1)] Successful create operation.
✔  functions[handleStripeWebhook(us-central1)] Successful create operation.
✔  functions[moderateListing(us-central1)] Successful create operation.
✔  functions[createSupportTicket(us-central1)] Successful create operation.
✔  functions[getUserTickets(us-central1)] Successful create operation.
```

---

## Part 6: Testing (10 minutes)

### Test Stripe Integration

**🔗 Go to:** https://crystal-grimoire-2025.web.app

1. **Create a test user account** (if you haven't)
2. **Verify your email** (check inbox/spam)
3. Go to your profile/settings
4. Click **"Upgrade to Premium"**
5. Use Stripe test card: `4242 4242 4242 4242`
   - Expiry: Any future date
   - CVC: Any 3 digits
   - ZIP: Any 5 digits

6. Complete checkout
7. **Check your Firestore** - your user document should now have:
   ```
   tier: "premium"
   subscriptionStatus: "active"
   stripeCustomerId: "cus_..."
   ```

### Test Marketplace Moderation

1. Go to Marketplace
2. Try to create a listing with prohibited words:
   - Title: `Fake crystal scam`
   - The listing should be auto-suspended

3. **Check Firestore** - `moderation_queue` collection should have new entry

### Test Support Tickets

1. Create a support ticket
2. **Check Firestore** - `support_tickets` collection should have new entry
3. As admin, you should be able to see all tickets

---

## Part 7: Going Live (When Ready)

### Switch to Production Mode

1. **Stripe**: Toggle to **LIVE MODE** in dashboard
2. Get **LIVE** API keys: https://dashboard.stripe.com/apikeys
3. Create **LIVE** products (same as test)
4. Set up **LIVE** webhook (same URL)
5. **Update Firebase secrets with LIVE keys**:
   ```bash
   firebase functions:secrets:set STRIPE_SECRET_KEY --project crystal-grimoire-2025
   # Enter LIVE key (starts with sk_live_)

   firebase functions:secrets:set STRIPE_WEBHOOK_SECRET --project crystal-grimoire-2025
   # Enter LIVE webhook secret
   ```

6. **Re-deploy functions**:
   ```bash
   firebase deploy --only functions --project crystal-grimoire-2025
   ```

---

## 📞 Troubleshooting

### "Email must be verified" error
- User needs to check email and click verification link
- Resend verification from Firebase Console

### Stripe webhook not receiving events
- Verify webhook URL is correct
- Check webhook signing secret matches
- Look at Stripe Dashboard → Webhooks → Events tab

### Functions deployment fails
- Check you've set ALL required secrets
- Run: `firebase functions:secrets:access STRIPE_SECRET_KEY` to verify
- Check logs: `firebase functions:log --project crystal-grimoire-2025`

### Admin access denied
- Verify your UID is in `/admins` collection
- Check `role` field is exactly `"admin"`

---

## ✅ Verification Checklist

- [ ] Stripe test account created
- [ ] 3 products created (Premium, Pro, Founders)
- [ ] Webhook endpoint configured
- [ ] All 5 Firebase secrets set
- [ ] Firestore security rules updated
- [ ] Admin user created
- [ ] Functions deployed successfully
- [ ] Test payment completed
- [ ] Marketplace moderation tested
- [ ] Support ticket created

---

## 🎉 You're Done!

Your Crystal Grimoire app now has:
- ✅ Full payment processing
- ✅ Email verification security
- ✅ Marketplace content moderation
- ✅ Support ticket system
- ✅ Admin access control
- ✅ Cost monitoring

**Next**: Build the admin dashboard UI to manage everything!

---

**Need Help?** Check the logs:
```bash
# Cloud Functions logs
firebase functions:log --project crystal-grimoire-2025

# Stripe webhook events
https://dashboard.stripe.com/test/webhooks
```
