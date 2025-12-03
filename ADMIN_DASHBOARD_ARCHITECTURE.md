# Crystal Grimoire Admin Dashboard Architecture

## 🎯 Purpose
Comprehensive internal dashboard for monitoring operations, security, payments, and user support.

## 📊 Dashboard Sections

### 1. **Operations Overview**
- **Real-time Metrics**
  - Active users (last 24h)
  - Total registered users
  - Guru consultations today/month
  - Marketplace listings (active/pending)
  - Revenue today/month

- **Cost Monitoring**
  - Gemini API costs (daily/monthly)
  - Firebase costs (Firestore reads/writes, Functions invocations)
  - Storage costs
  - Alert if costs exceed threshold

### 2. **Security & Auth**
- **User Verification Status**
  - Unverified email addresses
  - Recently registered users
  - Suspicious activity flags

- **Auth Monitoring**
  - Failed login attempts
  - Account lockouts
  - Password reset requests
  - Multi-device logins

- **Rate Limiting**
  - API request rates per user
  - Blocked IPs
  - DDoS detection

### 3. **Payment & Subscriptions** (Stripe)
- **Revenue Dashboard**
  - Total revenue (daily/monthly/all-time)
  - Subscription breakdown (Free/Premium/Pro/Founders)
  - Churn rate
  - MRR (Monthly Recurring Revenue)

- **Payment Issues**
  - Failed payments
  - Disputed charges
  - Refund requests

- **Subscription Management**
  - Tier distribution
  - Upgrade/downgrade trends
  - Trial conversions

### 4. **Marketplace Moderation**
- **Content Safety**
  - Flagged listings (automated + user reports)
  - Listings pending review
  - Banned sellers

- **Safety Checks**
  - Prohibited keywords detection
  - Price anomalies (too high/low)
  - Duplicate/spam listings
  - Fake/stock images

- **Seller Verification**
  - Verification requests
  - Seller ratings
  - Transaction disputes

### 5. **Support Tickets**
- **Ticket Queue**
  - Open tickets (priority sorted)
  - Assigned tickets
  - Resolved tickets

- **Categories**
  - Technical issues
  - Payment problems
  - Account questions
  - Feature requests
  - Bug reports

- **Response Metrics**
  - Average response time
  - Resolution time
  - Customer satisfaction

### 6. **AI Service Monitoring**
- **Guru Consultations**
  - Usage by tier
  - Average tokens per consultation
  - Error rate
  - Response time

- **Crystal Identification**
  - Daily identifications
  - Accuracy metrics
  - Failed identifications

### 7. **System Health**
- **Infrastructure**
  - Cloud Functions status
  - Firestore health
  - Storage usage

- **Error Tracking**
  - Recent errors (grouped)
  - Crash reports
  - Performance issues

## 🔐 Security Implementation

### Firestore Security Rules
```javascript
// Admin-only access to sensitive collections
match /admin/{document=**} {
  allow read, write: if request.auth != null &&
    get(/databases/$(database)/documents/admins/$(request.auth.uid)).data.role == 'admin';
}

// User must verify email for certain operations
match /marketplace/{listing} {
  allow create: if request.auth != null &&
    request.auth.token.email_verified == true;
}
```

### Cloud Functions Middleware
```javascript
// Email verification check
async function requireVerifiedEmail(auth) {
  if (!auth) throw new HttpsError('unauthenticated', 'Must be signed in');

  const user = await admin.auth().getUser(auth.uid);
  if (!user.emailVerified) {
    throw new HttpsError('failed-precondition', 'Email must be verified');
  }
}

// Admin check
async function requireAdmin(auth) {
  if (!auth) throw new HttpsError('unauthenticated', 'Must be signed in');

  const adminDoc = await db.collection('admins').doc(auth.uid).get();
  if (!adminDoc.exists || adminDoc.data().role !== 'admin') {
    throw new HttpsError('permission-denied', 'Admin access required');
  }
}

// Rate limiting
const rateLimiter = new Map(); // uid -> { count, resetTime }
function checkRateLimit(uid, maxRequests = 10, windowMs = 60000) {
  const now = Date.now();
  const userLimit = rateLimiter.get(uid);

  if (!userLimit || now > userLimit.resetTime) {
    rateLimiter.set(uid, { count: 1, resetTime: now + windowMs });
    return true;
  }

  if (userLimit.count >= maxRequests) {
    throw new HttpsError('resource-exhausted', 'Rate limit exceeded');
  }

  userLimit.count++;
  return true;
}
```

