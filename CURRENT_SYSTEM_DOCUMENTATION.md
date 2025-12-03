# 🔮 Crystal Grimoire - Complete System Documentation

**Generated**: 2025-11-16
**Project**: Crystal Grimoire V3 - AI-Powered Crystal Identification & Spiritual Platform
**Status**: Production Deployed ✅

---

## 🌐 **Live Deployment URLs**

- **Web App**: https://crystal-grimoire-2025.web.app
- **Firebase Console**: https://console.firebase.google.com/project/crystal-grimoire-2025/overview
- **Project ID**: `crystal-grimoire-2025`

---

## 📊 **User Profile System**

### **UserProfile Model** (`lib/models/user_profile_model.dart`)

**Core Fields**:
```dart
- uid: String                    // Firebase Auth user ID
- email: String                  // User email
- displayName: String            // Display name (default: "Crystal Seeker")
- photoUrl: String?              // Profile photo URL
- createdAt: DateTime            // Account creation date
- lastActive: DateTime           // Last activity timestamp
```

**Subscription & Credits**:
```dart
- subscriptionTier: String       // 'free', 'premium', 'pro', 'founders'
- dailyCredits: int             // Daily identification credits (default: 3)
- totalCredits: int             // Total bonus credits (default: 0)
```

**Personal Data**:
```dart
- birthChart: Map<String, dynamic>  // Astrological birth chart data
  ├── birthDate: Timestamp          // User's birth date
  ├── sunSign: String               // Sun sign
  ├── moonSign: String              // Moon sign
  └── risingSign: String            // Rising/Ascendant sign

- preferences: Map<String, dynamic> // User preferences
  ├── theme: 'dark' | 'light'
  ├── notifications: bool
  ├── dailyCrystal: bool
  ├── moonPhaseAlerts: bool
  ├── healingReminders: bool
  ├── meditationMusic: bool
  └── autoSaveJournal: bool
```

**Collections & Stats**:
```dart
- favoriteCategories: List<String>  // Favorite crystal categories
- ownedCrystalIds: List<String>     // IDs of crystals user owns
- stats: Map<String, dynamic>       // User activity statistics
  ├── crystalsIdentified: int       // Total crystals identified
  ├── collectionsSize: int          // Size of crystal collection
  ├── healingSessions: int          // Healing sessions completed
  ├── meditationMinutes: int        // Total meditation time
  ├── journalEntries: int           // Journal entries created
  ├── ritualsCompleted: int         // Rituals completed
  ├── daysActive: int               // Days active on platform
  └── achievementsUnlocked: List    // Achievement IDs
```

**Feature Access** (Subscription-Based):
- ✅ `crystalId` - Crystal identification (all users with credits)
- ✅ `unlimitedId` - Unlimited identifications (premium+)
- ✅ `advancedHealing` - Advanced healing features (premium+)
- ✅ `personalizedRituals` - Personalized rituals (premium+)
- ✅ `marketplace` - Crystal marketplace (all users)
- ✅ `dreamAnalysis` - Dream journal analysis (premium+)
- ✅ `soundBathPremium` - Premium sound baths (premium+)
- ✅ `downloadContent` - Download content (pro+)

---

## 🗄️ **Firestore Database Structure**

### **Root Collections**:

1. **`users/`** - User profiles
   - Document ID: Firebase Auth UID
   - Contains: UserProfile data (see above)

2. **`users/{userId}/identifications/`** - Crystal identification history
   - Contains: AI identification results with images

3. **`users/{userId}/dreams/`** - Dream journal entries
   - Contains: Dream content + AI analysis

4. **`marketplace/`** - Crystal marketplace listings
   - Status: 'active', 'sold', 'removed'
   - Contains: Crystal listings from users

5. **`crystals/`** - Global crystal database
   - Reference database of crystal types

6. **`guidance_sessions/`** - AI guidance history
   - Contains: Questions + AI spiritual guidance responses

7. **`journal/`** - User journal entries
   - Personal crystal journey documentation

8. **`transactions/`** - Stripe payment transactions
   - Subscription purchases and upgrades

9. **`usage/`** - API usage tracking
   - Tracks function calls and costs

10. **`notifications/`** - User notifications
    - System and personalized notifications

11. **`user_stats/`** - Aggregated user statistics
    - Analytics and usage patterns

12. **`economy/`** - Platform economy data
    - Marketplace transactions, pricing

13. **`error_logs/`** - System error logs
    - Debugging and monitoring

---

## ☁️ **Cloud Functions Backend**

**Deployed Functions** (12 total):

### **1. healthCheck**
- **Type**: Callable (Public)
- **Purpose**: Backend health monitoring
- **Response**:
  ```json
  {
    "status": "healthy",
    "version": "2.0.0",
    "services": {
      "firestore": "connected",
      "gemini": true,
      "auth": "enabled"
    }
  }
  ```

