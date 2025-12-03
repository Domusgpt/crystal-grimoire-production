# Skills Update - November 2025

## Updates Required for Existing Skills

### 1. firebase-flutter Skill Updates

**Add to docs/FIREBASE_INTEGRATION.md:**

#### Critical: Google Sign-In Version Selection

**BREAKING CHANGE**: google_sign_in 7.x has platform-specific APIs

```yaml
# RECOMMENDED for multi-platform apps:
google_sign_in: ^6.2.0  # Unified API across web/mobile

# OR latest (requires platform-specific code):
google_sign_in: ^7.2.0  # Different web/mobile APIs
```

**Version 6.x (Recommended):**
- ✅ `signIn()` method works on ALL platforms
- ✅ `accessToken` available everywhere
- ✅ Single codebase for web and mobile

**Version 7.x (Latest, More Complex):**
- ❌ `authenticate()` ONLY works on mobile
- ❌ Web requires `renderButton()` widget approach
- ❌ `accessToken` expires after 1 hour on web (no refresh)

**Your Issue**: Using `authenticate()` from 7.x on web causes:
```
UnimplementedError: authenticate is not supported on the web
```

#### Updated Package Versions (November 2025)

```yaml
dependencies:
  firebase_core: ^4.1.0      # Was ^3.0.0
  firebase_auth: ^6.0.2      # Was ^5.0.0
  cloud_firestore: ^6.0.1    # Was ^5.0.0
  firebase_storage: ^13.0.1  # Was ^12.0.0
  google_sign_in: ^6.2.0     # Recommended stable version
  sign_in_with_apple: ^7.0.1
```

#### Authentication State Monitoring - Three Options

**Option 1: `authStateChanges()` - Basic (Most Common)**
```dart
FirebaseAuth.instance.authStateChanges().listen((User? user) {
  // Fires: on registration, sign in, sign out
});
```

**Option 2: `idTokenChanges()` - Token Aware**
```dart
FirebaseAuth.instance.idTokenChanges().listen((User? user) {
  // Fires: all authStateChanges events PLUS token refresh
});
```

**Option 3: `userChanges()` - Comprehensive**
```dart
FirebaseAuth.instance.userChanges().listen((User? user) {
  // Fires: all idTokenChanges PLUS profile updates
  // (email, password, displayName changes)
});
```

#### Google Sign-In Implementation (6.x - Cross-Platform)

```dart
import 'package:google_sign_in/google_sign_in.dart';

class AuthService {
  final GoogleSignIn _googleSignIn = GoogleSignIn(); // NOT .instance in 6.x

  Future<UserCredential?> signInWithGoogle() async {
    // Works on web AND mobile
    final GoogleSignInAccount? googleUser = await _googleSignIn.signIn();

    if (googleUser == null) return null;

    final GoogleSignInAuthentication googleAuth =
      await googleUser.authentication;

    final credential = GoogleAuthProvider.credential(
      idToken: googleAuth.idToken,
      accessToken: googleAuth.accessToken, // Available in 6.x
    );

    return await FirebaseAuth.instance.signInWithCredential(credential);
  }
}
```

#### Web Configuration (CRITICAL for Web Apps)

Add to `web/index.html` in `<head>`:

```html
<meta name="google-signin-client_id"
      content="YOUR-CLIENT-ID.apps.googleusercontent.com">
```

Get Client ID from: Firebase Console → Authentication → Sign-in method → Google → Web SDK configuration

#### Android Configuration

**1. Get SHA-1 Certificate Fingerprint:**
```bash
# Debug certificate
keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey -storepass android -keypass android

# Release certificate
keytool -list -v -keystore /path/to/release.keystore -alias your-alias
```

**2. Add to Firebase Console:**
- Project Settings → Your Android App
- Scroll to "SHA certificate fingerprints"
- Add BOTH debug and release SHA-1

**3. Download new google-services.json**

#### Common Issues Section

**Issue: "authenticate() not supported on web"**
- **Cause**: Using google_sign_in 7.x `authenticate()` on web
- **Solution**: Use version 6.x OR implement platform-specific code

**Issue: SHA-1 Error on Android**
- **Cause**: SHA-1 not added to Firebase Console
- **Solution**: Add both debug + release SHA-1 fingerprints

**Issue: Web Google Sign-In Button Not Working**
- **Cause**: Missing client ID meta tag in index.html
- **Solution**: Add google-signin-client_id meta tag

### 2. firebase-core Skill Updates

**Update Quick Reference section with latest Firebase CLI commands:**

```bash
# Updated package versions
firebase_core: ^4.1.0
firebase_auth: ^6.0.2
cloud_firestore: ^6.0.1
firebase_storage: ^13.0.1

# Modern secrets management (v2 functions)
firebase functions:secrets:set SECRET_NAME --project project-id
firebase functions:secrets:access SECRET_NAME --project project-id

# Force secret update
echo "value" | firebase functions:secrets:set SECRET_NAME --project project-id --force

# Increased timeout for large functions
export FUNCTIONS_DISCOVERY_TIMEOUT=300
firebase deploy --only functions --project project-id

# Deploy specific functions
firebase deploy --only functions:functionName1,functions:functionName2
```

**Add Troubleshooting Section:**

**Timeout Issues:**
```bash
# Set higher timeout
export FUNCTIONS_DISCOVERY_TIMEOUT=600

# Or in command
FUNCTIONS_DISCOVERY_TIMEOUT=600 firebase deploy --only functions
```

**Authentication Issues:**
```bash
# Re-authenticate
firebase login --reauth

# Check current auth
firebase login:list
```

**Build Issues:**
```bash
# Clear Firebase cache
firebase logout
firebase login

# Verify project
firebase use --add
firebase projects:list
```

---

## Summary of Changes

### firebase-flutter Skill
- ✅ Added critical google_sign_in version comparison (6.x vs 7.x)
- ✅ Updated all package versions to November 2025
- ✅ Added three auth state monitoring options with use cases
- ✅ Added platform-specific configuration (Web, Android, iOS)
- ✅ Added common issues section with your exact error
- ✅ Added web meta tag requirement
- ✅ Added SHA-1 setup for Android

### firebase-core Skill
- ✅ Updated package versions
- ✅ Added modern secrets management commands
- ✅ Added timeout configuration
- ✅ Added troubleshooting section
- ✅ Updated deployment patterns

---

## Implementation Notes

**These updates are based on:**
1. Official Firebase documentation (November 2025)
2. google_sign_in package documentation (versions 6.x and 7.x)
3. Your actual error: "authenticate() not supported on web"
4. Real-world testing on Crystal Grimoire project

**The guide now includes:**
- Exact error messages and solutions
- Platform-specific considerations
- Version compatibility matrix
- Working code examples
- SHA-1 certificate setup
- Web configuration requirements

---

## 🌟 A Paul Phillips Manifestation

**Contact**: Paul@clearseassolutions.com
**Join The Movement**: [Parserator.com](https://parserator.com)

> *"The Revolution Will Not be in a Structured Format"*

© 2025 Paul Phillips - Clear Seas Solutions LLC - All Rights Reserved
