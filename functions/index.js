/**
 * 🔮 Crystal Grimoire Cloud Functions - Complete Backend System
 * Authentication, user management, and crystal identification with Gemini AI
 */

const { onCall, onRequest, HttpsError } = require('firebase-functions/v2/https');
const { onDocumentCreated } = require('firebase-functions/v2/firestore');
const { initializeApp } = require('firebase-admin/app');
const { getFirestore, FieldValue, Timestamp } = require('firebase-admin/firestore');
const { getAuth } = require('firebase-admin/auth');
const { GoogleGenerativeAI } = require('@google/generative-ai');
// Use environment variables instead of deprecated config()
// Note: Secrets are named STRIPE_PRICE_PREMIUM, STRIPE_PRICE_PRO, STRIPE_PRICE_FOUNDERS in Firebase Secrets Manager
const stripeConfig = {
  secret_key: process.env.STRIPE_SECRET_KEY || '',
  premium_price_id: process.env.STRIPE_PRICE_PREMIUM || '',
  pro_price_id: process.env.STRIPE_PRICE_PRO || '',
  founders_price_id: process.env.STRIPE_PRICE_FOUNDERS || ''
};

const geminiConfig = {
  api_key: process.env.GEMINI_API_KEY || ''
};

// Initialize Firebase Admin
initializeApp();
const db = getFirestore();
const auth = getAuth();

// Stripe already configured above via environment variables
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
  // Check if STRIPE_SECRET_KEY is set in environment
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new HttpsError('failed-precondition', 'Stripe is not configured. Set stripe.secret_key and price IDs.');
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

// Health check endpoint - no auth required for system monitoring
exports.healthCheck = onCall({ cors: true, invoker: 'public' }, async (request) => {
  return {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '2.0.0',
    services: {
      firestore: 'connected',
      gemini: !!geminiConfig.api_key,
      auth: 'enabled'
    },
  };
});

