# 🔮 Crystal Healing Guru - Implementation Plan

**Vision**: Simple mystical AI that's the "universe speaking" through LLM randomness
**Cost Strategy**: Free 1x daily, premium unlimited, strict cost protections
**UX Goal**: Always accessible, overlay anywhere, saves to journal

---

## 💰 COST PROTECTIONS (Critical!)

### **Backend Safeguards**:
1. ✅ **Daily Limit Enforcement**
   - Free: 1 consultation/day
   - Premium: 5/day
   - Pro: 20/day
   - Founders: Unlimited

2. ✅ **Database Query Limits**
   - Only fetch 10 most recent crystals (not all)
   - Use `.limit(10)` on collection query
   - Single user document read per consultation

3. ✅ **Gemini API Limits**
   - Max 800 tokens output (not 2048)
   - Question truncated to 500 chars before storage
   - Temperature 0.9 (no expensive reasoning)

4. ✅ **Minimal Firestore Writes**
   - 2 writes per consultation (consultation doc + user stats)
   - No unnecessary subcollection reads
   - Batch updates where possible

### **Estimated Costs**:
```
Per consultation:
- Gemini API: ~$0.0005 (800 tokens @ gemini-2.0-flash-exp)
- Firestore: ~$0.000002 (2 writes + 2 reads)
Total: ~$0.0005 per consultation

Monthly (1000 free users, 1/day):
- 1000 users × 30 days × $0.0005 = $15/month
- Premium users (100 @ 5/day): $7.50/month
Total: ~$22.50/month for 1100 users
```

---

## 🎨 UI/UX DESIGN

### **1. Always-Visible Header Button**

**Location**: Top right of every screen (next to profile icon)

```
┌──────────────────────────────────┐
│  Crystal Grimoire    🔮  [Profile]│
│                                  │
│  [Main Content]                  │
└──────────────────────────────────┘
```

**Button Design**:
- Floating action button (FAB) style
- Glowing purple crystal icon 🔮
- Pulse animation when available
- Badge showing "1" if user has consultation left today
- Greyed out if daily limit reached

---

### **2. Birthday Prompt (Optional, Before First Use)**

**Trigger**: User clicks Guru button for first time WITHOUT birth date

**Dialog**:
```
╔════════════════════════════════════╗
║  🌟 Enhance Your Guidance          ║
║                                    ║
║  The cosmos speaks more clearly    ║
║  when aligned with your star sign. ║
║                                    ║
║  [Set Birth Date] (Optional)       ║
║  [Skip for Now]                    ║
╚════════════════════════════════════╝
```

**If they skip**: Never show again (set flag), Guru works without it
**If they set it**: Store in `users/{userId}/metaphysical/birthDate`

---

### **3. Consultation Overlay (Universal)**

**Opens anywhere in app** - floating modal that covers current screen

```
╔════════════════════════════════════╗
║  🔮 The Universe Speaks            ║
║                                [×] ║
║ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ ║
║                                    ║
║  What guidance do you seek,        ║
║  crystal seeker?                   ║
║                                    ║
║  ┌──────────────────────────────┐ ║
║  │ Ask your question...         │ ║
║  │                              │ ║
║  │ [Text area]                  │ ║
║  └──────────────────────────────┘ ║
║                                    ║
║  💎 Your crystals: Amethyst,       ║
║     Rose Quartz, Clear Quartz...   ║
║                                    ║
║  🌕 Moon Phase: Waxing Gibbous     ║
║                                    ║
║  Free consultations today: 1       ║
║                                    ║
║  [Channel Cosmic Wisdom] ✨        ║
╚════════════════════════════════════╝
```

**After submitting** (loading state):
```
╔════════════════════════════════════╗
║  🔮 Channeling Guidance...         ║
║                                    ║
║     [Pulsing crystal animation]    ║
║                                    ║
║  The universe aligns to answer     ║
║  your call...                      ║
╚════════════════════════════════════╝
```

**Guidance Display**:
```
╔════════════════════════════════════╗
║  🔮 Cosmic Guidance Received       ║
║                                [×] ║
║ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ ║
║                                    ║
║  [Mystical AI response here]       ║
║  [Formatted markdown]              ║
║  [References user's crystals]      ║
║  [2-3 practical steps]             ║
║                                    ║
║ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ ║
║                                    ║
║  [💾 Save to Journal]              ║
║  [🔄 Ask Follow-Up]                ║
║  [❌ Close]                         ║
╚════════════════════════════════════╝
```

