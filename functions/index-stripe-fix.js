/**
 * 🔮 Crystal Grimoire Cloud Functions - Stripe Fix Edition
 */

const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { initializeApp } = require('firebase-admin/app');
const { getFirestore, FieldValue, Timestamp } = require('firebase-admin/firestore');
const { getAuth } = require('firebase-admin/auth');

// Initialize Firebase Admin
initializeApp();
const db = getFirestore();
const auth = getAuth();

// Use environment variables
const stripeConfig = {
  secret_key: process.env.STRIPE_SECRET_KEY || '',
  premium_price_id: process.env.STRIPE_PREMIUM_PRICE_ID || '',
  pro_price_id: process.env.STRIPE_PRO_PRICE_ID || '',
  founders_price_id: process.env.STRIPE_FOUNDERS_PRICE_ID || ''
};

let stripeClient = null;
function getStripeClient() {
  if (!stripeClient && stripeConfig.secret_key) {
    try {
      stripeClient = require('stripe')(stripeConfig.secret_key);
    } catch (error) {
      console.error('⚠️ Unable to initialise Stripe client:', error.message);
    }
  }
  return stripeClient;
}

function getStripe() {
  return getStripeClient();
}

const stripePriceMapping = new Map();
if (stripeConfig.premium_price_id) {
  stripePriceMapping.set(stripeConfig.premium_price_id, { tier: 'premium', mode: 'subscription' });
}
if (stripeConfig.pro_price_id) {
  stripePriceMapping.set(stripeConfig.pro_price_id, { tier: 'pro', mode: 'subscription' });
}
if (stripeConfig.founders_price_id) {
  stripePriceMapping.set(stripeConfig.founders_price_id, { tier: 'founders', mode: 'payment' });
}

const PLAN_DETAILS = {
  free: {
    plan: 'free',
    effectiveLimits: {
      identifyPerDay: 3,
      guidancePerDay: 1,
      journalMax: 50,
      collectionMax: 50,
    },
    flags: ['free'],
    lifetime: false,
  },
  premium: {
    plan: 'premium',
    effectiveLimits: {
      identifyPerDay: 15,
      guidancePerDay: 5,
      journalMax: 200,
      collectionMax: 250,
    },
    flags: ['stripe', 'priority_support'],
    lifetime: false,
  },
  pro: {
    plan: 'pro',
    effectiveLimits: {
      identifyPerDay: 40,
      guidancePerDay: 15,
      journalMax: 500,
      collectionMax: 1000,
    },
    flags: ['stripe', 'priority_support', 'advanced_ai'],
    lifetime: false,
  },
  founders: {
    plan: 'founders',
    effectiveLimits: {
      identifyPerDay: 999,
      guidancePerDay: 200,
      journalMax: 2000,
      collectionMax: 2000,
    },
    flags: ['stripe', 'lifetime', 'founder'],
    lifetime: true,
  },
};

const PLAN_ALIASES = {
  explorer: 'free',
  emissary: 'premium',
  ascended: 'pro',
  esper: 'founders',
};

function resolvePlanDetails(tier) {
  const normalized = (tier || 'free').toString().trim().toLowerCase();
  const key = PLAN_DETAILS[normalized] ? normalized : PLAN_ALIASES[normalized] || 'free';
  const details = PLAN_DETAILS[key] || PLAN_DETAILS.free;
  return {
    plan: details.plan,
    effectiveLimits: { ...details.effectiveLimits },
    flags: [...details.flags],
    lifetime: details.lifetime,
    tier: key,
  };
}

function ensureStripeConfigured() {
  if (!stripeClient) {
    // Try one more time to init
    getStripeClient();
    if (!stripeClient) {
        throw new HttpsError('failed-precondition', 'Stripe is not configured. Set stripe.secret_key and price IDs.');
    }
  }
}