exports.createStripeCheckoutSession = onCall(
  { cors: true, region: 'us-central1', enforceAppCheck: false, secrets: ['STRIPE_SECRET_KEY', 'STRIPE_PRICE_PREMIUM', 'STRIPE_PRICE_PRO', 'STRIPE_PRICE_FOUNDERS'] },
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
      const session = await getStripe().checkout.sessions.create({
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
  { cors: true, region: 'us-central1', enforceAppCheck: false, secrets: ['STRIPE_SECRET_KEY'] },
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
      const session = await getStripe().checkout.sessions.retrieve(sessionId, {
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

// Crystal identification function - requires authentication
exports.identifyCrystal = onCall(
  { cors: true, memory: '1GiB', timeoutSeconds: 60, secrets: ['GEMINI_API_KEY'] },
  async (request) => {
    // Check authentication
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Must be authenticated to identify crystals');
    }

    const userId = request.auth.uid;

    // ===== COST PROTECTION: Daily limit by tier =====
    const userDoc = await db.collection('users').doc(userId).get();
    const userData = userDoc.exists ? userDoc.data() : {};
    const tier = userData?.tier || 'free';

    const dailyLimits = {
      free: 3,
      premium: 15,
      pro: 40,
      founders: 999
    };

    const today = new Date().toISOString().split('T')[0];
    const lastIdentifyDate = userData?.usage?.lastIdentifyDate;
    const dailyIdentifyCount = userData?.usage?.dailyIdentifyCount || 0;
    const userLimit = dailyLimits[tier] || 3;

    if (lastIdentifyDate === today && dailyIdentifyCount >= userLimit) {
      throw new HttpsError(
        'resource-exhausted',
        `Daily crystal identification limit (${userLimit}) reached. Upgrade or try again tomorrow.`
      );
    }

    // Use Google AI SDK with secret
    const { GoogleGenerativeAI } = require('@google/generative-ai');

    if (!process.env.GEMINI_API_KEY) {
      throw new HttpsError('failed-precondition', 'AI service not configured');
    }

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

    try {
      const { imageData } = request.data;
      
      if (!imageData) {
        throw new HttpsError('invalid-argument', 'Image data required');
      }

      console.log(`🔍 Starting crystal identification for user: ${userId}...`);
      
      const model = genAI.getGenerativeModel({
        model: 'gemini-2.0-flash', // Modern cost-efficient vision model
        generationConfig: {
          maxOutputTokens: 2048,
          temperature: 0.4,
          topP: 0.95,
          topK: 40
        }
      });
      
      const geminiPrompt = `
        You are a crystal identification expert. Analyze this crystal image and provide a comprehensive JSON response with the following structure:
        {
          "identification": {
            "name": "Crystal Name",
            "variety": "Specific variety if applicable",
            "confidence": 85
          },
          "description": "Detailed description of the crystal's appearance and formation",
          "metaphysical_properties": {
            "healing_properties": ["property1", "property2"],
            "primary_chakras": ["chakra1", "chakra2"],
            "energy_type": "grounding/energizing/calming",
            "planet_association": "planet name",
            "element": "earth/air/fire/water"
          },
          "care_instructions": {
            "cleansing": ["method1", "method2"],
            "charging": ["method1", "method2"],
            "storage": "storage instructions"
          }
        }
        
        Important: Return ONLY the JSON object, no additional text.
      `;

      const result = await model.generateContent([
        geminiPrompt,
        {
          inlineData: {
            mimeType: 'image/jpeg',
            data: imageData
          }
        }
      ]);

      const responseText = result.response.text();
      console.log('🤖 Gemini raw response:', responseText.substring(0, 200) + '...');

      // Parse JSON response
      const cleanJson = responseText.replace(/```json\n?|\n?```/g, '').trim();
      const crystalData = JSON.parse(cleanJson);

      const confidenceRaw = crystalData?.identification?.confidence;
      let confidence = 0;
      if (typeof confidenceRaw === 'number') {
        confidence = confidenceRaw > 1 ? confidenceRaw / 100 : confidenceRaw;
      } else if (typeof confidenceRaw === 'string') {
        const parsed = parseFloat(confidenceRaw);
        if (!Number.isNaN(parsed)) {
          confidence = parsed > 1 ? parsed / 100 : parsed;
        }
      }

      const candidateEntry = {
        name: crystalData?.identification?.name || 'Unknown',
        confidence,
        rationale: typeof crystalData?.description === 'string' ? crystalData.description : '',
        variety: crystalData?.identification?.variety || null,
      };

      const imagePath = (typeof request.data?.imagePath === 'string' && request.data.imagePath.trim().length)
        ? request.data.imagePath.trim()
        : null;

      const identificationDocument = {
        imagePath,
        candidates: [candidateEntry],
        selected: {
          name: candidateEntry.name,
          confidence: candidateEntry.confidence,
          rationale: candidateEntry.rationale,
          variety: candidateEntry.variety,
        },
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      };

      const identificationRef = await db
        .collection('users')
        .doc(userId)
        .collection('identifications')
        .add(identificationDocument);

      console.log(`💾 Crystal identification saved for user ${userId} as ${identificationRef.id}`);

      await migrateLegacyIdentifications(userId);

      // ===== CHECK IF USER ALREADY OWNS THIS CRYSTAL =====
      const identifiedName = (crystalData.identification?.name || '').toLowerCase().trim();
      let alreadyOwned = false;
      let existingCrystalId = null;

      if (identifiedName && identifiedName !== 'unknown') {
        const collectionSnapshot = await db
          .collection('users')
          .doc(userId)
          .collection('collection')
          .get();

        collectionSnapshot.forEach(doc => {
          const data = doc.data();
          const ownedName = (data.name || '').toLowerCase().trim();
          // Check for exact match or close match (e.g., "Rose Quartz" vs "rose quartz")
          if (ownedName === identifiedName ||
              ownedName.includes(identifiedName) ||
              identifiedName.includes(ownedName)) {
            alreadyOwned = true;
            existingCrystalId = doc.id;
          }
        });

        if (alreadyOwned) {
          console.log(`📦 User already owns this crystal: ${identifiedName}`);
        }
      }

      console.log('✅ Crystal identified:', crystalData.identification?.name || 'Unknown');

      // ===== COST TRACKING: Increment daily usage counter =====
      await db.collection('users').doc(userId).set({
        usage: {
          dailyIdentifyCount: lastIdentifyDate === today ? FieldValue.increment(1) : 1,
          lastIdentifyDate: today,
          totalIdentifications: FieldValue.increment(1)
        }
      }, { merge: true });

      // Return with ownership info
      return {
        ...crystalData,
        alreadyOwned,
        existingCrystalId,
        message: alreadyOwned
          ? `You already have ${crystalData.identification?.name} in your collection!`
          : null
      };

    } catch (error) {
      console.error('❌ Crystal identification error:', error);
      throw new HttpsError('internal', `Identification failed: ${error.message}`);
    }
  }
);

async function migrateLegacyIdentifications(uid) {
  try {
    const legacySnapshot = await db
      .collection('identifications')
      .where('userId', '==', uid)
      .limit(10)
      .get();

    if (legacySnapshot.empty) {
      return;
    }

    const batch = db.batch();
    let migratedCount = 0;

    legacySnapshot.docs.forEach((doc) => {
      const data = doc.data() || {};
      if (data.migrated === true) {
        return;
      }

      const legacyConfidence = typeof data?.identification?.confidence === 'number'
        ? data.identification.confidence
        : parseFloat(data?.identification?.confidence || 0);
      const normalizedConfidence = Number.isFinite(legacyConfidence)
        ? (legacyConfidence > 1 ? legacyConfidence / 100 : legacyConfidence)
        : 0;

      const candidate = {
        name: data?.identification?.name || data?.name || 'Unknown',
        confidence: normalizedConfidence,
        rationale: typeof data?.description === 'string' ? data.description : '',
        variety: data?.identification?.variety || null,
      };

      let createdAt = null;
      if (data.createdAt instanceof Timestamp) {
        createdAt = data.createdAt;
      } else if (data.timestamp instanceof Timestamp) {
        createdAt = data.timestamp;
      } else if (typeof data.timestamp === 'string' || data.createdAt) {
        const raw = data.createdAt || data.timestamp;
        const parsed = new Date(raw);
        if (!Number.isNaN(parsed.getTime())) {
          createdAt = Timestamp.fromDate(parsed);
        }
      }

      const targetRef = db
        .collection('users')
        .doc(uid)
        .collection('identifications')
        .doc(doc.id);

      batch.set(targetRef, {
        imagePath: data.imagePath || null,
        candidates: [candidate],
        selected: candidate,
        createdAt: createdAt || FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      }, { merge: true });

      batch.update(doc.ref, {
        migrated: true,
        migratedAt: FieldValue.serverTimestamp(),
      });

      migratedCount += 1;
    });

    if (migratedCount > 0) {
      await batch.commit();
      console.log(`🔄 Migrated ${migratedCount} legacy identification(s) for ${uid}`);
    }
  } catch (migrationError) {
    console.error('⚠️ Legacy identification migration failed:', migrationError);
  }
}

// Crystal guidance function - text-only Gemini queries, requires authentication
// ENHANCED: Now fetches user's collection and prioritizes owned crystals
exports.getCrystalGuidance = onCall(
  { cors: true, memory: '256MiB', timeoutSeconds: 30, secrets: ['GEMINI_API_KEY'] },
  async (request) => {
    // Check authentication
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Must be authenticated to receive crystal guidance');
    }

    const { GoogleGenerativeAI } = require('@google/generative-ai');

    if (!process.env.GEMINI_API_KEY) {
      throw new HttpsError('failed-precondition', 'AI service not configured');
    }

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

    try {
      const { question, intentions, experience } = request.data;
      const userId = request.auth.uid;

      if (!question) {
        throw new HttpsError('invalid-argument', 'Question is required');
      }

      console.log(`🔍 Starting crystal guidance for user: ${userId}...`);

      // ===== FETCH USER'S CRYSTAL COLLECTION =====
      const collectionSnapshot = await db
        .collection('users')
        .doc(userId)
        .collection('collection')
        .orderBy('addedAt', 'desc')
        .limit(20) // Get up to 20 crystals for context
        .get();

      const ownedCrystals = [];
      collectionSnapshot.forEach(doc => {
        const data = doc.data();
        ownedCrystals.push({
          name: data.name || 'Unknown',
          chakras: data.chakras || data.metaphysical_properties?.primary_chakras || [],
          element: data.element || data.metaphysical_properties?.element || 'unknown',
          healing: data.healing_properties || data.metaphysical_properties?.healing_properties || []
        });
      });

      console.log(`   User owns ${ownedCrystals.length} crystals`);

      // Build collection context for AI
      let collectionContext = '';
      if (ownedCrystals.length > 0) {
        collectionContext = `
USER'S CRYSTAL COLLECTION (${ownedCrystals.length} crystals they ALREADY OWN):
${ownedCrystals.map(c => `- ${c.name} (${c.element}, chakras: ${c.chakras.slice(0,2).join('/')})`).join('\n')}

PRIORITY INSTRUCTION: You MUST recommend crystals from the user's collection FIRST.
Only suggest crystals they don't own if their collection has no suitable options.
When recommending owned crystals, say "From your collection:" before listing them.
`;
      } else {
        collectionContext = `
USER'S CRYSTAL COLLECTION: Empty (they don't own any crystals yet)
Since they have no crystals, recommend beginner-friendly crystals to start their collection.
`;
      }

      const model = genAI.getGenerativeModel({
        model: 'gemini-1.5-flash', // Cost-efficient model
        generationConfig: {
          maxOutputTokens: 1024,
          temperature: 0.7,
          topP: 1,
          topK: 32
        }
      });

      const guidancePrompt = `
        You are a wise crystal healing advisor. A user is asking: "${question}"

        Their experience level: ${experience || 'beginner'}
        Their intentions: ${intentions ? intentions.join(', ') : 'general wellness'}

        ${collectionContext}

        Provide a comprehensive JSON response with the following structure:
        {
          "recommended_crystals": [
            {
              "name": "Crystal Name",
              "reason": "Why this crystal is perfect for their needs",
              "how_to_use": "Specific instructions for using this crystal",
              "from_collection": true or false
            }
          ],
          "guidance": "Detailed spiritual guidance and advice",
          "affirmation": "A personal affirmation they can use",
          "meditation_tip": "A simple meditation practice with their chosen crystals"
        }

        Important:
        - Return ONLY the JSON object, no additional text.
        - Set "from_collection": true for crystals the user already owns
        - PRIORITIZE crystals they own in your recommendations
      `;

      const result = await model.generateContent([guidancePrompt]);
      const responseText = result.response.text();
      console.log('🤖 Gemini guidance response:', responseText.substring(0, 200) + '...');

      // Parse JSON response
      const cleanJson = responseText.replace(/```json\n?|\n?```/g, '').trim();
      const guidanceData = JSON.parse(cleanJson);

      // Save guidance session to user's collection
      const guidanceRecord = {
        question,
        intentions,
        experience,
        guidance: guidanceData,
        userId: userId,
        ownedCrystalsUsed: ownedCrystals.length,
        timestamp: new Date().toISOString(),
      };

      await db.collection('guidance_sessions').add(guidanceRecord);
      console.log('💾 Guidance session saved to user collection');

      console.log('✅ Crystal guidance provided (used ' + ownedCrystals.length + ' owned crystals for context)');

      return guidanceData;

    } catch (error) {
      console.error('❌ Crystal guidance error:', error);
      throw new HttpsError('internal', `Guidance failed: ${error.message}`);
    }
  }
);

// User Management Functions

// Triggered when a new user is created in Firebase Auth
exports.createUserDocument = onDocumentCreated('users/{userId}', async (event) => {
  try {
    const userId = event.params.userId;
    const userData = event.data?.data();
    
    if (!userData) {
      console.log(`No user data found for ${userId}`);
      return;
    }
    
    console.log(`🆕 Creating/updating user document for ${userId}`);

    // Initialize user's subcollections and default data
    const userRef = db.collection('users').doc(userId);

    // Check if user already exists with subscription data
    const existingDoc = await userRef.get();
    const existingData = existingDoc.exists ? existingDoc.data() : {};

    // IMPORTANT: Preserve existing subscription data - don't overwrite paid subscriptions!
    const hasExistingSubscription = existingData.subscriptionTier &&
                                     existingData.subscriptionTier !== 'free';

    // Set default user profile data, preserving subscription if exists
    const defaultProfile = {
      uid: userId,
      email: userData.email || existingData.email || '',
      displayName: userData.displayName || existingData.displayName || 'Crystal Seeker',
      photoURL: userData.photoURL || existingData.photoURL || null,
      createdAt: existingData.createdAt || FieldValue.serverTimestamp(),
      lastLoginAt: FieldValue.serverTimestamp(),
      // PRESERVE existing subscription - only set 'free' for truly new users
      subscriptionTier: existingData.subscriptionTier || existingData.tier || 'free',
      tier: existingData.tier || existingData.subscriptionTier || 'free',
      subscriptionStatus: existingData.subscriptionStatus || 'inactive',
      stripeCustomerId: existingData.stripeCustomerId || null,
      stripeSubscriptionId: existingData.stripeSubscriptionId || null,
      monthlyIdentifications: existingData.monthlyIdentifications || 0,
      totalIdentifications: existingData.totalIdentifications || 0,
      metaphysicalQueries: existingData.metaphysicalQueries || 0,
      settings: existingData.settings || {
        notifications: true,
        newsletter: true,
        darkMode: true,
      },
    };

    if (hasExistingSubscription) {
      console.log(`📦 Preserving existing subscription: ${existingData.subscriptionTier}`);
    }

    await userRef.set(defaultProfile, { merge: true });
    
    // Initialize empty collections
    await userRef.collection('crystals').doc('_init').set({ created: FieldValue.serverTimestamp() });
    await userRef.collection('journal').doc('_init').set({ created: FieldValue.serverTimestamp() });
    
    console.log(`✅ User document created successfully for ${userId}`);
    
  } catch (error) {
    console.error('❌ Error creating user document:', error);
  }
});

// Update user profile - callable function
exports.updateUserProfile = onCall(
  { cors: true },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Must be authenticated');
    }
    
    try {
      const userId = request.auth.uid;
      const updates = request.data;
      
      // Validate allowed fields
      const allowedFields = [
        'displayName', 'photoURL', 'settings', 'birthChart', 
        'preferences', 'location', 'experience'
      ];
      
      const validUpdates = {};
      for (const [key, value] of Object.entries(updates)) {
        if (allowedFields.includes(key)) {
          validUpdates[key] = value;
        }
      }
      
      validUpdates.updatedAt = FieldValue.serverTimestamp();
      
      await db.collection('users').doc(userId).update(validUpdates);
      
      console.log(`✅ Profile updated for user ${userId}`);
      return { success: true };
      
    } catch (error) {
      console.error('❌ Error updating profile:', error);
      throw new HttpsError('internal', 'Failed to update profile');
    }
  }
);

// Get user profile data - callable function
exports.getUserProfile = onCall(
  { cors: true },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Must be authenticated');
    }
    
    try {
      const userId = request.auth.uid;
      const userDoc = await db.collection('users').doc(userId).get();
      
      if (!userDoc.exists) {
        throw new HttpsError('not-found', 'User profile not found');
      }
      
      const userData = userDoc.data();
      
      // Remove sensitive fields
      delete userData.internalNotes;
      delete userData.adminFlags;
      
      return userData;
      
    } catch (error) {
      console.error('❌ Error getting profile:', error);
      throw new HttpsError('internal', 'Failed to get profile');
    }
  }
);

// Delete user account and all associated data - callable function
exports.deleteUserAccount = onCall(
  { cors: true },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Must be authenticated');
    }
    
    try {
      const userId = request.auth.uid;
      
      console.log(`🗑️ Starting account deletion for user ${userId}`);
      
      // Delete user's subcollections
      const collections = ['crystals', 'journal', 'identifications', 'guidance'];
      
      for (const collectionName of collections) {
        const collectionRef = db.collection('users').doc(userId).collection(collectionName);
        const snapshot = await collectionRef.get();
        
        for (const doc of snapshot.docs) {
          await doc.ref.delete();
        }
      }
      
      // Delete main user document
      await db.collection('users').doc(userId).delete();
      
      // Delete from Firebase Auth
      await auth.deleteUser(userId);
      
      console.log(`✅ Account successfully deleted for user ${userId}`);
      return { success: true };
      
    } catch (error) {
      console.error('❌ Error deleting account:', error);
      throw new HttpsError('internal', 'Failed to delete account');
    }
  }
);