## 💳 Stripe Integration

### Payment Flow
1. **User clicks upgrade**
2. **Create Stripe Checkout Session** (Cloud Function)
3. **Redirect to Stripe Checkout**
4. **Webhook receives payment confirmation**
5. **Update user tier in Firestore**
6. **Send confirmation email**

### Subscription Tiers
```javascript
const STRIPE_PRICES = {
  premium: 'price_xxx', // $9.99/month
  pro: 'price_yyy',     // $29.99/month
  founders: 'price_zzz' // $199/year
};
```

### Webhook Events
- `checkout.session.completed` - New subscription
- `invoice.payment_succeeded` - Recurring payment
- `invoice.payment_failed` - Payment issue
- `customer.subscription.deleted` - Cancellation

## 🛡️ Marketplace Safety

### Automated Content Moderation
```javascript
const PROHIBITED_KEYWORDS = [
  'drug', 'illegal', 'scam', 'fake', 'counterfeit',
  'replica', 'knock-off', 'weapons', 'dangerous'
];

const SUSPICIOUS_PATTERNS = {
  priceAnomaly: (price) => price < 1 || price > 10000,
  duplicateContent: (title, description) => /* check against existing */,
  stockPhotos: (imageUrl) => /* reverse image search */,
  excessiveListings: (sellerId) => /* > 20 listings in 24h */
};

async function moderateListing(listing) {
  const flags = [];

  // Check prohibited keywords
  const text = `${listing.title} ${listing.description}`.toLowerCase();
  for (const keyword of PROHIBITED_KEYWORDS) {
    if (text.includes(keyword)) {
      flags.push(`prohibited_keyword: ${keyword}`);
    }
  }

  // Check price anomalies
  if (SUSPICIOUS_PATTERNS.priceAnomaly(listing.price)) {
    flags.push('price_anomaly');
  }

  // Auto-flag for review if suspicious
  if (flags.length > 0) {
    await db.collection('moderation_queue').add({
      listingId: listing.id,
      flags,
      status: 'pending_review',
      createdAt: FieldValue.serverTimestamp()
    });
  }

  return flags;
}
```

## 📞 Support System

### Ticket Structure
```javascript
{
  ticketId: 'TKT-20250119-0001',
  userId: 'user123',
  email: 'user@example.com',
  category: 'technical', // technical|payment|account|feature|bug
  priority: 'medium', // low|medium|high|urgent
  status: 'open', // open|assigned|resolved|closed
  subject: 'Cannot upload crystal image',
  description: 'Detailed description...',
  attachments: ['url1', 'url2'],
  assignedTo: 'admin456',
  responses: [
    {
      from: 'admin456',
      message: 'Thank you for reporting...',
      timestamp: Timestamp
    }
  ],
  createdAt: Timestamp,
  updatedAt: Timestamp,
  resolvedAt: Timestamp
}
```

## 🔔 Alert System

### Alert Triggers
- Cost exceeds $50/day
- Error rate > 5%
- Marketplace listing flagged
- Payment failure spike
- Unusual traffic pattern
- System downtime

### Alert Channels
- Email to admin
- Firebase Cloud Messaging
- Slack webhook (optional)
- Dashboard notification banner

## 📱 Admin Dashboard UI

### Flutter Screen: `admin_dashboard_screen.dart`
- Tab-based navigation
- Real-time data streams
- Charts (fl_chart package)
- Export to CSV functionality
- Search/filter capabilities

### Access Control
- Admin users stored in `/admins/{uid}` collection
- Role-based permissions (admin, moderator, support)
- Audit log for all admin actions

## 🚀 Implementation Priority

### Phase 1 - Foundation (This Sprint)
1. ✅ Cost monitoring function
2. 🔄 Email verification middleware
3. 🔄 Basic admin dashboard screen
4. 🔄 Stripe checkout integration

### Phase 2 - Safety & Support
5. Marketplace content moderation
6. Support ticket system
7. User reporting functionality

### Phase 3 - Advanced
8. Advanced analytics
9. Automated alerts
10. Export/reporting tools

---

**Created**: 2025-01-19
**Status**: Architecture Design Complete
**Next**: Implement Phase 1 functions
