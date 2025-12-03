# Crystal Grimoire Production Readiness Checklist

## ✅ Implemented Features (Phase 1)

### 🔮 AI Services
- [x] **Crystal Healing Guru** - Gemini-powered mystical consultant
  - Cost-optimized (temp 0.9, max 800 tokens, 10 crystal limit)
  - Daily limits by tier (Free: 1, Premium: 5, Pro: 20, Founders: unlimited)
  - Optional birth date for horoscope context
  - Universal FAB access from all screens
  - Save consultations to journal
- [x] **Cost Monitoring** - Track actual AI API spending
  - Function: `getGuruCostStats`
  - Returns 30-day usage, token counts, estimated costs
  - Breakdown by tier

### 💳 Payment System (Stripe)
- [x] **Checkout Integration**
  - Function: `createCheckoutSession`
  - Email verification required
  - Rate-limited (3 per hour)
  - Creates/links Stripe customers
- [x] **Webhook Handler**
  - Handles subscription lifecycle events
  - Auto-updates user tiers
  - Creates support tickets for payment failures
  - Manages cancellations
- [x] **Subscription Tiers**
  - Free: Basic features, 1 Guru consultation/day
  - Premium: $9.99/month, 5 consultations/day
  - Pro: $29.99/month, 20 consultations/day
  - Founders: $199/year, unlimited

### 🔐 Security & Middleware
- [x] **Email Verification**
  - Middleware function: `requireVerifiedEmail()`
  - Enforced on: payments, marketplace listings, Guru consultations
- [x] **Admin Access Control**
  - Middleware function: `requireAdmin()`
  - Checks `/admins/{uid}` collection
- [x] **Rate Limiting**
  - Function: `checkRateLimit()`
  - Per-user, per-feature limits
  - Prevents abuse and DDoS

### 🛡️ Marketplace Safety
- [x] **Content Moderation**
  - Function: `moderateListing`
  - Prohibited keyword detection
  - Price anomaly detection
  - Spam/excessive listing detection
  - Auto-suspension for prohibited content
  - Creates moderation queue for review

### 📞 Support System
- [x] **Ticket Creation**
  - Function: `createSupportTicket`
  - Categories: technical, payment, account, feature, bug
  - Priorities: low, medium, high, urgent
  - Rate-limited (5 per hour)
- [x] **Ticket Retrieval**
  - Function: `getUserTickets`
  - Returns user's last 20 tickets
  - Real-time status updates

### 📱 UI Enhancements
- [x] **Coming Soon Cards** - Placeholder for 6 future AI guides
  - Moon Ritual Expert
  - Sound Healing Expert
  - Crystal Sales Assistant
  - Divination Guide
  - Meditation Coach
  - Mandala Generator

## 🔧 Required Setup Steps

### 1. Firebase Secrets Configuration
```bash
# Set Stripe secrets
firebase functions:secrets:set STRIPE_SECRET_KEY
firebase functions:secrets:set STRIPE_WEBHOOK_SECRET

# Set Stripe price IDs (from Stripe Dashboard)
firebase functions:secrets:set STRIPE_PRICE_PREMIUM
firebase functions:secrets:set STRIPE_PRICE_PRO
firebase functions:secrets:set STRIPE_PRICE_FOUNDERS

# Gemini API key (already set)
firebase functions:secrets:access GEMINI_API_KEY
```

### 2. Stripe Dashboard Setup
1. Create products and pricing:
   - **Premium**: $9.99/month recurring
   - **Pro**: $29.99/month recurring
   - **Founders**: $199/year recurring

2. Get price IDs (format: `price_xxx...`)

3. Configure webhook endpoint:
   - URL: `https://us-central1-crystal-grimoire-2025.cloudfunctions.net/handleStripeWebhook`
   - Events to listen for:
     - `checkout.session.completed`
     - `invoice.payment_succeeded`
     - `invoice.payment_failed`
     - `customer.subscription.deleted`

4. Get webhook signing secret

### 3. Firestore Security Rules
Add to `firestore.rules`:
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Admin collection - admin-only access
    match /admins/{adminId} {
      allow read, write: if request.auth != null &&
        get(/databases/$(database)/documents/admins/$(request.auth.uid)).data.role == 'admin';
    }

    // Marketplace - email verification required to create
    match /marketplace/{listing} {
      allow read: if true;
      allow create: if request.auth != null &&
        request.auth.token.email_verified == true;
      allow update, delete: if request.auth != null &&
        resource.data.sellerId == request.auth.uid;
    }

    // Moderation queue - admin only
    match /moderation_queue/{item} {
      allow read, write: if request.auth != null &&
        get(/databases/$(database)/documents/admins/$(request.auth.uid)).data.role == 'admin';
    }

    // Support tickets - users can read own tickets
    match /support_tickets/{ticket} {
      allow read: if request.auth != null &&
        (resource.data.userId == request.auth.uid ||
         get(/databases/$(database)/documents/admins/$(request.auth.uid)).data.role == 'admin');
      allow create: if request.auth != null;
      allow update: if request.auth != null &&
        get(/databases/$(database)/documents/admins/$(request.auth.uid)).data.role == 'admin';
    }

    // Users - own profile access
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;

      // Consultations subcollection
      match /consultations/{consultation} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }
    }
  }
}
```

### 4. Create Admin User
```javascript
// Run this in Firebase Console or via Admin SDK
await db.collection('admins').doc('YOUR_UID_HERE').set({
  role: 'admin',
  email: 'paul@clearseassolutions.com',
  createdAt: FieldValue.serverTimestamp(),
  permissions: ['all']
});
```

### 5. Deploy All Functions
```bash
# Deploy new functions
firebase deploy --only functions:createCheckoutSession,functions:handleStripeWebhook,functions:moderateListing,functions:createSupportTicket,functions:getUserTickets