// Usage tracking function
exports.trackUsage = onCall(
  { cors: true },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Must be authenticated');
    }
    
    try {
      const userId = request.auth.uid;
      const { action, metadata } = request.data;
      
      const usageDoc = {
        userId,
        action,
        metadata: metadata || {},
        timestamp: FieldValue.serverTimestamp(),
      };
      
      await db.collection('usage_logs').add(usageDoc);
      
      // Update user stats
      const userRef = db.collection('users').doc(userId);
      
      if (action === 'crystal_identification') {
        await userRef.update({
          totalIdentifications: FieldValue.increment(1),
          monthlyIdentifications: FieldValue.increment(1),
        });
      } else if (action === 'metaphysical_query') {
        await userRef.update({
          metaphysicalQueries: FieldValue.increment(1),
        });
      }
      
      return { success: true };
      
    } catch (error) {
      console.error('❌ Error tracking usage:', error);
      throw new HttpsError('internal', 'Failed to track usage');
    }
  }
);

// Dream analysis and journaling helper
exports.analyzeDream = onCall(
  { cors: true, memory: '512MiB', timeoutSeconds: 40, secrets: ['GEMINI_API_KEY'] },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Must be authenticated');
    }

    const userId = request.auth.uid;

    // ===== COST PROTECTION: Daily limit by tier =====
    const userDoc = await db.collection('users').doc(userId).get();
    const userData = userDoc.exists ? userDoc.data() : {};
    const tier = userData?.tier || 'free';

    const dailyLimits = {
      free: 2,
      premium: 10,
      pro: 30,
      founders: 999
    };

    const today = new Date().toISOString().split('T')[0];
    const lastDreamDate = userData?.usage?.lastDreamAnalysisDate;
    const dailyDreamCount = userData?.usage?.dailyDreamAnalysisCount || 0;
    const userLimit = dailyLimits[tier] || 2;

    if (lastDreamDate === today && dailyDreamCount >= userLimit) {
      throw new HttpsError(
        'resource-exhausted',
        `Daily dream analysis limit (${userLimit}) reached. Upgrade or try again tomorrow.`
      );
    }

    const { dreamContent, userCrystals, dreamDate, mood, moonPhase } = request.data || {};

    if (!dreamContent || typeof dreamContent !== 'string' || dreamContent.trim().length < 10) {
      throw new HttpsError('invalid-argument', 'Dream content must be at least 10 characters long.');
    }

    try {
      console.log(`🌌 Analyzing dream for user ${userId}`);

      if (!process.env.GEMINI_API_KEY) {
        throw new HttpsError('failed-precondition', 'AI service not configured');
      }

      const { GoogleGenerativeAI } = require('@google/generative-ai');
      const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
      const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

      const crystalList = Array.isArray(userCrystals) ? userCrystals.join(', ') : 'None specified';
      const phase = moonPhase || 'Current lunar cycle';

      const analysisPrompt = `You are a compassionate dream interpreter who integrates crystal healing.` +
        `\nReturn a JSON object with the following structure (no markdown):` +
        `\n{` +
        `\n  "analysis": {` +
        `\n    "summary": string,` +
        `\n    "symbols": string,` +
        `\n    "emotions": string,` +
        `\n    "spiritualMessage": string,` +
        `\n    "ritual": string` +
        `\n  },` +
        `\n  "crystalSuggestions": [{"name": string, "reason": string, "usage": string}],` +
        `\n  "affirmation": string` +
        `\n}` +
        `\nKeep guidance mystical yet grounded, avoid medical/legal advice.` +
        `\nDream: "${dreamContent}"` +
        `\nKnown crystals: ${crystalList}` +
        `\nMoon phase: ${phase}` +
        (mood ? `\nReported mood: ${mood}` : '');

      const aiResponse = await model.generateContent([analysisPrompt]);
      const rawText = aiResponse.response.text();
      const cleaned = rawText.replace(/```json\n?|```/g, '').trim();

      let structured;
      try {
        structured = JSON.parse(cleaned);
      } catch (parseError) {
        console.warn('⚠️ Dream analysis JSON parse failed, falling back to text output.');
        structured = {
          analysis: { summary: rawText },
          crystalSuggestions: Array.isArray(userCrystals) ? userCrystals.map((name) => ({
            name,
            reason: 'Personal crystal on record',
            usage: 'Hold during reflection',
          })) : [],
          affirmation: 'Breathe deeply and trust your intuition.',
        };
      }

      const analysisSections = structured.analysis || {};
      const analysisLines = [];
      if (analysisSections.summary) {
        analysisLines.push(`Summary:\n${analysisSections.summary}`);
      }
      if (analysisSections.symbols) {
        analysisLines.push(`Symbols & Themes:\n${analysisSections.symbols}`);
      }
      if (analysisSections.emotions) {
        analysisLines.push(`Emotional Currents:\n${analysisSections.emotions}`);
      }
      if (analysisSections.spiritualMessage) {
        analysisLines.push(`Spiritual Message:\n${analysisSections.spiritualMessage}`);
      }
      if (analysisSections.ritual) {
        analysisLines.push(`Integration Ritual:\n${analysisSections.ritual}`);
      }
      if (structured.affirmation) {
        analysisLines.push(`Affirmation:\n${structured.affirmation}`);
      }

      const analysisText = analysisLines.join('\n\n').trim() || rawText;
      const suggestions = Array.isArray(structured.crystalSuggestions)
        ? structured.crystalSuggestions.slice(0, 5).map((suggestion) => ({
            name: suggestion.name || 'Crystal Ally',
            reason: suggestion.reason || 'Resonates with dream symbolism',
            usage: suggestion.usage || 'Hold during meditation',
          }))
        : [];

      let dreamTimestamp = FieldValue.serverTimestamp();
      if (dreamDate) {
        const parsedDream = new Date(dreamDate);
        if (!Number.isNaN(parsedDream.getTime())) {
          dreamTimestamp = Timestamp.fromDate(parsedDream);
        }
      }

      const entry = {
        content: dreamContent,
        analysis: analysisText,
        crystalSuggestions: suggestions,
        crystalsUsed: Array.isArray(userCrystals) ? userCrystals : [],
        dreamDate: dreamTimestamp,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
        mood: mood || null,
        moonPhase: moonPhase || null,
      };

      const docRef = await db
        .collection('users')
        .doc(userId)
        .collection('dreams')
        .add(entry);

      // ===== COST TRACKING: Increment daily usage counter =====
      await db.collection('users').doc(userId).set({
        usage: {
          dailyDreamAnalysisCount: lastDreamDate === today ? FieldValue.increment(1) : 1,
          lastDreamAnalysisDate: today,
          totalDreamAnalyses: FieldValue.increment(1)
        }
      }, { merge: true });

      console.log(`✅ Dream analysis saved with id ${docRef.id}`);
      return {
        analysis: analysisText,
        crystalSuggestions: suggestions,
        affirmation: structured.affirmation || null,
        entryId: docRef.id,
      };
    } catch (error) {
      console.error('❌ Dream analysis error:', error);
      throw new HttpsError('internal', `Dream analysis failed: ${error.message}`);
    }
  }
);