**Save to Journal Action**:
- Creates entry in `users/{userId}/dreams/` (same structure as dream journal)
- Adds consultation to journal list
- Shows success snackbar: "Saved to your journal ✨"

---

### **4. Coming Soon Placeholders**

**In various screens, show upcoming specialized guides**:

**Moon Phase Screen**:
```
┌──────────────────────────────────┐
│  🌙 Moon Phase: Waxing Gibbous   │
│                                  │
│  [Current moon info]             │
│                                  │
│  ┌──────────────────────────┐   │
│  │ 🔮 Moon Ritual Expert    │   │
│  │    Guide                 │   │
│  │                          │   │
│  │ 🚧 COMING SOON           │   │
│  │                          │   │
│  │ Personalized moon ritual │   │
│  │ guidance with your       │   │
│  │ crystals and chart.      │   │
│  └──────────────────────────┘   │
└──────────────────────────────────┘
```

**Sound Healing Screen**:
```
🔔 Sound Healing Expert - COMING SOON 🚧
Crystal singing bowls, frequencies, and sound bath guidance.
```

**Meditation Screen**:
```
🧘 Meditation Master - COMING SOON 🚧
Guided crystal meditations and energy practices.
```

**Marketplace Screen** (top section):
```
╔════════════════════════════════════╗
║  💎 Crystal Marketplace            ║
║                                    ║
║  ┌──────────────────────────────┐ ║
║  │ 🔮 Crystal Sales &           │ ║
║  │    Acquisition Assistant     │ ║
║  │                              │ ║
║  │ 🚧 COMING SOON               │ ║
║  │                              │ ║
║  │ AI guidance for buying,      │ ║
║  │ selling, and valuing         │ ║
║  │ your crystals.               │ ║
║  └──────────────────────────────┘ ║
║                                    ║
║  [Current marketplace listings]    ║
╚════════════════════════════════════╝
```

---

## 📂 IMPLEMENTATION STRUCTURE

### **Backend** (Cloud Functions)

**File**: `functions/index.js`

**Add function**:
```javascript
exports.consultCrystalGuru = onCall({ ... })
```

**Cost protections**:
- Daily limit check (free: 1, premium: 5, pro: 20)
- Limit crystal fetch to 10 with `.limit(10)`
- Max 800 token output
- 2 Firestore writes per consultation

---

### **Flutter** (Frontend)

**New Files**:
1. `lib/services/guru_service.dart` - API calls to consultCrystalGuru
2. `lib/screens/guru_consultation_screen.dart` - Overlay modal
3. `lib/widgets/guru_fab_button.dart` - Floating action button
4. `lib/widgets/coming_soon_card.dart` - Reusable "coming soon" widget

**Modified Files**:
1. `lib/screens/home_screen.dart` - Add FAB button
2. `lib/screens/moon_phase_screen.dart` - Add "coming soon" card
3. `lib/screens/marketplace_screen.dart` - Add assistant "coming soon"
4. `lib/services/dream_service.dart` - Add method to save consultation as journal entry

---

### **Firestore Schema Updates**

**User Document** (`users/{userId}`):
```javascript
{
  // ... existing fields ...
  
  metaphysical: {
    birthDate: Timestamp | null, // Optional
    dailyConsultCount: 0,
    lastConsultDate: "2025-11-19", // YYYY-MM-DD
    totalConsultations: 0,
    lastConsultation: Timestamp | null,
    hasSeenBirthdayPrompt: false // Track if we've asked
  }
}
```

**Consultations** (`users/{userId}/consultations/{consultId}`):
```javascript
{
  consultationId: "c_1700000000_abc123",
  question: "How can I...", // Max 500 chars
  guidance: "Dear seeker...", // AI response
  tokensUsed: 750,
  createdAt: Timestamp
}
```

**Journal Entry** (when saved):
```javascript
users/{userId}/dreams/{dreamId}: {
  // Same structure as dream journal
  content: "[GURU CONSULTATION]\n\nQ: ...\nA: ...",
  analysis: guidance, // Copy of guidance
  dreamDate: Timestamp,
  crystalsUsed: [], // Empty for consultations
  mood: "spiritual",
  tags: ["guru", "consultation"]
}
```