function resolvePriceMetadata(priceId, requestedTier) {
  if (priceId && stripePriceMapping.has(priceId)) {
    return stripePriceMapping.get(priceId);
  }

  if (requestedTier) {
    const normalized = String(requestedTier).toLowerCase();
    if (['premium', 'pro', 'founders'].includes(normalized)) {
      return {
        tier: normalized,
        mode: normalized === 'founders' ? 'payment' : 'subscription',
      };
    }
  }

  return null;
}

exports.createStripeCheckoutSession = onCall(
  { cors: true, region: 'us-central1', enforceAppCheck: false },
  async (request) => {
    ensureStripeConfigured();

    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Authentication required to start checkout.');
    }

    const priceId = request.data?.priceId;
    const requestedTier = request.data?.tier;
    const successUrlInput = request.data?.successUrl;
    const cancelUrlInput = request.data?.cancelUrl;

    if (!priceId || typeof priceId !== 'string') {
      throw new HttpsError('invalid-argument', 'priceId is required.');
    }

    if (!successUrlInput || typeof successUrlInput !== 'string') {
      throw new HttpsError('invalid-argument', 'successUrl is required.');
    }

    if (!cancelUrlInput || typeof cancelUrlInput !== 'string') {
      throw new HttpsError('invalid-argument', 'cancelUrl is required.');
    }

    const priceMeta = resolvePriceMetadata(priceId, requestedTier);
    if (!priceMeta) {
      throw new HttpsError('invalid-argument', 'Unsupported price identifier.');
    }

    const successUrl = successUrlInput.includes('{CHECKOUT_SESSION_ID}')
      ? successUrlInput
      : `${successUrlInput}${successUrlInput.includes('?') ? '&' : '?'}session_id={CHECKOUT_SESSION_ID}`;

    const cancelUrl = cancelUrlInput.includes('cancelled=')
      ? cancelUrlInput
      : `${cancelUrlInput}${cancelUrlInput.includes('?') ? '&' : '?'}cancelled=true`;

    try {
      const stripe = getStripeClient();
      if (!stripe) {
        throw new HttpsError('failed-precondition', 'Stripe not configured');
      }
      const session = await stripe.checkout.sessions.create({
        mode: priceMeta.mode,
        client_reference_id: request.auth.uid,
        success_url: successUrl,
        cancel_url: cancelUrl,
        line_items: [
          {
            price: priceId,
            quantity: 1,
          },
        ],
        metadata: {
          uid: request.auth.uid,
          tier: priceMeta.tier,
          priceId,
        },
        subscription_data: priceMeta.mode === 'subscription'
          ? {
              metadata: {
                uid: request.auth.uid,
                tier: priceMeta.tier,
              },
            }
          : undefined,
      });

      await db.collection('checkoutSessions').doc(session.id).set({
        uid: request.auth.uid,
        tier: priceMeta.tier,
        priceId,
        mode: priceMeta.mode,
        status: session.status,
        createdAt: FieldValue.serverTimestamp(),
        successUrl,
        cancelUrl,
      }, { merge: true });

      return {
        sessionId: session.id,
        checkoutUrl: session.url,
        expiresAt: session.expires_at ? new Date(session.expires_at * 1000).toISOString() : null,
      };
    } catch (error) {
      console.error('❌ Stripe checkout error:', error);
      throw new HttpsError('internal', error.message || 'Failed to start checkout session.');
    }
  }
);