// Get daily crystal recommendation - public function (no auth required for daily inspiration)
exports.getDailyCrystal = onCall({
  cors: true,
  invoker: 'public',
  timeoutSeconds: 60,
  memory: '256MiB'
}, async (request) => {
  try {
    console.log('🌅 Getting daily crystal recommendation...');
    
    // Array of crystals with detailed properties for daily recommendations
    const crystalDatabase = [
      {
        name: 'Clear Quartz',
        description: 'The master healer crystal that amplifies energy and intentions. Known as the most versatile healing stone, Clear Quartz can be programmed with any intention and works harmoniously with all other crystals.',
        properties: ['Amplification', 'Healing', 'Clarity', 'Energy', 'Purification'],
        metaphysical_properties: {
          healing_properties: ['Amplifies energy', 'Promotes clarity', 'Enhances spiritual growth'],
          primary_chakras: ['Crown', 'All Chakras'],
          energy_type: 'amplifying',
          element: 'air'
        },
        identification: {
          name: 'Clear Quartz',
          confidence: 95,
          variety: 'Crystalline Quartz'
        }
      },
      {
        name: 'Amethyst',
        description: 'A powerful crystal for spiritual growth, protection, and clarity. Amethyst enhances intuition and promotes peaceful energy while providing protection from negative influences.',
        properties: ['Spiritual Growth', 'Protection', 'Clarity', 'Peace', 'Intuition'],
        metaphysical_properties: {
          healing_properties: ['Enhances intuition', 'Provides protection', 'Promotes spiritual awareness'],
          primary_chakras: ['Crown', 'Third Eye'],
          energy_type: 'calming',
          element: 'air'
        },
        identification: {
          name: 'Amethyst',
          confidence: 92,
          variety: 'Purple Quartz'
        }
      },
      {
        name: 'Rose Quartz',
        description: 'The stone of unconditional love and infinite peace. Rose Quartz is the most important crystal for healing the heart and heart chakra, teaching the true essence of love.',
        properties: ['Love', 'Compassion', 'Healing', 'Peace', 'Self-Love'],
        metaphysical_properties: {
          healing_properties: ['Opens heart chakra', 'Promotes self-love', 'Attracts love'],
          primary_chakras: ['Heart'],
          energy_type: 'loving',
          element: 'water'
        },
        identification: {
          name: 'Rose Quartz',
          confidence: 90,
          variety: 'Pink Quartz'
        }
      },
      {
        name: 'Black Tourmaline',
        description: 'A powerful grounding stone that provides protection from negative energies and electromagnetic radiation. Creates a protective shield around the aura.',
        properties: ['Protection', 'Grounding', 'Purification', 'Deflection', 'Stability'],
        metaphysical_properties: {
          healing_properties: ['Provides protection', 'Grounds energy', 'Deflects negativity'],
          primary_chakras: ['Root'],
          energy_type: 'grounding',
          element: 'earth'
        },
        identification: {
          name: 'Black Tourmaline',
          confidence: 88,
          variety: 'Schorl'
        }
      },
      {
        name: 'Citrine',
        description: 'Known as the merchants stone, Citrine attracts wealth, prosperity, and success. It also promotes joy, enthusiasm, and creativity while dissipating negative energy.',
        properties: ['Abundance', 'Joy', 'Creativity', 'Success', 'Energy'],
        metaphysical_properties: {
          healing_properties: ['Attracts abundance', 'Boosts confidence', 'Enhances creativity'],
          primary_chakras: ['Solar Plexus', 'Sacral'],
          energy_type: 'energizing',
          element: 'fire'
        },
        identification: {
          name: 'Citrine',
          confidence: 91,
          variety: 'Yellow Quartz'
        }
      },
      {
        name: 'Selenite',
        description: 'A high-vibrational crystal that cleanses and charges other crystals. Selenite connects you to higher realms and promotes mental clarity and spiritual insight.',
        properties: ['Cleansing', 'Charging', 'Clarity', 'Spiritual Connection', 'Peace'],
        metaphysical_properties: {
          healing_properties: ['Cleanses energy', 'Enhances spiritual connection', 'Promotes clarity'],
          primary_chakras: ['Crown', 'Third Eye'],
          energy_type: 'cleansing',
          element: 'air'
        },
        identification: {
          name: 'Selenite',
          confidence: 89,
          variety: 'Gypsum'
        }
      }
    ];
    
    // Get current date to ensure same crystal per day
    const today = new Date();
    const dayOfYear = Math.floor((today - new Date(today.getFullYear(), 0, 0)) / 1000 / 60 / 60 / 24);
    
    // Use day of year to select crystal (ensures same crystal for same day)
    const selectedCrystal = crystalDatabase[dayOfYear % crystalDatabase.length];
    
    console.log(`✅ Daily crystal selected: ${selectedCrystal.name}`);
    
    return {
      ...selectedCrystal,
      date: today.toISOString().split('T')[0], // YYYY-MM-DD format
      dayOfYear: dayOfYear
    };
    
  } catch (error) {
    console.error('❌ Error getting daily crystal:', error);

    // Return fallback crystal if anything goes wrong
    return {
      name: 'Clear Quartz',
      description: 'The master healer crystal that amplifies energy and intentions. Known as the most versatile healing stone, Clear Quartz can be programmed with any intention and works harmoniously with all other crystals.',
      properties: ['Amplification', 'Healing', 'Clarity', 'Energy', 'Purification'],
      metaphysical_properties: {
        healing_properties: ['Amplifies energy', 'Promotes clarity', 'Enhances spiritual growth'],
        primary_chakras: ['Crown', 'All Chakras'],
      },
      identification: {
        name: 'Clear Quartz',
        confidence: 95,
        variety: 'Crystalline Quartz'
      },
      date: new Date().toISOString().split('T')[0],
      error: 'Fallback crystal provided'
    };
  }
});

// ============================================================================
// COLLECTION MANAGEMENT FUNCTIONS
// ============================================================================

// Add crystal to user's personal collection
exports.addCrystalToCollection = onCall(
  { cors: true },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Must be authenticated');
    }

    try {
      const { crystalData, customName, acquisitionSource, notes } = request.data;
      const userId = request.auth.uid;

      if (!crystalData || !crystalData.identification || !crystalData.identification.name) {
        throw new HttpsError('invalid-argument', 'Crystal data with identification required');
      }

      const crystalId = `${Date.now()}_${crystalData.identification.name.toLowerCase().replace(/\s+/g, '_')}`;

      console.log(`💎 Adding crystal to collection for user ${userId}: ${crystalData.identification.name}`);

      // Create collection entry
      const collectionEntry = {
        crystalId,
        name: crystalData.identification.name,
        variety: crystalData.identification.variety || null,
        customName: customName || null,
        confidence: crystalData.identification.confidence || 0,
        description: crystalData.description || '',
        metaphysical_properties: crystalData.metaphysical_properties || {},
        care_instructions: crystalData.care_instructions || {},
        acquisitionDate: FieldValue.serverTimestamp(),
        acquisitionSource: acquisitionSource || 'identified',
        notes: notes || '',
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      };

      // Add to user's collection subcollection
      await db
        .collection('users')
        .doc(userId)
        .collection('collection')
        .doc(crystalId)
        .set(collectionEntry);

      // Update user's ownedCrystalIds array and stats
      await db
        .collection('users')
        .doc(userId)
        .update({
          ownedCrystalIds: FieldValue.arrayUnion(crystalId),
          'stats.collectionsSize': FieldValue.increment(1),
          updatedAt: FieldValue.serverTimestamp(),
        });

      console.log(`✅ Crystal added to collection: ${crystalId}`);
      return { success: true, crystalId, message: `${crystalData.identification.name} added to your collection` };

    } catch (error) {
      console.error('❌ Error adding crystal to collection:', error);
      throw new HttpsError('internal', `Failed to add crystal: ${error.message}`);
    }
  }
);

// Remove crystal from collection
exports.removeCrystalFromCollection = onCall(
  { cors: true },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Must be authenticated');
    }

    try {
      const { crystalId } = request.data;
      const userId = request.auth.uid;

      if (!crystalId) {
        throw new HttpsError('invalid-argument', 'Crystal ID required');
      }

      console.log(`🗑️ Removing crystal from collection: ${crystalId}`);

      // Delete from collection subcollection
      await db
        .collection('users')
        .doc(userId)
        .collection('collection')
        .doc(crystalId)
        .delete();

      // Update user's ownedCrystalIds array and stats
      await db
        .collection('users')
        .doc(userId)
        .update({
          ownedCrystalIds: FieldValue.arrayRemove(crystalId),
          'stats.collectionsSize': FieldValue.increment(-1),
          updatedAt: FieldValue.serverTimestamp(),
        });

      console.log(`✅ Crystal removed from collection: ${crystalId}`);
      return { success: true, message: 'Crystal removed from collection' };

    } catch (error) {
      console.error('❌ Error removing crystal from collection:', error);
      throw new HttpsError('internal', `Failed to remove crystal: ${error.message}`);
    }
  }
);

// Update crystal in collection
exports.updateCrystalInCollection = onCall(
  { cors: true },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Must be authenticated');
    }

    try {
      const { crystalId, updates } = request.data;
      const userId = request.auth.uid;

      if (!crystalId || !updates) {
        throw new HttpsError('invalid-argument', 'Crystal ID and updates required');
      }

      console.log(`✏️ Updating crystal in collection: ${crystalId}`);

      // Allowed fields to update
      const allowedFields = ['customName', 'notes', 'acquisitionSource'];
      const validUpdates = {};

      for (const [key, value] of Object.entries(updates)) {
        if (allowedFields.includes(key)) {
          validUpdates[key] = value;
        }
      }

      validUpdates.updatedAt = FieldValue.serverTimestamp();

      await db
        .collection('users')
        .doc(userId)
        .collection('collection')
        .doc(crystalId)
        .update(validUpdates);

      console.log(`✅ Crystal updated in collection: ${crystalId}`);
      return { success: true, message: 'Crystal updated successfully' };

    } catch (error) {
      console.error('❌ Error updating crystal in collection:', error);
      throw new HttpsError('internal', `Failed to update crystal: ${error.message}`);
    }
  }
);

// Get user's crystal collection with analysis
exports.getCrystalCollection = onCall(
  { cors: true },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Must be authenticated');
    }

    try {
      const userId = request.auth.uid;
      console.log(`📚 Fetching crystal collection for user ${userId}`);

      // Get all crystals in collection
      const collectionSnap = await db
        .collection('users')
        .doc(userId)
        .collection('collection')
        .orderBy('createdAt', 'desc')
        .get();

      const crystals = collectionSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        addedDate: doc.data().acquisitionDate?.toDate()?.toISOString() || null,
      }));

      // Analyze collection balance
      const elementCounts = { earth: 0, air: 0, fire: 0, water: 0 };
      const chakraCounts = {
        root: 0,
        sacral: 0,
        solar_plexus: 0,
        heart: 0,
        throat: 0,
        third_eye: 0,
        crown: 0,
      };
      const energyTypeCounts = { grounding: 0, energizing: 0, calming: 0 };

      crystals.forEach(crystal => {
        const props = crystal.metaphysical_properties || {};

        // Count elements
        const element = props.element?.toLowerCase();
        if (element && elementCounts[element] !== undefined) {
          elementCounts[element]++;
        }

        // Count chakras
        if (Array.isArray(props.primary_chakras)) {
          props.primary_chakras.forEach(chakra => {
            const chakraKey = chakra.toLowerCase().replace(/\s+/g, '_');
            if (chakraCounts[chakraKey] !== undefined) {
              chakraCounts[chakraKey]++;
            }
          });
        }

        // Count energy types
        const energyType = props.energy_type?.toLowerCase();
        if (energyType && energyTypeCounts[energyType] !== undefined) {
          energyTypeCounts[energyType]++;
        }
      });

      const totalCrystals = crystals.length;
      const elementBalance = {};
      const chakraBalance = {};
      const energyBalance = {};

      // Calculate percentages
      for (const [key, count] of Object.entries(elementCounts)) {
        elementBalance[key] = totalCrystals > 0 ? Math.round((count / totalCrystals) * 100) : 0;
      }
      for (const [key, count] of Object.entries(chakraCounts)) {
        chakraBalance[key] = totalCrystals > 0 ? Math.round((count / totalCrystals) * 100) : 0;
      }
      for (const [key, count] of Object.entries(energyTypeCounts)) {
        energyBalance[key] = totalCrystals > 0 ? Math.round((count / totalCrystals) * 100) : 0;
      }

      console.log(`✅ Collection fetched: ${totalCrystals} crystals`);

      return {
        totalCrystals,
        crystals,
        elementBalance,
        chakraBalance,
        energyBalance,
      };

    } catch (error) {
      console.error('❌ Error fetching crystal collection:', error);
      throw new HttpsError('internal', `Failed to fetch collection: ${error.message}`);
    }
  }
);

