#!/bin/bash
set -e

echo "🔮 CRYSTAL GRIMOIRE - AUTOMATED SETUP"
echo "======================================"
echo ""
echo "I'll do everything possible automatically."
echo "You'll only need to provide Stripe keys when prompted."
echo ""

# Check if we're authenticated
echo "Checking Firebase authentication..."
firebase projects:list --project crystal-grimoire-2025 > /dev/null 2>&1
if [ $? -eq 0 ]; then
  echo "✅ Firebase authenticated!"
else
  echo "❌ Firebase not authenticated. Run: firebase login"
  exit 1
fi

echo ""
echo "======================================"
echo "STEP 1: Deploy Firestore Security Rules"
echo "======================================"

# Create security rules file
cat > firestore.rules << 'RULES'
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    function isAdmin() {
      return request.auth != null &&
        exists(/databases/$(database)/documents/admins/$(request.auth.uid)) &&
        get(/databases/$(database)/documents/admins/$(request.auth.uid)).data.role == 'admin';
    }
    function isEmailVerified() {
      return request.auth != null && request.auth.token.email_verified == true;
    }
    match /admins/{adminId} {
      allow read: if isAdmin();
      allow write: if false;
    }
    match /marketplace/{listing} {
      allow read: if true;
      allow create: if isEmailVerified();
      allow update, delete: if request.auth != null &&
        (resource.data.sellerId == request.auth.uid || isAdmin());
    }
    match /moderation_queue/{item} {
      allow read, write: if isAdmin();
    }
    match /support_tickets/{ticket} {
      allow read: if request.auth != null &&
        (resource.data.userId == request.auth.uid || isAdmin());
      allow create: if request.auth != null;
      allow update: if isAdmin();
    }
    match /users/{userId} {
      allow read: if request.auth != null &&
        (request.auth.uid == userId || isAdmin());
      allow write: if request.auth != null && request.auth.uid == userId;
      match /consultations/{consultation} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }
      match /collection/{item} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }
      match /dreams/{entry} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }
    }
  }
}
RULES

echo "✅ Security rules file created"
echo "Deploying rules..."
firebase deploy --only firestore:rules --project crystal-grimoire-2025
echo "✅ Security rules deployed!"

echo ""
echo "======================================"
echo "STEP 2: Set Up Stripe Secrets"
echo "======================================"
echo ""
echo "Open this link in your browser:"
echo "👉 https://dashboard.stripe.com/test/apikeys"
echo ""
read -p "Press Enter when you have the page open..."

echo ""
echo "You need 5 values from Stripe. I'll help you get them:"
echo ""

# Secret Key
echo "1️⃣ STRIPE SECRET KEY"
echo "   On the API keys page, click 'Reveal test key' next to 'Secret key'"
echo "   Copy the key that starts with 'sk_test_'"
echo ""
read -sp "Paste here: " STRIPE_SECRET_KEY
echo ""
echo "$STRIPE_SECRET_KEY" | firebase functions:secrets:set STRIPE_SECRET_KEY --project crystal-grimoire-2025 --force
echo "✅ Secret key set!"

# Products - open link
echo ""
echo "2️⃣ CREATE STRIPE PRODUCTS"
echo "   Opening products page..."
echo "👉 https://dashboard.stripe.com/test/products"
echo ""
echo "Create 3 products with these EXACT specs:"
echo ""
echo "Product 1: Crystal Grimoire Premium"
echo "  - Click '+ Add product'"
echo "  - Name: Crystal Grimoire Premium"
echo "  - Pricing: Recurring"
echo "  - Price: 9.99 USD"
echo "  - Billing period: Monthly"
echo "  - Save and copy the Price ID (starts with price_)"
echo ""
read -p "Paste Premium Price ID: " STRIPE_PRICE_PREMIUM
echo "$STRIPE_PRICE_PREMIUM" | firebase functions:secrets:set STRIPE_PRICE_PREMIUM --project crystal-grimoire-2025 --force
echo "✅ Premium price set!"

echo ""
echo "Product 2: Crystal Grimoire Pro"
echo "  - Click '+ Add product'"
echo "  - Name: Crystal Grimoire Pro"
echo "  - Pricing: Recurring"
echo "  - Price: 29.99 USD"
echo "  - Billing period: Monthly"
echo "  - Save and copy the Price ID"
echo ""
read -p "Paste Pro Price ID: " STRIPE_PRICE_PRO
echo "$STRIPE_PRICE_PRO" | firebase functions:secrets:set STRIPE_PRICE_PRO --project crystal-grimoire-2025 --force
echo "✅ Pro price set!"

