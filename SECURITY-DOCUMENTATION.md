# 🔒 Crystal Grimoire - Security Documentation

**Project:** crystal-grimoire-2025
**Date:** November 24, 2025
**Security Standard:** Firebase Best Practices + Industry Standards

---

## 🔐 Firebase Secrets Management

### What are Firebase Secrets?

Firebase Secrets Manager (powered by Google Secret Manager) provides secure storage and access control for sensitive data like API keys, passwords, and tokens. Secrets are:

- **Encrypted at rest** using Google-managed encryption keys
- **Encrypted in transit** using TLS 1.2+
- **Versioned** - each update creates a new version
- **Access-controlled** via IAM permissions
- **Audited** - all access logged in Cloud Audit Logs

### Secrets Configured for Crystal Grimoire

| Secret Name | Purpose | Type | Access Pattern |
|-------------|---------|------|----------------|
| `GEMINI_API_KEY` | Google AI Gemini API authentication | API Key | Functions only |
| `STRIPE_SECRET_KEY` | Stripe API authentication | API Key | Functions only |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signature verification | Secret | Functions only |
| `STRIPE_PRICE_PREMIUM` | Premium subscription price ID | Price ID | Functions only |
| `STRIPE_PRICE_PRO` | Pro subscription price ID | Price ID | Functions only |
| `STRIPE_PRICE_FOUNDERS` | Founders subscription price ID | Price ID | Functions only |

---

## 🛡️ Security Best Practices Implemented

### 1. Secret Storage

✅ **Firebase Secrets Manager** - Industry-standard secret storage
- Secrets stored in Google Secret Manager
- Automatic encryption (AES-256)
- Key rotation support
- Regional isolation available

❌ **NOT USED:**
- Environment variables (insecure)
- Config files committed to git
- Hardcoded values
- Client-side storage

### 2. Access Control

✅ **Function-Only Access**
```javascript
import { defineSecret } from 'firebase-functions/params';

// Secret defined at function level
const GEMINI_API_KEY = defineSecret('GEMINI_API_KEY');

// Function must explicitly request access
export const consultCrystalGuru = onCall(
  { secrets: [GEMINI_API_KEY] },  // Explicit access request
  async (request) => {
    const apiKey = GEMINI_API_KEY.value();  // Access only within function
    // Use apiKey...
  }
);
```

✅ **Principle of Least Privilege**
- Each function declares only the secrets it needs
- No blanket access to all secrets
- Client code NEVER has access to secrets

✅ **IAM Permissions**
```
Project: crystal-grimoire-2025
Service Account: firebase-functions@crystal-grimoire-2025.iam.gserviceaccount.com
Permissions:
  - secretmanager.versions.access (on specific secrets only)
  - cloudfunctions.functions.invoke
```

### 3. Version Control

✅ **Git Safety**
```bash
# .gitignore includes:
.env
.env.*
**/secrets/
**/*.key
**/*.pem
firebase-debug.log
functions/.env
```

✅ **Secret Rotation Capability**
```bash
# Update secret (creates new version)
firebase functions:secrets:set STRIPE_SECRET_KEY --project crystal-grimoire-2025

# List versions
firebase functions:secrets:access STRIPE_SECRET_KEY --version latest

# Automatic versioning
# Version 1 → Version 2 → Version 3 (automatically managed)
```

### 4. Network Security

✅ **HTTPS Only**
- All Cloud Functions enforce HTTPS
- TLS 1.2+ required
- Certificate pinning available

✅ **Webhook Signature Verification**
```javascript
const stripe = require('stripe')(STRIPE_SECRET_KEY.value());

export const handleStripeWebhook = onRequest(async (req, res) => {
  const sig = req.headers['stripe-signature'];

  try {
    // Verify webhook signature before processing
    const event = stripe.webhooks.constructEvent(
      req.rawBody,
      sig,
      STRIPE_WEBHOOK_SECRET.value()
    );

    // Process only verified events...
  } catch (err) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }
});
```

✅ **CORS Configuration**
```json
{
  "hosting": {
    "headers": [
      {
        "source": "**",
        "headers": [
          {
            "key": "X-Content-Type-Options",
            "value": "nosniff"
          },
          {
            "key": "X-Frame-Options",
            "value": "SAMEORIGIN"
          },
          {
            "key": "X-XSS-Protection",
            "value": "1; mode=block"
          }
        ]
      }
    ]
  }
}
```

---

## 🔍 Firestore Security Rules

### User Data Protection

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // User-specific data isolation
    match /users/{userId} {
      // Users can only access their own data
      allow read, write: if request.auth != null && request.auth.uid == userId;

      // Admin override
      allow read: if isAdmin();

      // Subcollections inherit protection
      match /consultations/{consultationId} {
        allow read, write: if request.auth.uid == userId;
      }

      match /collection/{itemId} {
        allow read, write: if request.auth.uid == userId;
      }
    }

    // Admin-only collections
    match /admins/{adminId} {
      allow read: if isAdmin();
      allow write: if false;  // Admins must be created manually
    }

    // Marketplace moderation
    match /marketplace/{listingId} {
      allow read: if true;  // Public listings
      allow create: if isEmailVerified();  // Must verify email
      allow update, delete: if request.auth.uid == resource.data.sellerId || isAdmin();
    }
  }
}
```

### Security Functions

```javascript
function isAdmin() {
  return request.auth != null &&
    exists(/databases/$(database)/documents/admins/$(request.auth.uid)) &&
    get(/databases/$(database)/documents/admins/$(request.auth.uid)).data.role == 'admin';
}