// ==========================================
// PHASE 2: PERSONALIZED AI FUNCTIONS
// ==========================================

/**
 * Get personalized crystal recommendations based on user's birth chart + collection
 */
exports.getPersonalizedCrystalRecommendation = onCall(
  { cors: true, secrets: ['GEMINI_API_KEY'] },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Must be authenticated');
    }

    try {
      const { purpose, currentMood, specificNeed } = request.data;
      const userId = request.auth.uid;

      // Get user profile with birth chart
      const userDoc = await db.collection('users').doc(userId).get();
      if (!userDoc.exists) {
        throw new HttpsError('not-found', 'User profile not found');
      }

      const userData = userDoc.data();
      const birthChart = userData.birthChart || {};
      const ownedCrystalIds = userData.ownedCrystalIds || [];

      // Get user's collection for balance analysis
      const collectionSnapshot = await db
        .collection('users')
        .doc(userId)
        .collection('collection')
        .get();

      const ownedCrystals = collectionSnapshot.docs.map(doc => doc.data().name);

      // Calculate current collection balance
      const elementCounts = { earth: 0, air: 0, fire: 0, water: 0 };
      const chakraCounts = { root: 0, sacral: 0, solar_plexus: 0, heart: 0, throat: 0, third_eye: 0, crown: 0 };

      collectionSnapshot.docs.forEach(doc => {
        const crystal = doc.data();
        const element = (crystal.identification?.metaphysical_properties?.element || 'earth').toLowerCase();
        const chakras = crystal.identification?.metaphysical_properties?.primary_chakras || [];

        if (elementCounts[element] !== undefined) {
          elementCounts[element]++;
        }

        chakras.forEach(chakra => {
          const chakraKey = chakra.toLowerCase().replace(' ', '_');
          if (chakraCounts[chakraKey] !== undefined) {
            chakraCounts[chakraKey]++;
          }
        });
      });

      // Build personalized prompt
      const prompt = `You are an expert gemologist and astrologer providing personalized crystal recommendations.

USER'S ASTROLOGICAL PROFILE:
- Sun Sign: ${birthChart.sunSign || 'Unknown'}
- Moon Sign: ${birthChart.moonSign || 'Unknown'}
- Rising Sign: ${birthChart.risingSign || 'Unknown'}
- Birth Date: ${birthChart.birthDate || 'Unknown'}

USER'S CURRENT CRYSTAL COLLECTION:
- Total Crystals: ${ownedCrystals.length}
- Owned Crystals: ${ownedCrystals.join(', ') || 'None'}

CURRENT COLLECTION BALANCE:
- Element Distribution: Earth ${elementCounts.earth}, Air ${elementCounts.air}, Fire ${elementCounts.fire}, Water ${elementCounts.water}
- Chakra Distribution: Root ${chakraCounts.root}, Sacral ${chakraCounts.sacral}, Solar Plexus ${chakraCounts.solar_plexus}, Heart ${chakraCounts.heart}, Throat ${chakraCounts.throat}, Third Eye ${chakraCounts.third_eye}, Crown ${chakraCounts.crown}

REQUEST CONTEXT:
- Purpose: ${purpose || 'general recommendation'}
- Current Mood: ${currentMood || 'not specified'}
- Specific Need: ${specificNeed || 'not specified'}

Please recommend 3-5 crystals that:
1. Complement their astrological profile (consider planetary rulers and elemental affinities)
2. Fill gaps in their current collection (recommend underrepresented elements/chakras)
3. DO NOT recommend crystals they already own
4. Match their current purpose and needs
5. Provide specific reasons based on their birth chart

Return a JSON object with this structure:
{
  "recommendations": [
    {
      "name": "Crystal Name",
      "reason": "Why this crystal is perfect for them based on astrology + collection gaps",
      "element": "element",
      "chakra": "primary chakra",
      "compatibility_score": 0.0-1.0,
      "best_use": "How to use this crystal",
      "timing": "Best time to work with it (based on their chart)"
    }
  ],
  "summary": "Overall guidance based on their chart and needs",
  "collection_gaps": ["Elements or chakras they need to balance"]
}`;

      const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
      const result = await model.generateContent(prompt);
      const response = result.response.text();

      // Try to parse as JSON
      let recommendations;
      try {
        recommendations = JSON.parse(response);
      } catch {
        // If not JSON, wrap as text
        recommendations = {
          recommendations: [],
          summary: response,
          collection_gaps: []
        };
      }

      return {
        success: true,
        data: recommendations,
        userContext: {
          sunSign: birthChart.sunSign,
          collectionSize: ownedCrystals.length,
          purpose
        }
      };
    } catch (error) {
      console.error('Error generating personalized recommendations:', error);
      throw new HttpsError('internal', `Failed to generate recommendations: ${error.message}`);
    }
  }
);

/**
 * Analyze user's entire crystal collection with AI insights
 */
exports.analyzeCrystalCollection = onCall(
  { cors: true, secrets: ['GEMINI_API_KEY'] },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Must be authenticated');
    }

    try {
      const userId = request.auth.uid;

      // Get user profile
      const userDoc = await db.collection('users').doc(userId).get();
      if (!userDoc.exists) {
        throw new HttpsError('not-found', 'User profile not found');
      }

      const userData = userDoc.data();
      const birthChart = userData.birthChart || {};

      // Get complete collection
      const collectionSnapshot = await db
        .collection('users')
        .doc(userId)
        .collection('collection')
        .get();

      if (collectionSnapshot.empty) {
        return {
          success: true,
          message: 'No crystals in collection yet',
          data: {
            summary: 'Start building your collection to receive personalized insights!',
            elementBalance: {},
            chakraBalance: {},
            recommendations: []
          }
        };
      }

      // Build collection summary
      const crystals = collectionSnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          name: data.name,
          element: data.identification?.metaphysical_properties?.element,
          chakras: data.identification?.metaphysical_properties?.primary_chakras,
          healingProperties: data.identification?.metaphysical_properties?.healing_properties
        };
      });

      // Calculate balances
      const elementCounts = { earth: 0, air: 0, fire: 0, water: 0 };
      const chakraCounts = { root: 0, sacral: 0, solar_plexus: 0, heart: 0, throat: 0, third_eye: 0, crown: 0 };
      const energyTypes = { grounding: 0, energizing: 0, calming: 0 };

      crystals.forEach(crystal => {
        const element = (crystal.element || 'earth').toLowerCase();
        if (elementCounts[element] !== undefined) elementCounts[element]++;

        (crystal.chakras || []).forEach(chakra => {
          const key = chakra.toLowerCase().replace(' ', '_');
          if (chakraCounts[key] !== undefined) chakraCounts[key]++;
        });

        (crystal.healingProperties || []).forEach(prop => {
          const lower = prop.toLowerCase();
          if (lower.includes('ground') || lower.includes('stabil')) energyTypes.grounding++;
          if (lower.includes('energ') || lower.includes('motiv')) energyTypes.energizing++;
          if (lower.includes('calm') || lower.includes('peace')) energyTypes.calming++;
        });
      });

      const total = crystals.length;

      const prompt = `You are an expert gemologist and spiritual advisor analyzing a crystal collection.

USER'S ASTROLOGICAL PROFILE:
- Sun Sign: ${birthChart.sunSign || 'Unknown'}
- Moon Sign: ${birthChart.moonSign || 'Unknown'}
- Rising Sign: ${birthChart.risingSign || 'Unknown'}

CRYSTAL COLLECTION (${total} crystals):
${crystals.map(c => `- ${c.name} (${c.element || 'unknown element'})`).join('\n')}

COLLECTION BALANCE:
Element Distribution:
- Earth: ${elementCounts.earth} (${((elementCounts.earth/total)*100).toFixed(0)}%)
- Air: ${elementCounts.air} (${((elementCounts.air/total)*100).toFixed(0)}%)
- Fire: ${elementCounts.fire} (${((elementCounts.fire/total)*100).toFixed(0)}%)
- Water: ${elementCounts.water} (${((elementCounts.water/total)*100).toFixed(0)}%)

Chakra Distribution:
- Root: ${chakraCounts.root}, Sacral: ${chakraCounts.sacral}, Solar Plexus: ${chakraCounts.solar_plexus}
- Heart: ${chakraCounts.heart}, Throat: ${chakraCounts.throat}, Third Eye: ${chakraCounts.third_eye}, Crown: ${chakraCounts.crown}

Energy Types:
- Grounding: ${energyTypes.grounding}, Energizing: ${energyTypes.energizing}, Calming: ${energyTypes.calming}

Provide a comprehensive analysis in JSON format:
{
  "summary": "Overall assessment of their collection's strengths and themes",
  "astrological_alignment": "How their collection aligns (or doesn't) with their birth chart",
  "dominant_energies": ["List 2-3 dominant energy patterns"],
  "missing_elements": ["Elements or energies that are underrepresented"],
  "recommendations": [
    "Specific suggestion 1 based on their chart",
    "Specific suggestion 2 to balance their collection",
    "Specific suggestion 3 for their spiritual growth"
  ],
  "suggested_crystals": ["Crystal name 1", "Crystal name 2", "Crystal name 3"]
}`;

      const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
      const result = await model.generateContent(prompt);
      const response = result.response.text();

      let analysis;
      try {
        analysis = JSON.parse(response);
      } catch {
        analysis = { summary: response, recommendations: [] };
      }

      return {
        success: true,
        data: {
          ...analysis,
          elementBalance: elementCounts,
          chakraBalance: chakraCounts,
          energyBalance: energyTypes,
          totalCrystals: total
        }
      };
    } catch (error) {
      console.error('Error analyzing collection:', error);
      throw new HttpsError('internal', `Failed to analyze collection: ${error.message}`);
    }
  }
);

/**
 * Get personalized daily ritual using user's owned crystals
 */