### **2. identifyCrystal**
- **Type**: Callable (Authenticated)
- **AI Model**: gemini-1.5-flash (cost-optimized)
- **Input**:
  ```javascript
  { imageData: base64String }
  ```
- **Output**:
  ```javascript
  {
    identification: { name, variety, confidence },
    description: string,
    metaphysical_properties: {
      healing_properties,
      primary_chakras,
      energy_type,
      element
    },
    care_instructions: { cleansing, charging, storage }
  }
  ```
- **Saves To**: `users/{userId}/identifications/`

### **3. getCrystalGuidance**
- **Type**: Callable (Authenticated)
- **AI Model**: gemini-1.5-flash
- **Input**:
  ```javascript
  { question, intentions, experience }
  ```
- **Output**:
  ```javascript
  {
    recommended_crystals: [{ name, reason, how_to_use }],
    guidance: string,
    affirmation: string,
    meditation_tip: string
  }
  ```
- **Saves To**: `guidance_sessions/`

### **4. analyzeDream**
- **Type**: Callable (Authenticated)
- **AI Model**: gemini-1.5-flash
- **Input**:
  ```javascript
  {
    dreamContent,
    userCrystals,
    dreamDate,
    mood,
    moonPhase
  }
  ```
- **Output**:
  ```javascript
  {
    analysis: string,
    crystalSuggestions: [{ name, reason, usage }],
    affirmation: string,
    entryId: string
  }
  ```
- **Saves To**: `users/{userId}/dreams/`

### **5. getDailyCrystal**
- **Type**: Callable (Public)
- **Purpose**: Daily crystal recommendation
- **Output**: Same crystal for all users each day (rotates through 6 crystals)
- **Crystals**: Clear Quartz, Amethyst, Rose Quartz, Black Tourmaline, Citrine, Selenite

### **6. createUserDocument**
- **Type**: Firestore Trigger
- **Trigger**: `onCreate('users/{userId}')`
- **Purpose**: Initialize new user profile with default data

### **7. updateUserProfile**
- **Type**: Callable (Authenticated)
- **Allowed Fields**: displayName, photoURL, settings, birthChart, preferences, location, experience
- **Updates**: `users/{userId}`

### **8. getUserProfile**
- **Type**: Callable (Authenticated)
- **Returns**: User profile data (sanitized - removes adminFlags, internalNotes)

### **9. deleteUserAccount**
- **Type**: Callable (Authenticated)
- **Deletes**: User profile + all subcollections (identifications, dreams, etc.)

### **10. trackUsage**
- **Type**: Callable (Authenticated)
- **Purpose**: Track API usage and costs
- **Saves To**: `usage/` collection

### **11. createStripeCheckoutSession**
- **Type**: Callable (Authenticated)
- **Purpose**: Create Stripe payment session for subscriptions
- **Tiers**: Premium, Pro, Founders

### **12. finalizeStripeCheckoutSession**
- **Type**: Callable (Authenticated)
- **Purpose**: Complete subscription after successful payment
- **Updates**: User subscriptionTier and credits

---

## 🎨 **Flutter App Features**

### **Main Screens**:

1. **Home Screen** (`home_screen.dart`)
   - Dashboard with quick access to features
   - Daily crystal recommendation
   - Recent identifications

2. **Crystal Identification Screen** (`crystal_identification_screen.dart`)
   - Upload crystal photos
   - AI-powered identification
   - Save to collection

3. **Marketplace Screen** (`marketplace_screen.dart`)
   - Browse crystal listings
   - Buy/Sell crystals
   - User marketplace profiles
   - Categories: Raw, Tumbled, Clusters, Jewelry, Rare

4. **Profile Screen** (`profile_screen.dart`)
   - User profile management
   - Birth chart settings
   - Preferences configuration
   - Subscription status
   - Statistics display

5. **Subscription Screen** (`subscription_screen.dart`)
   - Stripe integration
   - Tier comparison
   - Payment processing

### **Services**:

1. **AIService** (`ai_service.dart`)
   - Direct Gemini API integration (currently active)
   - Model: gemini-1.5-flash

2. **CrystalService** (`crystal_service.dart`)
   - Calls Cloud Functions for crystal identification
   - Manages identification state

3. **FirebaseFunctionsService** (`firebase_functions_service.dart`)
   - Wrapper for Firebase Cloud Functions
   - Methods: identifyCrystal, getMoonPhase, getMoonRitual, createDreamEntry

4. **BackendService** (`backend_service.dart`)
   - REST API integration (legacy/alternative)
   - Multipart image uploads

5. **StripeService** (`stripe_service.dart`)
   - Payment processing
   - Subscription management

---

## 💎 **Crystal Collection System**

### **How It Works**:

