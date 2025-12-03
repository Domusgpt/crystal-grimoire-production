# 🚀 Quick Start - Setup in 30 Minutes

## Option 1: Automated Script (Easiest)

```bash
cd /mnt/c/Users/millz/crystal-grimoire-fresh-DEPLOY
bash setup-stripe-secrets.sh
```

The script will guide you through all 5 secrets interactively!

---

## Option 2: Manual Links

### 📋 Links You Need Open:

1. **Stripe API Keys**: https://dashboard.stripe.com/test/apikeys
2. **Stripe Products**: https://dashboard.stripe.com/test/products
3. **Stripe Webhooks**: https://dashboard.stripe.com/test/webhooks
4. **Firebase Console**: https://console.firebase.google.com/project/crystal-grimoire-2025
5. **Firebase Auth Users**: https://console.firebase.google.com/project/crystal-grimoire-2025/authentication/users
6. **Firestore Rules**: https://console.firebase.google.com/project/crystal-grimoire-2025/firestore/rules

---

## ✅ 30-Minute Checklist

### Part 1: Stripe (15 min)
- [ ] **1.1** Sign in to Stripe: https://dashboard.stripe.com/login
- [ ] **1.2** Copy Secret Key (sk_test_...) from API keys page
- [ ] **1.3** Create 3 products:
  - Premium: $9.99/month → copy price ID
  - Pro: $29.99/month → copy price ID
  - Founders: $199/year → copy price ID
- [ ] **1.4** Create webhook:
  - URL: `https://us-central1-crystal-grimoire-2025.cloudfunctions.net/handleStripeWebhook`
  - Events: checkout.session.completed, invoice.payment_succeeded, invoice.payment_failed, customer.subscription.deleted
  - Copy webhook secret (whsec_...)

### Part 2: Firebase Secrets (5 min)
Run the automated script OR set manually:

```bash
firebase functions:secrets:set STRIPE_SECRET_KEY
firebase functions:secrets:set STRIPE_WEBHOOK_SECRET
firebase functions:secrets:set STRIPE_PRICE_PREMIUM
firebase functions:secrets:set STRIPE_PRICE_PRO
firebase functions:secrets:set STRIPE_PRICE_FOUNDERS
```

### Part 3: Security Rules (2 min)
- [ ] Go to: https://console.firebase.google.com/project/crystal-grimoire-2025/firestore/rules
- [ ] Copy rules from `SETUP_GUIDE.md` (Part 3)
- [ ] Click "Publish"

### Part 4: Make Yourself Admin (3 min)
- [ ] Go to: https://console.firebase.google.com/project/crystal-grimoire-2025/authentication/users
- [ ] Copy your UID
- [ ] Go to Firestore: https://console.firebase.google.com/project/crystal-grimoire-2025/firestore/data
- [ ] Create collection `admins` → document with YOUR_UID
- [ ] Add fields:
  ```
  role: "admin"
  email: "your-email@example.com"
  permissions: ["all"]
  createdAt: [timestamp - current time]
  ```

### Part 5: Deploy (5 min)
```bash
cd /mnt/c/Users/millz/crystal-grimoire-fresh-DEPLOY

FUNCTIONS_DISCOVERY_TIMEOUT=60000 firebase deploy --only functions:createCheckoutSession,functions:handleStripeWebhook,functions:moderateListing,functions:createSupportTicket,functions:getUserTickets --project crystal-grimoire-2025
```

---

## 🧪 Test It Works

### Test Payment
1. Go to: https://crystal-grimoire-2025.web.app
2. Sign up and verify email
3. Try to upgrade to Premium
4. Use test card: `4242 4242 4242 4242`
5. Check your tier updated in Firestore

### Test Moderation
1. Go to Marketplace
2. Create listing with word "scam" in title
3. Should be auto-suspended
4. Check `moderation_queue` collection in Firestore

### Test Support
1. Create a support ticket
2. Check `support_tickets` collection in Firestore

---

## 📞 Need Help?

**Check logs:**
```bash
firebase functions:log --project crystal-grimoire-2025 --limit 50
```

**Check Stripe events:**
https://dashboard.stripe.com/test/events

**Full guide:** See `SETUP_GUIDE.md`

---

## 🎯 What You Get

After setup, your app has:
- ✅ Stripe payments (3 subscription tiers)
- ✅ Email verification enforcement
- ✅ Marketplace content moderation
- ✅ Support ticket system
- ✅ Admin access control
- ✅ Rate limiting
- ✅ Cost monitoring

**Monthly profit estimate**: ~$1,488 at 1,000 users!