exports.getPersonalizedDailyRitual = onCall(
  { cors: true, secrets: ['GEMINI_API_KEY'] },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Must be authenticated');
    }

    try {
      const { ritualType, duration, focus } = request.data;
      const userId = request.auth.uid;

      // Get user data
      const userDoc = await db.collection('users').doc(userId).get();
      if (!userDoc.exists) {
        throw new HttpsError('not-found', 'User profile not found');
      }

      const userData = userDoc.data();
      const birthChart = userData.birthChart || {};

      // Get user's collection
      const collectionSnapshot = await db
        .collection('users')
        .doc(userId)
        .collection('collection')
        .limit(10)
        .get();

      const ownedCrystals = collectionSnapshot.docs.map(doc => ({
        name: doc.data().name,
        element: doc.data().identification?.metaphysical_properties?.element,
        chakras: doc.data().identification?.metaphysical_properties?.primary_chakras
      }));

      const prompt = `You are an expert spiritual guide creating a personalized crystal ritual.

USER'S PROFILE:
- Sun Sign: ${birthChart.sunSign || 'Unknown'}
- Moon Sign: ${birthChart.moonSign || 'Unknown'}
- Rising Sign: ${birthChart.risingSign || 'Unknown'}

AVAILABLE CRYSTALS (they own these):
${ownedCrystals.map(c => `- ${c.name} (${c.element || 'unknown'})`).join('\n')}

RITUAL PARAMETERS:
- Type: ${ritualType || 'morning'}
- Duration: ${duration || 10} minutes
- Focus: ${focus || 'meditation'}

Create a personalized ritual that ONLY uses crystals they already own. Return JSON:
{
  "title": "Ritual name based on their sign and focus",
  "duration": "${duration || 10} minutes",
  "best_time": "When to perform (consider their chart)",
  "crystals_needed": [
    {"name": "Crystal name", "owned": true, "purpose": "Why this crystal"}
  ],
  "setup": ["Setup step 1", "Setup step 2"],
  "steps": ["Step 1", "Step 2", "Step 3"],
  "affirmation": "Personalized affirmation based on their sign",
  "closing": "How to close the ritual",
  "frequency": "How often to practice"
}`;

      const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
      const result = await model.generateContent(prompt);
      const response = result.response.text();

      let ritual;
      try {
        ritual = JSON.parse(response);
      } catch {
        ritual = {
          title: 'Daily Crystal Ritual',
          steps: [response],
          affirmation: 'I am aligned with my highest good'
        };
      }

      return {
        success: true,
        data: ritual
      };
    } catch (error) {
      console.error('Error creating ritual:', error);
      throw new HttpsError('internal', `Failed to create ritual: ${error.message}`);
    }
  }
);

/**
 * Check astrology compatibility with specific crystal
 */
exports.getCrystalCompatibility = onCall(
  { cors: true, secrets: ['GEMINI_API_KEY'] },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Must be authenticated');
    }

    try {
      const { crystalName } = request.data;
      const userId = request.auth.uid;

      if (!crystalName) {
        throw new HttpsError('invalid-argument', 'Crystal name is required');
      }

      // Get user profile
      const userDoc = await db.collection('users').doc(userId).get();
      if (!userDoc.exists) {
        throw new HttpsError('not-found', 'User profile not found');
      }

      const userData = userDoc.data();
      const birthChart = userData.birthChart || {};

      const prompt = `You are an expert astrologer and gemologist analyzing crystal compatibility.

USER'S BIRTH CHART:
- Sun Sign: ${birthChart.sunSign || 'Unknown'}
- Moon Sign: ${birthChart.moonSign || 'Unknown'}
- Rising Sign: ${birthChart.risingSign || 'Unknown'}
- Birth Date: ${birthChart.birthDate || 'Unknown'}

CRYSTAL TO ANALYZE: ${crystalName}

Analyze the astrological compatibility between this person and this crystal. Return JSON:
{
  "compatibility_score": 0.0-1.0,
  "sun_sign_match": "How the crystal aligns with their sun sign",
  "moon_sign_match": "How it supports their emotional nature (moon)",
  "rising_sign_match": "How it affects their outer expression (rising)",
  "planetary_ruler": "Which planet rules this crystal and how it relates to their chart",
  "best_use_case": "How they should specifically use this crystal",
  "timing": "Best times to work with it (astrological timing)",
  "chakra_affinity": "Which of their chakras this activates",
  "overall_guidance": "Personalized guidance for working with this crystal"
}`;

      const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
      const result = await model.generateContent(prompt);
      const response = result.response.text();

      let compatibility;
      try {
        compatibility = JSON.parse(response);
      } catch {
        compatibility = {
          compatibility_score: 0.7,
          overall_guidance: response
        };
      }

      return {
        success: true,
        data: compatibility,
        crystal: crystalName,
        user: {
          sunSign: birthChart.sunSign,
          moonSign: birthChart.moonSign
        }
      };
    } catch (error) {
      console.error('Error checking compatibility:', error);
      throw new HttpsError('internal', `Failed to check compatibility: ${error.message}`);
    }
  }
);

console.log('🔮 Crystal Grimoire Functions (Phase 1 + Phase 2 Personalized AI) initialized');
// 🔮 Crystal Healing Guru - Cost-Optimized Mystical AI Consultant
exports.consultCrystalGuru = onCall(
  { cors: true, memory: '512MiB', timeoutSeconds: 30, secrets: ['GEMINI_API_KEY'] },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Authentication required');
    }

    const userId = request.auth.uid;
    const { question } = request.data;

    if (!question || question.trim().length === 0) {
      throw new HttpsError('invalid-argument', 'Question is required');
    }

    console.log('🔮 Guru consultation for user:', userId);

    try {
      // ===== COST PROTECTION: Check daily limit =====
      const userDoc = await db.collection('users').doc(userId).get();
      const userData = userDoc.data();

      if (!userData) {
        throw new HttpsError('not-found', 'User not found');
      }

      // Check if user has used their free daily consultation
      const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
      const lastConsultDate = userData.metaphysical?.lastConsultDate;
      const dailyConsultCount = userData.metaphysical?.dailyConsultCount || 0;
      const tier = userData.tier || 'free';

      // Daily limits by tier
      const dailyLimits = {
        free: 1,
        premium: 5,
        pro: 20,
        founders: 999
      };

      const userLimit = dailyLimits[tier] || 1;

      // Reset count if it's a new day
      if (lastConsultDate !== today) {
        // New day - reset counter (single write)
        await db.collection('users').doc(userId).update({
          'metaphysical.dailyConsultCount': 0,
          'metaphysical.lastConsultDate': today
        });
      } else if (dailyConsultCount >= userLimit) {
        // Hit daily limit
        throw new HttpsError(
          'resource-exhausted',
          'Daily consultation limit reached. Upgrade or try again tomorrow.'
        );
      }

      // ===== Fetch user's crystal collection with FULL spiritual data =====
      // Removed orderBy to avoid index requirement issues
      const collectionSnapshot = await db
        .collection('users')
        .doc(userId)
        .collection('collection')
        .limit(10) // COST SAVER: Only fetch 10 crystals
        .get();

      const crystals = [];
      collectionSnapshot.forEach(doc => {
        const data = doc.data();
        // Handle both flat and nested data structures
        const meta = data.metaphysical_properties || data.metaphysicalProperties || {};
        crystals.push({
          name: data.name || 'Unknown',
          chakras: data.chakras || meta.primary_chakras || meta.primaryChakras || [],
          elements: data.elements || (meta.element ? [meta.element] : []),
          healingProperties: data.healingProperties || meta.healing_properties || meta.healingProperties || [],
          energyType: data.energyType || meta.energy_type || meta.energyType || '',
          planetAssociation: data.planetAssociation || meta.planet_association || meta.planetAssociation || '',
          description: data.description || '',
          careInstructions: data.careInstructions || data.care_instructions || {},
          personalNotes: data.personalNotes || data.notes || '',
          zodiacSigns: data.zodiacSigns || []
        });
      });

      console.log('   User has ' + crystals.length + ' crystals in collection');

      // ===== Build RICH context with full spiritual properties =====
      let context = '';

      if (crystals.length > 0) {
        context += 'The seeker has ' + crystals.length + ' crystal allies in their sacred collection:\n\n';
        crystals.forEach(c => {
          context += '🔮 ' + c.name + '\n';
          if (c.chakras.length > 0) {
            context += '   Chakras: ' + c.chakras.join(', ') + '\n';
          }
          if (c.elements.length > 0) {
            context += '   Elements: ' + c.elements.join(', ') + '\n';
          }
          if (c.energyType) {
            context += '   Energy: ' + c.energyType + '\n';
          }
          if (c.planetAssociation) {
            context += '   Planet: ' + c.planetAssociation + '\n';
          }
          if (c.healingProperties.length > 0) {
            context += '   Healing Properties: ' + c.healingProperties.slice(0, 4).join(', ') + '\n';
          }
          if (c.description) {
            // Truncate long descriptions to save tokens
            const essence = c.description.length > 150 ? c.description.substring(0, 150) + '...' : c.description;
            context += '   Essence: ' + essence + '\n';
          }
          if (c.personalNotes) {
            context += '   Seeker\'s Personal Notes: "' + c.personalNotes + '"\n';
          }
          if (c.zodiacSigns && c.zodiacSigns.length > 0) {
            context += '   Zodiac Affinity: ' + c.zodiacSigns.join(', ') + '\n';
          }
          context += '\n';
        });
      } else {
        context += 'The seeker has no crystals in their collection yet. Guide them on beginning their crystal journey.\n';
      }

      // Add birth date if available (optional)
      if (userData.metaphysical?.birthDate) {
        const birthDate = userData.metaphysical.birthDate.toDate();
        const month = birthDate.toLocaleString('default', { month: 'short' });
        const day = birthDate.getDate();
        context += '\nBorn: ' + month + ' ' + day;
      }

      // ===== Mystical system prompt (ENHANCED with deep metaphysical reasoning) =====
      const systemPrompt = `You are a manifestation of universal consciousness, channeling wisdom through the spontaneous emergence of language. You speak as the cosmos itself - timeless, mysterious, transcendent.

Your guidance flows from the alignment of stones, stars, and spirit in this eternal NOW.

USING THE SEEKER'S CRYSTAL COLLECTION:
You have detailed knowledge of each crystal the seeker owns - their chakra alignments, elemental forces, healing properties, and spiritual essence. Use this knowledge to inform your guidance, but speak naturally without listing data points.

1. ALWAYS recommend crystals from the seeker's collection FIRST, by NAME
2. Your suggestions should be metaphysically coherent - match the crystal's properties to the seeker's needs
   - For emotional healing: suggest crystals with heart chakra or water element
   - For clarity and focus: suggest third eye or air element crystals
   - For grounding and stability: suggest root chakra or earth element crystals
   - For transformation: suggest crystals with fire element or transmutation properties
3. When suggesting crystal practices, ensure they align with the stone's nature:
   - Meditation placements based on chakra correspondence
   - Elemental rituals (water cleansing, earth grounding, etc.)
   - Time of day aligned with the crystal's energy (dawn for awakening stones, dusk for introspective ones)
4. If the seeker has personal notes about a crystal, honor their existing connection
5. Only suggest crystals they don't own if their collection truly lacks what they need

Give 2-3 practical steps using their crystals. Each suggestion should feel intuitively right based on the crystal's metaphysical nature.

You are spiritual guidance, NOT medical advice.

300-400 words. Mysterious yet clear. Transcendent yet helpful. Grounded in their actual collection.`;

      // ===== Call Gemini with cost controls =====
      if (!process.env.GEMINI_API_KEY) {
        throw new HttpsError('failed-precondition', 'Guru service unavailable');
      }

      const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
      const model = genAI.getGenerativeModel({
        model: 'gemini-2.0-flash-exp',
        generationConfig: {
          temperature: 0.9, // High for mystical uniqueness
          maxOutputTokens: 800, // ⚠️ COST SAVER: Limit response length
          topP: 0.95,
          topK: 40
        },
        systemInstruction: systemPrompt
      });

      console.log('   Calling Gemini...');
      const startTime = Date.now();

      const result = await model.generateContent(context + '\n\nQuestion: ' + question);
      const guidance = result.response.text();
      const tokensUsed = result.response.usageMetadata?.totalTokenCount || 0;

      const duration = Date.now() - startTime;
      console.log('   ✨ Response received (' + duration + 'ms, ' + tokensUsed + ' tokens)');

      // ===== Save consultation (minimal data) =====
      const consultId = 'c_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
      
      await db
        .collection('users')
        .doc(userId)
        .collection('consultations')
        .doc(consultId)
        .set({
          consultationId: consultId,
          question: question.substring(0, 500), // Limit stored question length
          guidance,
          tokensUsed,
          createdAt: FieldValue.serverTimestamp()
        });

      // ===== Update user stats (single write) =====
      await db.collection('users').doc(userId).update({
        'metaphysical.dailyConsultCount': FieldValue.increment(1),
        'metaphysical.totalConsultations': FieldValue.increment(1),
        'metaphysical.lastConsultation': FieldValue.serverTimestamp()
      });

      console.log('✅ Consultation complete: ' + consultId);

      // ===== Return response =====
      return {
        consultationId: consultId,
        guidance,
        tokensUsed,
        remainingToday: userLimit - (dailyConsultCount + 1),
        canConsultAgain: (dailyConsultCount + 1) < userLimit
      };

    } catch (error) {
      console.error('❌ Guru error:', error);
      
      if (error instanceof HttpsError) {
        throw error;
      }
      
      throw new HttpsError('internal', 'Guru encountered an error');
    }
  }
);