---

## 🚀 DEPLOYMENT STEPS

### **Phase 1: Backend** (Today)

1. ✅ Add `consultCrystalGuru` function to `functions/index.js`
2. ✅ Deploy: `firebase deploy --only functions:consultCrystalGuru`
3. ✅ Test with Postman or curl
4. ✅ Verify daily limit works
5. ✅ Check Firestore writes (should be 2 per consultation)

### **Phase 2: Flutter UI** (Tomorrow)

1. ✅ Create `guru_service.dart` - API wrapper
2. ✅ Create `guru_consultation_screen.dart` - Overlay modal
3. ✅ Create `guru_fab_button.dart` - Floating button with badge
4. ✅ Add FAB to `home_screen.dart`
5. ✅ Test consultation flow end-to-end

### **Phase 3: Birthday Prompt** (Day 3)

1. ✅ Create birthday dialog widget
2. ✅ Show before first consultation if not set
3. ✅ Add date picker
4. ✅ Store in Firestore with validation

### **Phase 4: Save to Journal** (Day 3)

1. ✅ Add "Save to Journal" button in guidance overlay
2. ✅ Create journal entry from consultation
3. ✅ Test journal list shows consultation entries
4. ✅ Add visual distinction (consultation vs dream)

### **Phase 5: Coming Soon Cards** (Day 4)

1. ✅ Create `coming_soon_card.dart` widget
2. ✅ Add to Moon Phase screen
3. ✅ Add to Marketplace screen
4. ✅ Add to Sound Healing (if exists)
5. ✅ Add to Meditation (if exists)

---

## 🧪 TESTING CHECKLIST

### **Backend Tests**:
- [ ] Free user can consult 1x/day
- [ ] Premium user can consult 5x/day
- [ ] Daily limit resets at midnight
- [ ] Returns guidance with user's crystal names
- [ ] Includes birth date context if available
- [ ] Tokens used tracked correctly
- [ ] Only fetches 10 crystals (not all)
- [ ] Error handling works (no API key, no user, etc)

### **Frontend Tests**:
- [ ] FAB button appears on all screens
- [ ] Shows badge with remaining consultations
- [ ] Birthday prompt shows before first use
- [ ] Skipping birthday works (never shows again)
- [ ] Consultation overlay opens from anywhere
- [ ] Loading state displays while waiting
- [ ] Guidance displays correctly (markdown)
- [ ] Can save to journal
- [ ] Journal shows consultation entries
- [ ] Coming soon cards display properly

---

## 💡 FUTURE ENHANCEMENTS (Later)

### **Social Sharing Paywall**:
- Share consultation on social media → unlock 1 bonus consultation
- Track shares in Firestore
- Reset monthly

### **Specialized Guides**:
1. **Moon Ritual Expert** - Moon phase specific guidance
2. **Meditation Master** - Guided meditation scripts
3. **Divination Oracle** - I-Ching + Tarot synthesis
4. **Sound Healer** - Frequency and singing bowl guidance
5. **Mandala Architect** - Crystal grid design
6. **Crystal Sales Assistant** - Marketplace buying/selling advice

### **Advanced Features**:
- Multi-turn conversations (follow-up questions)
- Voice input for questions
- Export consultations as PDF
- Community sharing (opt-in)
- Favorite consultations
- Search consultation history

---

## 🌟 A Paul Phillips Manifestation

**Crystal Healing Guru - Simple Mystical AI Implementation**

**Essence**: The universe speaking through LLM's spontaneous emergence
**Cost**: Aggressively optimized ($22/month for 1100 users)
**UX**: Always accessible, overlay anywhere, saves to journal
**Limits**: Free 1x/day, premium unlimited, strict protections

**Innovation**:
- Mystical transcendent persona without complex systems
- High temperature (0.9) for unique "channeled" responses
- Optional birth date for horoscope context
- Universal overlay accessible from anywhere
- Coming soon placeholders for future specialized guides

**Philosophy**:
- Simplicity over complexity
- Mystery through LLM randomness itself
- Cost protection through smart limits
- Accessibility through always-visible button

**Ready to deploy**: Backend complete with cost protections, UI design spec ready.

---

**Contact**: Paul@clearseassolutions.com
**© 2025 Paul Phillips - Clear Seas Solutions LLC**