exports.finalizeStripeCheckoutSession = onCall(
  { cors: true, region: 'us-central1', enforceAppCheck: false },
  async (request) => {
    ensureStripeConfigured();

    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Authentication required to verify checkout.');
    }

    const sessionId = request.data?.sessionId;
    if (!sessionId || typeof sessionId !== 'string') {
      throw new HttpsError('invalid-argument', 'sessionId is required.');
    }

    const checkoutRef = db.collection('checkoutSessions').doc(sessionId);
    const checkoutSnap = await checkoutRef.get();

    if (checkoutSnap.exists) {
      const checkoutData = checkoutSnap.data();
      if (checkoutData.uid && checkoutData.uid !== request.auth.uid) {
        throw new HttpsError('permission-denied', 'Checkout session does not belong to this user.');
      }
    }

    try {
      const stripe = getStripeClient();
      if (!stripe) {
        throw new HttpsError('failed-precondition', 'Stripe not configured');
      }
      const session = await stripe.checkout.sessions.retrieve(sessionId, {
        expand: ['line_items', 'subscription'],
      });

      if (!session) {
        throw new HttpsError('not-found', 'Checkout session not found.');
      }

      if (session.client_reference_id && session.client_reference_id !== request.auth.uid) {
        throw new HttpsError('permission-denied', 'Checkout session does not belong to this user.');
      }

      if (session.payment_status !== 'paid') {
        await checkoutRef.set({
          status: session.status,
          paymentStatus: session.payment_status,
          lastCheckedAt: FieldValue.serverTimestamp(),
        }, { merge: true });
        throw new HttpsError('failed-precondition', 'Payment is not complete yet.');
      }

      const lineItems = session.line_items && session.line_items.data ? session.line_items.data : [];
      const firstPrice = lineItems.length > 0 && lineItems[0].price ? lineItems[0].price.id : null;
      const metadata = resolvePriceMetadata(firstPrice, checkoutSnap.data()?.tier);

      if (!metadata) {
        throw new HttpsError('failed-precondition', 'Unable to determine plan for this checkout.');
      }

      let expiresAt = null;
      let willRenew = false;
      if (session.mode === 'subscription' && session.subscription) {
        const subscription = session.subscription;
        if (subscription.current_period_end) {
          expiresAt = new Date(subscription.current_period_end * 1000).toISOString();
        }
        willRenew = subscription.cancel_at_period_end === false;
      }

      const planDetails = resolvePlanDetails(metadata.tier);

      let expiresAtTimestamp = null;
      if (expiresAt) {
        const parsed = new Date(expiresAt);
        if (!Number.isNaN(parsed.getTime())) {
          expiresAtTimestamp = Timestamp.fromDate(parsed);
        }
      }

      await db.collection('users').doc(request.auth.uid).set({
        subscriptionTier: planDetails.plan,
        subscriptionStatus: 'active',
        subscriptionProvider: 'stripe',
        subscriptionWillRenew: willRenew,
        subscriptionExpiresAt: expiresAtTimestamp,
        subscriptionBillingTier: metadata.tier,
        subscriptionUpdatedAt: FieldValue.serverTimestamp(),
        effectiveLimits: planDetails.effectiveLimits,
      }, { merge: true });

      const planDocument = {
        plan: planDetails.plan,
        billingTier: metadata.tier,
        provider: 'stripe',
        priceId: firstPrice,
        effectiveLimits: planDetails.effectiveLimits,
        flags: planDetails.flags,
        willRenew,
        lifetime: planDetails.lifetime,
        updatedAt: FieldValue.serverTimestamp(),
      };

      if (expiresAtTimestamp) {
        planDocument.expiresAt = expiresAtTimestamp;
      } else if (planDetails.lifetime) {
        planDocument.expiresAt = null;
      }

      await db.collection('users').doc(request.auth.uid)
        .collection('plan')
        .doc('active')
        .set(planDocument, { merge: true });

      await checkoutRef.set({
        status: 'completed',
        paymentStatus: session.payment_status,
        completedAt: FieldValue.serverTimestamp(),
        tier: metadata.tier,
        priceId: firstPrice,
      }, { merge: true });

      return {
        tier: metadata.tier,
        isActive: true,
        willRenew,
        expiresAt,
        sessionStatus: session.status,
        plan: planDetails.plan,
      };
    } catch (error) {
      console.error('❌ Stripe finalize error:', error);
      if (error instanceof HttpsError) {
        throw error;
      }
      throw new HttpsError('internal', error.message || 'Failed to verify checkout session.');
    }
  }
);