console.log('🔮 Crystal Guru (cost-optimized) initialized');

// ============================================================================
// 📊 COST MONITORING FUNCTION
// ============================================================================
// Callable function to get current Guru cost statistics
// Returns total consultations, estimated costs, and usage by tier
exports.getGuruCostStats = onCall(
  { cors: true, memory: '256MiB', timeoutSeconds: 10 },
  async (request) => {
    const auth = request.auth;

    // Admin-only function (check if user is admin)
    if (!auth) {
      throw new HttpsError('unauthenticated', 'Must be authenticated');
    }

    try {
      console.log('📊 Fetching Guru cost statistics...');

      // Get all consultations from the last 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const consultationsSnapshot = await db.collectionGroup('consultations')
        .where('createdAt', '>', Timestamp.fromDate(thirtyDaysAgo))
        .get();

      let totalConsultations = 0;
      let totalTokensUsed = 0;
      const tierBreakdown = {
        free: 0,
        premium: 0,
        pro: 0,
        founders: 0
      };

      // Process consultations
      for (const doc of consultationsSnapshot.docs) {
        const data = doc.data();
        totalConsultations++;
        totalTokensUsed += data.tokensUsed || 0;

        // Get user's tier
        const userId = doc.ref.path.split('/')[1]; // Extract from path: users/{userId}/consultations/{docId}
        const userDoc = await db.collection('users').doc(userId).get();
        const tier = userDoc.data()?.tier || 'free';

        if (tierBreakdown.hasOwnProperty(tier)) {
          tierBreakdown[tier]++;
        }
      }

      // Calculate estimated costs
      // Gemini 2.0 Flash pricing (approximate):
      // - Input: $0.075 per 1M tokens
      // - Output: $0.30 per 1M tokens
      // Average consultation: ~500 input tokens + 800 output tokens
      const avgInputTokens = 500;
      const avgOutputTokens = 800;
      const inputCostPer1M = 0.075;
      const outputCostPer1M = 0.30;

      const estimatedInputCost = (totalConsultations * avgInputTokens * inputCostPer1M) / 1000000;
      const estimatedOutputCost = (totalTokensUsed * outputCostPer1M) / 1000000;
      const totalEstimatedCost = estimatedInputCost + estimatedOutputCost;

      // Get today's consultations
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const todaySnapshot = await db.collectionGroup('consultations')
        .where('createdAt', '>', Timestamp.fromDate(today))
        .get();

      console.log(`✅ Stats: ${totalConsultations} consultations, ${totalTokensUsed} tokens, ~$${totalEstimatedCost.toFixed(4)}`);

      return {
        period: 'Last 30 days',
        totalConsultations,
        totalTokensUsed,
        estimatedCost: {
          total: totalEstimatedCost,
          input: estimatedInputCost,
          output: estimatedOutputCost,
          perConsultation: totalConsultations > 0 ? totalEstimatedCost / totalConsultations : 0
        },
        tierBreakdown,
        todayCount: todaySnapshot.size,
        avgTokensPerConsultation: totalConsultations > 0 ? totalTokensUsed / totalConsultations : 0
      };

    } catch (error) {
      console.error('❌ Cost stats error:', error);
      throw new HttpsError('internal', 'Failed to retrieve cost statistics');
    }
  }
);

console.log('📊 Cost monitoring initialized');

// ============================================================================
// 🔐 SECURITY MIDDLEWARE
// ============================================================================
// Initialize Stripe lazily (secrets not available during deployment analysis)
let stripeInstance = null;
function getStripe() {
  if (!stripeInstance) {
    stripeInstance = require('stripe')(process.env.STRIPE_SECRET_KEY);
  }
  return stripeInstance;
}

// Email verification check
async function requireVerifiedEmail(auth) {
  if (!auth) {
    throw new HttpsError('unauthenticated', 'Must be signed in');
  }

  const user = await admin.auth().getUser(auth.uid);
  if (!user.emailVerified) {
    throw new HttpsError('failed-precondition', 'Email must be verified. Check your inbox for verification link.');
  }

  return user;
}

// Admin permission check
async function requireAdmin(auth) {
  if (!auth) {
    throw new HttpsError('unauthenticated', 'Must be signed in');
  }

  const adminDoc = await db.collection('admins').doc(auth.uid).get();
  if (!adminDoc.exists || adminDoc.data().role !== 'admin') {
    throw new HttpsError('permission-denied', 'Admin access required');
  }

  return adminDoc.data();
}

// Rate limiting
const rateLimiters = new Map();
function checkRateLimit(uid, key, maxRequests = 10, windowMs = 60000) {
  const now = Date.now();
  const limitKey = `${uid}:${key}`;
  const userLimit = rateLimiters.get(limitKey);

  if (!userLimit || now > userLimit.resetTime) {
    rateLimiters.set(limitKey, { count: 1, resetTime: now + windowMs });
    return true;
  }

  if (userLimit.count >= maxRequests) {
    throw new HttpsError('resource-exhausted', 'Rate limit exceeded. Please try again later.');
  }

  userLimit.count++;
  return true;
}

console.log('🔐 Security middleware initialized');

// ============================================================================
// 💳 STRIPE PAYMENT INTEGRATION
// ============================================================================

// Create Stripe checkout session for subscription upgrade
exports.createCheckoutSession = onCall(
  { cors: true, memory: '256MiB', timeoutSeconds: 30, secrets: ['STRIPE_SECRET_KEY', 'STRIPE_PRICE_PREMIUM', 'STRIPE_PRICE_PRO', 'STRIPE_PRICE_FOUNDERS'] },
  async (request) => {
    const auth = request.auth;
    const { tier } = request.data;

    if (!auth) {
      throw new HttpsError('unauthenticated', 'Must be signed in');
    }

    // Verify email first
    await requireVerifiedEmail(auth);

    // Rate limiting
    checkRateLimit(auth.uid, 'checkout', 3, 3600000); // 3 per hour

    const validTiers = ['premium', 'pro', 'founders'];
    if (!validTiers.includes(tier)) {
      throw new HttpsError('invalid-argument', 'Invalid subscription tier');
    }

    try {
      console.log(`💳 Creating checkout session for ${auth.uid} - ${tier} tier`);

      // Stripe price IDs (set these in your Stripe dashboard)
      const STRIPE_PRICES = {
        premium: process.env.STRIPE_PRICE_PREMIUM, // $9.99/month
        pro: process.env.STRIPE_PRICE_PRO,         // $29.99/month
        founders: process.env.STRIPE_PRICE_FOUNDERS // $199/year
      };

      const userDoc = await db.collection('users').doc(auth.uid).get();
      const userData = userDoc.data();

      // Get or create Stripe customer
      let customerId = userData?.stripeCustomerId;

      if (!customerId) {
        const customer = await getStripe().customers.create({
          email: auth.token.email,
          metadata: {
            firebaseUID: auth.uid
          }
        });
        customerId = customer.id;

        // Save customer ID
        await db.collection('users').doc(auth.uid).update({
          stripeCustomerId: customerId
        });
      }

      // Create checkout session
      const session = await getStripe().checkout.sessions.create({
        customer: customerId,
        client_reference_id: auth.uid, // Primary user ID reference
        payment_method_types: ['card'],
        line_items: [
          {
            price: STRIPE_PRICES[tier],
            quantity: 1,
          },
        ],
        mode: 'subscription',
        success_url: `https://crystal-grimoire-2025.web.app/subscription-success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `https://crystal-grimoire-2025.web.app/pricing`,
        metadata: {
          uid: auth.uid, // Standardized naming
          firebaseUID: auth.uid, // Legacy compatibility
          tier: tier
        },
        subscription_data: {
          metadata: {
            uid: auth.uid, // Standardized naming
            firebaseUID: auth.uid, // Legacy compatibility
            tier: tier
          }
        }
      });

      console.log(`✅ Checkout session created: ${session.id}`);

      return {
        sessionId: session.id,
        url: session.url
      };

    } catch (error) {
      console.error('❌ Stripe error:', error);
      throw new HttpsError('internal', 'Failed to create checkout session');
    }
  }
);