1. User identifies crystal via photo → AI analyzes → Result saved to `users/{userId}/identifications/`
2. User can add to personal collection → Crystal ID added to `ownedCrystalIds` array
3. User can list crystals on marketplace → Listed in `marketplace/` collection
4. Marketplace listings include: seller info, price, condition, images

### **Data Flow**:
```
User Photo Upload
  ↓
Cloud Function: identifyCrystal
  ↓
Gemini 1.5 Flash API
  ↓
AI Analysis Result
  ↓
Saved to Firestore: users/{userId}/identifications/{id}
  ↓
User adds to collection
  ↓
Updated: users/{userId}.ownedCrystalIds[]
```

---

## 🌙 **Personalization Features**

### **What's Currently Stored**:
✅ Birth chart data (birthDate, sunSign, moonSign, risingSign)
✅ User preferences (theme, notifications, etc.)
✅ Owned crystal collection (ownedCrystalIds)
✅ User statistics (identifications, sessions, etc.)

### **What's NOT Being Used by AI Yet**:
❌ Birth chart for personalized crystal recommendations
❌ Owned crystals for avoiding duplicate suggestions
❌ Astrological compatibility with crystals
❌ User's spiritual journey history in guidance

---

## 🚀 **What's Missing / Needs to be Added**

### **Missing Cloud Functions**:

1. **getPersonalizedCrystalRecommendation**
   - Should use: birthChart + ownedCrystalIds + current moon phase
   - Should return: Crystals aligned with user's astrology

2. **analyzeCrystalCollection**
   - Should use: All user's ownedCrystalIds
   - Should return: Collection analysis, missing elements, chakra balance

3. **getPersonalizedDailyRitual**
   - Should use: birthChart + moonPhase + ownedCrystalIds
   - Should return: Custom daily ritual with user's own crystals

4. **addToCollection**
   - Should add crystal to ownedCrystalIds
   - Should update stats.collectionsSize

5. **removeFromCollection**
   - Should remove from ownedCrystalIds
   - Should update stats

6. **getCrystalCompatibility**
   - Should use: birthChart + specific crystal
   - Should return: Compatibility score and explanation

### **Frontend Features to Verify**:
- ❓ Birth chart input working?
- ❓ Marketplace buy/sell functional?
- ❓ Dream journal saves correctly?
- ❓ Collection management UI exists?

---

## 💰 **Cost Optimization**

**Current AI Costs**:
- Model: gemini-1.5-flash
- Cost per identification: ~$0.0002
- Cost per guidance: ~$0.0001
- **94% cheaper** than original gemini-2.5-pro implementation

**Original vs Current**:
- ❌ Old: gemini-2.5-pro ($0.003 per request)
- ✅ New: gemini-1.5-flash ($0.0002 per request)
- 💰 Savings: $2,800 per 100K requests

---

## 🔧 **Deployment Info**

**Last Deployed**: 2025-11-16
**Functions Deployed**: 12/12 successful
**Hosting Deployed**: ✅ Flutter web app live

**Environment Variables Required**:
```bash
GEMINI_API_KEY=<your-key>
STRIPE_SECRET_KEY=<your-key>
STRIPE_PREMIUM_PRICE_ID=<price-id>
STRIPE_PRO_PRICE_ID=<price-id>
STRIPE_FOUNDERS_PRICE_ID=<price-id>
```

**Deployment Command**:
```bash
FUNCTIONS_DISCOVERY_TIMEOUT=60000 firebase deploy --only functions
```

---

## 📱 **Subscription Tiers**

| Feature | Free | Premium | Pro | Founders |
|---------|------|---------|-----|----------|
| Daily ID Credits | 3 | Unlimited | Unlimited | Unlimited |
| Dream Analysis | ❌ | ✅ | ✅ | ✅ |
| Advanced Healing | ❌ | ✅ | ✅ | ✅ |
| Personalized Rituals | ❌ | ✅ | ✅ | ✅ |
| Marketplace Access | ✅ | ✅ | ✅ | ✅ |
| Download Content | ❌ | ❌ | ✅ | ✅ |
| Premium Sound Baths | ❌ | ✅ | ✅ | ✅ |

---

## 🎯 **Next Steps Recommendations**

1. **Add Personalized AI Functions** that use:
   - birthChart data
   - ownedCrystalIds
   - User history/stats

2. **Verify All Features Work**:
   - Test marketplace buy/sell
   - Test dream journal
   - Test birth chart input
   - Test collection management

3. **Add Collection Management Functions**:
   - Add crystal to collection
   - Remove from collection
   - Analyze collection balance
   - Get personalized recommendations based on what user already owns

4. **Enhanced Personalization**:
   - Moon phase integration
   - Astrological transits
   - Crystal-zodiac compatibility
   - Custom ritual generation

---

**🌟 A Paul Phillips Manifestation**

Generated on: 2025-11-16