function isEmailVerified() {
  return request.auth != null &&
    request.auth.token.email_verified == true;
}
```

---

## 🧪 Testing Security

### 1. Secret Access Test

```bash
# Verify secret is accessible to functions
firebase functions:secrets:access STRIPE_SECRET_KEY --project crystal-grimoire-2025

# Expected: Returns the secret value
# If fails: Check IAM permissions
```

### 2. Firestore Rules Test

```bash
# Run Firestore rules tests
firebase emulators:start --only firestore
# Run test suite against emulator

# Test cases:
# ✅ User can read own data
# ❌ User CANNOT read other user's data
# ✅ Admin can read all data
# ❌ Unauthenticated user CANNOT read user data
```

### 3. Webhook Security Test

```bash
# Test webhook with invalid signature
curl -X POST https://us-central1-crystal-grimoire-2025.cloudfunctions.net/handleStripeWebhook \
  -H "Content-Type: application/json" \
  -d '{"test": "data"}'

# Expected: 400 Bad Request (signature missing/invalid)
```

---

## 📊 Monitoring & Auditing

### 1. Secret Access Logs

```bash
# View secret access logs in Cloud Logging
gcloud logging read "resource.type=cloud_function \
  AND textPayload=~'secret'" \
  --project=crystal-grimoire-2025 \
  --limit=50
```

### 2. Function Invocation Logs

```bash
# Monitor function calls
firebase functions:log --project crystal-grimoire-2025

# Look for:
# - Failed authentication attempts
# - Webhook signature failures
# - Rate limit violations
# - Suspicious access patterns
```

### 3. Firestore Audit Trail

Enable in Firebase Console:
- **Authentication Events** → Track logins, signups, failures
- **Database Operations** → Track reads, writes, deletes
- **Admin Actions** → Track admin operations

---

## 🚨 Incident Response

### If a Secret is Compromised:

1. **Immediate Actions:**
   ```bash
   # Rotate the secret immediately
   firebase functions:secrets:set COMPROMISED_SECRET --project crystal-grimoire-2025

   # Redeploy functions to use new secret
   firebase deploy --only functions --project crystal-grimoire-2025
   ```

2. **For Stripe Keys:**
   - Go to https://dashboard.stripe.com/test/apikeys
   - Click "Roll secret key"
   - Update Firebase secret with new key
   - Redeploy functions

3. **For Gemini API Key:**
   - Go to Google AI Studio
   - Revoke compromised key
   - Create new key
   - Update Firebase secret
   - Redeploy functions

4. **Audit & Investigation:**
   ```bash
   # Check who accessed the secret
   gcloud logging read "resource.type=secret_manager \
     AND protoPayload.resourceName=~'COMPROMISED_SECRET'" \
     --project=crystal-grimoire-2025
   ```

---

## 📋 Security Checklist

### Pre-Production

- [x] All secrets stored in Firebase Secrets Manager
- [x] No secrets in git repository
- [x] Firestore security rules deployed
- [x] HTTPS-only functions
- [x] Webhook signature verification enabled
- [ ] Firebase App Check enabled (RECOMMENDED)
- [ ] Rate limiting configured
- [ ] DDoS protection configured
- [ ] Monitoring alerts set up

### Production

- [ ] Rotate all secrets to production keys
- [ ] Enable Cloud Armor (DDoS protection)
- [ ] Configure alerting for:
  - Failed authentication attempts
  - Suspicious access patterns
  - Secret access anomalies
  - Rate limit violations
- [ ] Set up security incident response plan
- [ ] Configure automated backups
- [ ] Enable audit logging for all services

---

## 🔑 Key Rotation Schedule

| Secret | Rotation Frequency | Last Rotated | Next Rotation |
|--------|-------------------|--------------|---------------|
| STRIPE_SECRET_KEY | 90 days | 2025-11-24 | 2026-02-22 |
| GEMINI_API_KEY | 90 days | 2025-11-24 | 2026-02-22 |
| STRIPE_WEBHOOK_SECRET | 90 days | Pending | TBD |

**Rotation Process:**
1. Generate new key in provider dashboard
2. Set new secret version in Firebase
3. Deploy functions with new secret
4. Verify functions work correctly
5. Revoke old key in provider dashboard

---

## 🌟 A Paul Phillips Manifestation

**Security Standard:** Enterprise-Grade
**Compliance:** Firebase Best Practices
**Encryption:** AES-256 at rest, TLS 1.2+ in transit
**Access Control:** IAM + Function-level permissions
**Monitoring:** Cloud Logging + Audit Trail

**Contact:** Paul@clearseassolutions.com
**© 2025 Paul Phillips - Clear Seas Solutions LLC**

---

## Additional Resources

- [Firebase Secrets Manager Docs](https://firebase.google.com/docs/functions/config-env)
- [Google Secret Manager Best Practices](https://cloud.google.com/secret-manager/docs/best-practices)
- [Firestore Security Rules Guide](https://firebase.google.com/docs/firestore/security/get-started)
- [Stripe Security Best Practices](https://stripe.com/docs/security/guide)
- [OWASP API Security Top 10](https://owasp.org/www-project-api-security/)