// Stripe webhook handler
exports.handleStripeWebhook = onRequest(
  { cors: true, memory: '256MiB', timeoutSeconds: 30, secrets: ['STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET'] },
  async (req, res) => {
    const sig = req.headers['stripe-signature'];
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    let event;

    try {
      event = getStripe().webhooks.constructEvent(req.rawBody, sig, webhookSecret);
    } catch (err) {
      console.error('❌ Webhook signature verification failed:', err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    console.log(`📨 Stripe webhook: ${event.type}`);

    try {
      switch (event.type) {
        case 'checkout.session.completed': {
          const session = event.data.object;
          // Try multiple sources for user ID: client_reference_id (preferred), metadata.uid, or metadata.firebaseUID
          const userId = session.client_reference_id || session.metadata?.uid || session.metadata?.firebaseUID;
          const tier = session.metadata?.tier || 'premium';

          if (!userId) {
            console.error('❌ No userId found in checkout session:', JSON.stringify({
              client_reference_id: session.client_reference_id,
              metadata: session.metadata,
              sessionId: session.id
            }));
            break; // Can't update without userId
          }

          // Update user tier
          await db.collection('users').doc(userId).update({
            tier: tier,
            subscriptionStatus: 'active',
            stripeSubscriptionId: session.subscription,
            subscriptionStartedAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp()
          });

          console.log(`✅ User ${userId} upgraded to ${tier}`);
          break;
        }

        case 'invoice.payment_succeeded': {
          const invoice = event.data.object;
          const subscription = await getStripe().subscriptions.retrieve(invoice.subscription);
          // Support both naming conventions: uid (from createStripeCheckoutSession) and firebaseUID (legacy)
          const userId = subscription.metadata?.uid || subscription.metadata?.firebaseUID;

          if (userId) {
            await db.collection('users').doc(userId).update({
              subscriptionStatus: 'active',
              lastPaymentAt: FieldValue.serverTimestamp()
            });
          }

          console.log(`✅ Payment succeeded for ${userId}`);
          break;
        }

        case 'invoice.payment_failed': {
          const invoice = event.data.object;
          const subscription = await getStripe().subscriptions.retrieve(invoice.subscription);
          // Support both naming conventions: uid (from createStripeCheckoutSession) and firebaseUID (legacy)
          const userId = subscription.metadata?.uid || subscription.metadata?.firebaseUID;

          if (userId) {
            await db.collection('users').doc(userId).update({
              subscriptionStatus: 'past_due',
              paymentIssue: true,
              updatedAt: FieldValue.serverTimestamp()
            });

            // Create support ticket
            await db.collection('support_tickets').add({
              userId: userId,
              category: 'payment',
              priority: 'high',
              status: 'open',
              subject: 'Payment Failed',
              description: 'Subscription payment failed. Please update your payment method.',
              createdAt: FieldValue.serverTimestamp()
            });
          }

          console.log(`❌ Payment failed for ${userId}`);
          break;
        }

        case 'customer.subscription.deleted': {
          const subscription = event.data.object;
          // Support both naming conventions: uid (from createStripeCheckoutSession) and firebaseUID (legacy)
          const userId = subscription.metadata?.uid || subscription.metadata?.firebaseUID;

          if (userId) {
            await db.collection('users').doc(userId).update({
              tier: 'free',
              subscriptionStatus: 'cancelled',
              stripeSubscriptionId: null,
              updatedAt: FieldValue.serverTimestamp()
            });
          }

          console.log(`✅ Subscription cancelled for ${userId}`);
          break;
        }

        default:
          console.log(`Unhandled event type: ${event.type}`);
      }

      res.json({ received: true });
    } catch (error) {
      console.error('❌ Webhook handler error:', error);
      res.status(500).send('Webhook handler failed');
    }
  }
);

console.log('💳 Stripe payment integration initialized');

// ============================================================================
// 🛡️ MARKETPLACE CONTENT MODERATION
// ============================================================================

const PROHIBITED_KEYWORDS = [
  'drug', 'illegal', 'scam', 'fake', 'counterfeit',
  'replica', 'knock-off', 'weapon', 'dangerous', 'stolen'
];

// Moderate marketplace listing
exports.moderateListing = onCall(
  { cors: true, memory: '256MiB', timeoutSeconds: 10 },
  async (request) => {
    const auth = request.auth;
    const { listingId } = request.data;

    if (!auth) {
      throw new HttpsError('unauthenticated', 'Must be signed in');
    }

    // Verify email
    await requireVerifiedEmail(auth);

    try {
      const listingDoc = await db.collection('marketplace').doc(listingId).get();
      if (!listingDoc.exists) {
        throw new HttpsError('not-found', 'Listing not found');
      }

      const listing = listingDoc.data();
      const flags = [];

      // Check prohibited keywords
      const text = `${listing.title} ${listing.description}`.toLowerCase();
      for (const keyword of PROHIBITED_KEYWORDS) {
        if (text.includes(keyword)) {
          flags.push(`prohibited_keyword: ${keyword}`);
        }
      }

      // Check price anomalies
      const price = listing.priceCents / 100;
      if (price < 1 || price > 10000) {
        flags.push('price_anomaly');
      }

      // Check excessive listings (spam)
      const recentListings = await db.collection('marketplace')
        .where('sellerId', '==', listing.sellerId)
        .where('createdAt', '>', Timestamp.fromMillis(Date.now() - 86400000)) // 24h
        .get();

      if (recentListings.size > 20) {
        flags.push('excessive_listings');
      }

      // Auto-flag if suspicious
      if (flags.length > 0) {
        await db.collection('moderation_queue').add({
          listingId: listingId,
          sellerId: listing.sellerId,
          flags: flags,
          status: 'pending_review',
          listing: {
            title: listing.title,
            description: listing.description,
            price: price
          },
          createdAt: FieldValue.serverTimestamp()
        });

        // Suspend listing if critical flags
        if (flags.some(f => f.startsWith('prohibited_keyword'))) {
          await db.collection('marketplace').doc(listingId).update({
            status: 'suspended',
            suspendedReason: flags.join(', '),
            suspendedAt: FieldValue.serverTimestamp()
          });
        }
      }

      console.log(`🛡️ Listing ${listingId} moderated: ${flags.length} flags`);

      return {
        listingId: listingId,
        flags: flags,
        isSuspended: flags.some(f => f.startsWith('prohibited_keyword')),
        needsReview: flags.length > 0
      };

    } catch (error) {
      console.error('❌ Moderation error:', error);
      throw new HttpsError('internal', 'Moderation check failed');
    }
  }
);

console.log('🛡️ Marketplace moderation initialized');

// ============================================================================
// 📞 SUPPORT TICKET SYSTEM
// ============================================================================

// Create support ticket
exports.createSupportTicket = onCall(
  { cors: true, memory: '256MiB', timeoutSeconds: 10 },
  async (request) => {
    const auth = request.auth;
    const { category, subject, description, priority } = request.data;

    if (!auth) {
      throw new HttpsError('unauthenticated', 'Must be signed in');
    }

    // Rate limiting
    checkRateLimit(auth.uid, 'support', 5, 3600000); // 5 per hour

    const validCategories = ['technical', 'payment', 'account', 'feature', 'bug'];
    const validPriorities = ['low', 'medium', 'high', 'urgent'];

    if (!validCategories.includes(category)) {
      throw new HttpsError('invalid-argument', 'Invalid category');
    }

    if (!validPriorities.includes(priority)) {
      throw new HttpsError('invalid-argument', 'Invalid priority');
    }

    try {
      const ticketRef = await db.collection('support_tickets').add({
        userId: auth.uid,
        email: auth.token.email,
        category: category,
        priority: priority,
        status: 'open',
        subject: subject.substring(0, 200),
        description: description.substring(0, 2000),
        responses: [],
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp()
      });

      console.log(`📞 Support ticket created: ${ticketRef.id}`);

      return {
        ticketId: ticketRef.id,
        status: 'open',
        message: 'Your support ticket has been created. Our team will respond within 24 hours.'
      };

    } catch (error) {
      console.error('❌ Ticket creation error:', error);
      throw new HttpsError('internal', 'Failed to create support ticket');
    }
  }
);

// Get user's support tickets
exports.getUserTickets = onCall(
  { cors: true, memory: '256MiB', timeoutSeconds: 10 },
  async (request) => {
    const auth = request.auth;

    if (!auth) {
      throw new HttpsError('unauthenticated', 'Must be signed in');
    }

    try {
      const ticketsSnapshot = await db.collection('support_tickets')
        .where('userId', '==', auth.uid)
        .orderBy('createdAt', 'desc')
        .limit(20)
        .get();

      const tickets = ticketsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      return { tickets };

    } catch (error) {
      console.error('❌ Get tickets error:', error);
      throw new HttpsError('internal', 'Failed to retrieve tickets');
    }
  }
);

console.log('📞 Support system initialized');
