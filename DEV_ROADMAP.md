# Crystal Grimoire - Development Roadmap

**Last Updated:** November 27, 2025
**Version:** Beta 0.2

---

## Current Status: MVP Complete

The core features of Crystal Grimoire are functional:
- Crystal identification via AI (Gemini Vision)
- Personal collection management
- AI Crystal Guru consultation
- Dream analysis with crystal recommendations
- User authentication (Google Sign-In)
- Subscription tiers (Stripe integration)

---

## Features Marked "Coming Soon"

These features are placeholders in the current UI and are planned for future development:

### 1. Push Notifications (Settings Screen)
**Status:** Coming Soon
**Priority:** Medium
**Description:** Enable push notifications for:
- Daily crystal recommendations
- Crystal care reminders
- Lunar cycle notifications
- Special meditation reminders

**Technical Requirements:**
- Firebase Cloud Messaging (FCM) integration
- Background notification handler
- User preference management for notification types
- Scheduled notifications for daily/weekly content

**Estimated Effort:** 2-3 days

---

### 2. Language Selection (Settings Screen)
**Status:** Coming Soon
**Priority:** Low
**Description:** Multi-language support for:
- UI text localization
- Crystal names and descriptions
- AI responses in selected language

**Technical Requirements:**
- Flutter intl package integration
- Translation files for supported languages (initially: Spanish, French, German)
- AI prompt modifications for language output
- RTL support for Arabic/Hebrew (future)

**Estimated Effort:** 5-7 days for initial 3 languages

---

### 3. Meditation Reminders (Settings Screen)
**Status:** Coming Soon
**Priority:** Medium
**Description:** Scheduled reminders for:
- Morning crystal meditation
- Evening gratitude practice
- Custom meditation schedules
- Crystal-specific meditation prompts

**Technical Requirements:**
- Local notification scheduling
- Meditation session tracking
- Integration with collection for crystal suggestions
- Optional: Guided meditation audio

**Estimated Effort:** 3-4 days

---

### 4. Crystal Care Reminders (Settings Screen)
**Status:** Coming Soon
**Priority:** Low
**Description:** Maintenance reminders for:
- Crystal cleansing schedules
- Moonlight charging notifications (lunar calendar)
- Sunlight charging reminders
- Energy clearing suggestions

**Technical Requirements:**
- Lunar calendar API integration
- Per-crystal care schedules
- Local notification scheduling
- Care history tracking

**Estimated Effort:** 2-3 days

---

### 5. Dark Mode Toggle (Settings Screen)
**Status:** Currently "Always On" - Dark mode is the default
**Priority:** Low
**Description:** Optional light mode for daytime use

**Technical Requirements:**
- ThemeData for light mode
- State persistence for theme preference
- Smooth transition animations

**Estimated Effort:** 1 day

---

## Planned Future Features (Not Yet in UI)

### Phase 2: Enhanced Collection
- **Crystal Photos:** Display user-uploaded images in collection grid
- **Wishlist:** Track crystals user wants to acquire
- **Collection Sharing:** Share collection with friends
- **Export/Import:** Backup collection data

### Phase 3: Community Features
- **Crystal Marketplace:** Buy/sell crystals with other users
- **Community Forums:** Discussion boards
- **Crystal Reviews:** User ratings and experiences
- **Expert Verification:** Professional crystal identification

### Phase 4: Advanced AI Features
- **Voice Guidance:** Audio AI responses
- **AR Crystal Viewer:** Augmented reality crystal visualization
- **Personalized Rituals:** AI-generated custom rituals
- **Astrological Integration:** Birth chart crystal recommendations

### Phase 5: Premium Features
- **Offline Mode:** Full functionality without internet
- **Advanced Analytics:** Collection insights and trends
- **Custom Grids:** Crystal grid builder tool
- **Professional Tools:** For crystal healers and practitioners

---

## Technical Debt & Improvements

### High Priority
- [ ] Add proper error boundaries throughout app
- [ ] Implement retry logic for failed API calls
- [ ] Add loading skeletons instead of spinners
- [ ] Improve image compression for uploads

### Medium Priority
- [ ] Add unit tests for core services
- [ ] Implement proper logging system
- [ ] Add performance monitoring (Firebase Performance)
- [ ] Cache AI responses for repeated queries

### Low Priority
- [ ] Refactor state management (consider Riverpod)
- [ ] Add widget tests for UI components
- [ ] Implement CI/CD pipeline
- [ ] Add automated screenshot tests

---

## Release Schedule (Tentative)

| Version | Target | Features |
|---------|--------|----------|
| 0.2.1 | Dec 2025 | Push notifications, bug fixes |
| 0.3.0 | Jan 2026 | Meditation reminders, crystal photos in collection |
| 0.4.0 | Feb 2026 | Language support (3 languages) |
| 0.5.0 | Mar 2026 | Crystal care reminders, wishlist |
| 1.0.0 | Q2 2026 | Marketplace MVP, community features |

---

## Contributing

For feature requests or bug reports, contact:
- **Email:** support@crystalgrimoire.com
- **Developer:** Paul@clearseassolutions.com

---

**A Paul Phillips Manifestation**
**Clear Seas Solutions LLC**