# Or deploy all at once
firebase deploy --only functions
```

## 📊 Cloud Functions Inventory

### Deployed Functions:
1. ✅ `identifyCrystal` - AI crystal identification
2. ✅ `consultCrystalGuru` - Mystical AI consultant
3. ✅ `getGuruCostStats` - Cost monitoring
4. ⏳ `createCheckoutSession` - Stripe checkout
5. ⏳ `handleStripeWebhook` - Stripe webhooks
6. ⏳ `moderateListing` - Marketplace moderation
7. ⏳ `createSupportTicket` - Support tickets
8. ⏳ `getUserTickets` - Retrieve tickets

## 🔔 Monitoring & Alerts

### Recommended Alerts:
- [ ] **Cost Alert** - Firebase Function to check daily spending > $50
- [ ] **Error Rate Alert** - Cloud Monitoring for > 5% error rate
- [ ] **Payment Failure** - Email notification on `invoice.payment_failed`
- [ ] **Moderation Queue** - Notify admins of flagged listings

### Monitoring Dashboards:
- [ ] **Cloud Functions Logs** - Firebase Console
- [ ] **Firestore Usage** - Firebase Console > Usage tab
- [ ] **Stripe Dashboard** - Revenue, subscriptions, failed payments
- [ ] **Cost Monitoring** - Call `getGuruCostStats` weekly

## 🧪 Testing Checklist

### Before Production:
- [ ] Test Stripe checkout flow (use test mode)
- [ ] Verify email verification enforcement
- [ ] Test marketplace moderation with prohibited keywords
- [ ] Create and view support tickets
- [ ] Test rate limiting (exceed limits)
- [ ] Test Guru consultation with/without birth date
- [ ] Verify tier-based limits work correctly
- [ ] Test subscription cancellation flow

### Test Cards (Stripe Test Mode):
- Success: `4242 4242 4242 4242`
- Declined: `4000 0000 0000 0002`
- Requires Auth: `4000 0025 0000 3155`

## 📱 Next Steps: Admin Dashboard UI

### Flutter Screen: `lib/screens/admin_dashboard_screen.dart`

**Tabs**:
1. **Overview** - Key metrics, cost monitoring
2. **Users** - User list, verification status
3. **Marketplace** - Moderation queue, flagged listings
4. **Support** - Ticket queue, response times
5. **Revenue** - Subscription breakdown, MRR, churn

**Required Packages**:
```yaml
dependencies:
  fl_chart: ^0.65.0  # For charts
  intl: ^0.18.0      # Already have
  cloud_functions: ^4.0.0  # Already have
  cloud_firestore: ^4.0.0  # Already have
```

**Implementation Priority**:
1. Create basic admin screen with tabs
2. Add real-time Firestore streams for tickets/moderation
3. Call `getGuruCostStats` for cost dashboard
4. Add charts for revenue trends
5. Implement ticket response system

## 🚀 Deployment Workflow

```bash
# 1. Set all Firebase secrets
firebase functions:secrets:set STRIPE_SECRET_KEY
# ... (set all secrets)

# 2. Deploy Firestore rules
firebase deploy --only firestore:rules

# 3. Deploy all Cloud Functions
firebase deploy --only functions

# 4. Build Flutter web app
flutter build web --release

# 5. Deploy to hosting
firebase deploy --only hosting

# 6. Verify deployment
# Test: https://crystal-grimoire-2025.web.app
```

## 💰 Cost Estimates

### Monthly Costs (at 1,000 users):
- **Gemini API**: ~$28.50 (1,120 consultations @ $0.0005 each)
- **Firestore**: ~$5-10 (reads/writes)
- **Cloud Functions**: ~$5 (invocations)
- **Firebase Hosting**: Free
- **Total**: ~$38.50-43.50/month

### Revenue Projections:
- 900 Free users: $0
- 70 Premium ($9.99): $699.30
- 25 Pro ($29.99): $749.75
- 5 Founders ($199/year): $82.92/month
- **Total MRR**: $1,531.97
- **Net Profit**: ~$1,488/month

## 🎯 Current Status

**✅ Backend Complete**: All Cloud Functions implemented
**⏳ Configuration Needed**: Stripe secrets, security rules
**⏳ UI Needed**: Admin dashboard screen
**⏳ Testing Needed**: End-to-end workflow validation

---

**Last Updated**: 2025-01-19
**Next Action**: Set Firebase secrets and deploy new functions