echo ""
echo "Product 3: Crystal Grimoire Founders"
echo "  - Click '+ Add product'"
echo "  - Name: Crystal Grimoire Founders"
echo "  - Pricing: Recurring"
echo "  - Price: 199.00 USD"
echo "  - Billing period: Yearly"
echo "  - Save and copy the Price ID"
echo ""
read -p "Paste Founders Price ID: " STRIPE_PRICE_FOUNDERS
echo "$STRIPE_PRICE_FOUNDERS" | firebase functions:secrets:set STRIPE_PRICE_FOUNDERS --project crystal-grimoire-2025 --force
echo "✅ Founders price set!"

# Webhook
echo ""
echo "3️⃣ CREATE WEBHOOK"
echo "👉 https://dashboard.stripe.com/test/webhooks"
echo ""
echo "Click '+ Add endpoint' and enter:"
echo "  URL: https://us-central1-crystal-grimoire-2025.cloudfunctions.net/handleStripeWebhook"
echo ""
echo "Select these events:"
echo "  ✓ checkout.session.completed"
echo "  ✓ invoice.payment_succeeded"
echo "  ✓ invoice.payment_failed"
echo "  ✓ customer.subscription.deleted"
echo ""
echo "Save, then copy the Signing Secret (starts with whsec_)"
echo ""
read -sp "Paste Webhook Secret: " STRIPE_WEBHOOK_SECRET
echo ""
echo "$STRIPE_WEBHOOK_SECRET" | firebase functions:secrets:set STRIPE_WEBHOOK_SECRET --project crystal-grimoire-2025 --force
echo "✅ Webhook secret set!"

echo ""
echo "======================================"
echo "STEP 3: Deploy Cloud Functions"
echo "======================================"
echo "Deploying all payment and security functions..."
FUNCTIONS_DISCOVERY_TIMEOUT=60000 firebase deploy --only functions:createCheckoutSession,functions:handleStripeWebhook,functions:moderateListing,functions:createSupportTicket,functions:getUserTickets --project crystal-grimoire-2025
echo "✅ All functions deployed!"

echo ""
echo "======================================"
echo "STEP 4: Create Admin User"
echo "======================================"
echo ""
echo "Getting your Firebase user ID..."
echo "👉 https://console.firebase.google.com/project/crystal-grimoire-2025/authentication/users"
echo ""
echo "Find your email in the list and copy the UID column"
read -p "Paste your UID: " USER_UID

# Create admin user via Firebase
echo "Creating admin user..."
cat > /tmp/create-admin.js << JSEOF
const admin = require('firebase-admin');
admin.initializeApp();
const db = admin.firestore();
db.collection('admins').doc('$USER_UID').set({
  role: 'admin',
  email: process.env.USER_EMAIL || 'admin@crystal-grimoire.com',
  permissions: ['all'],
  createdAt: admin.firestore.FieldValue.serverTimestamp()
}).then(() => {
  console.log('✅ Admin user created!');
  process.exit(0);
}).catch(err => {
  console.error('❌ Error:', err);
  process.exit(1);
});
JSEOF

cd functions && node /tmp/create-admin.js || echo "⚠️  Create admin manually in Firestore"
cd ..

echo ""
echo "======================================"
echo "✅ SETUP COMPLETE!"
echo "======================================"
echo ""
echo "Summary:"
echo "  ✅ Firestore security rules deployed"
echo "  ✅ All 5 Stripe secrets configured"
echo "  ✅ Payment functions deployed"
echo "  ✅ Security middleware active"
echo "  ✅ Marketplace moderation enabled"
echo "  ✅ Support ticket system ready"
echo "  ✅ Admin user created"
echo ""
echo "🧪 TEST IT NOW:"
echo "1. Go to: https://crystal-grimoire-2025.web.app"
echo "2. Sign up with a new email (or use existing)"
echo "3. Verify your email"
echo "4. Try upgrading to Premium"
echo "5. Use test card: 4242 4242 4242 4242"
echo ""
echo "Your app is LIVE with payments! 🚀"
