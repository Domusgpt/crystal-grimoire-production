# Flutter + Firebase Complete Implementation Guide

**Compiled from Official Documentation - November 2025**

> **Purpose**: Comprehensive reference for implementing Firebase services in Flutter applications, with focus on Authentication, Firestore, Storage, and multi-platform considerations.

---

## Table of Contents

1. [FlutterFire Overview & Setup](#1-flutterfire-overview--setup)
2. [Firebase Authentication](#2-firebase-authentication)
3. [Google Sign-In Integration](#3-google-sign-in-integration)
4. [Cloud Firestore](#4-cloud-firestore)
5. [Firebase Storage](#5-firebase-storage)
6. [Multi-Platform Considerations](#6-multi-platform-considerations)
7. [Best Practices & Patterns](#7-best-practices--patterns)
8. [Common Issues & Solutions](#8-common-issues--solutions)

---

## 1. FlutterFire Overview & Setup

### What is FlutterFire?

FlutterFire is a set of Flutter plugins that connect your Flutter application to Firebase. It provides modular, installable packages for integrating specific Firebase services.

### Prerequisites

Before implementation:
- ✅ Existing or newly created Flutter project
- ✅ Active Firebase account (https://console.firebase.google.com)
- ✅ Flutter development environment installed

### Core Setup Process

#### Step 1: Install Firebase Core

```bash
flutter pub add firebase_core
```

**Why Firebase Core?** This plugin handles the connection between your app and Firebase. It's required before adding any other Firebase services.

#### Step 2: Configure with FlutterFire CLI (Recommended)

```bash
# Install Firebase CLI globally
npm install -g firebase-tools

# Install FlutterFire CLI
dart pub global activate flutterfire_cli

# Configure your project
flutterfire configure
```

**What this does:**
- Generates `firebase_options.dart` file automatically
- Applies necessary Android/iOS/Web configuration
- Registers your app with Firebase Console

#### Step 3: Initialize Firebase in Your App

```dart
import 'package:firebase_core/firebase_core.dart';
import 'firebase_options.dart';

void main() async {
  // CRITICAL: Must be called before Firebase.initializeApp()
  WidgetsFlutterBinding.ensureInitialized();

  await Firebase.initializeApp(
    options: DefaultFirebaseOptions.currentPlatform,
  );

  runApp(MyApp());
}
```

### Important Notes

- **firebase_core alone** provides only basic connectivity
- **Additional services** require separate plugin installation
- **Reconfigure** when adding new platforms or Firebase services
- **Platform-specific setup** may still be required for some features

---

## 2. Firebase Authentication

### Installation

```bash
flutter pub add firebase_auth
```

### Import

```dart
import 'package:firebase_auth/firebase_auth.dart';
```

### Enable Authentication Providers

1. Open [Firebase Console](https://console.firebase.google.com)
2. Navigate to **Authentication** → **Sign-in Method**
3. Enable desired providers (Email/Password, Google, Apple, etc.)

### Monitoring Authentication State

Firebase provides three stream-based approaches to track user login status:

#### Option 1: `authStateChanges()` - Basic Login Detection

```dart
FirebaseAuth.instance.authStateChanges().listen((User? user) {
  if (user == null) {
    print('User is currently signed out!');
  } else {
    print('User is signed in: ${user.email}');
  }
});
```

**Fires when:**
- Listener is first registered (immediate)
- User signs in
- User signs out

#### Option 2: `idTokenChanges()` - Token Refresh Detection

```dart
FirebaseAuth.instance.idTokenChanges().listen((User? user) {
  // Fires for all authStateChanges events PLUS:
  // - ID token refresh
  // - Custom claims update via Admin SDK
});
```

#### Option 3: `userChanges()` - Comprehensive User Events

```dart
FirebaseAuth.instance.userChanges().listen((User? user) {
  // Most comprehensive - fires for:
  // - All idTokenChanges events
  // - User profile modifications (email, password, displayName, etc.)
});
```

### Email/Password Authentication

#### Sign Up

```dart
Future<UserCredential> signUpWithEmail({
  required String email,
  required String password,
}) async {
  try {
    final credential = await FirebaseAuth.instance.createUserWithEmailAndPassword(
      email: email,
      password: password,
    );

    // Optional: Send email verification
    await credential.user?.sendEmailVerification();

    return credential;
  } on FirebaseAuthException catch (e) {
    if (e.code == 'weak-password') {
      throw Exception('The password provided is too weak.');
    } else if (e.code == 'email-already-in-use') {
      throw Exception('An account already exists for that email.');
    }
    rethrow;
  }
}
```

#### Sign In

```dart
Future<UserCredential> signInWithEmail({
  required String email,
  required String password,
}) async {
  try {
    return await FirebaseAuth.instance.signInWithEmailAndPassword(
      email: email,
      password: password,
    );
  } on FirebaseAuthException catch (e) {
    if (e.code == 'user-not-found') {
      throw Exception('No user found for that email.');
    } else if (e.code == 'wrong-password') {
      throw Exception('Wrong password provided.');
    }
    rethrow;
  }
}
```

#### Password Reset

```dart
Future<void> resetPassword(String email) async {
  await FirebaseAuth.instance.sendPasswordResetEmail(email: email);
}
```

### Sign Out

```dart
Future<void> signOut() async {
  await FirebaseAuth.instance.signOut();
}
```

### Get Current User

```dart
User? user = FirebaseAuth.instance.currentUser;

if (user != null) {
  print('User ID: ${user.uid}');
  print('Email: ${user.email}');
  print('Display Name: ${user.displayName}');
  print('Photo URL: ${user.photoURL}');
  print('Email Verified: ${user.emailVerified}');
}
```

### Update User Profile

```dart
Future<void> updateProfile({
  String? displayName,
  String? photoURL,
}) async {
  User? user = FirebaseAuth.instance.currentUser;

  if (user != null) {
    await user.updateDisplayName(displayName);
    await user.updatePhotoURL(photoURL);

    // Reload user to get updated information
    await user.reload();
  }
}
```

### Testing with Emulator

```dart
// For local development/testing
await FirebaseAuth.instance.useAuthEmulator('localhost', 9099);
```

Run Firebase emulator:
```bash
firebase emulators:start
```

### Persistence Behavior

**Android/iOS**: Authentication state automatically persists between app restarts.

**Web**: Uses IndexedDB by default. Adjust persistence with:

```dart
// Web only
await FirebaseAuth.instance.setPersistence(Persistence.LOCAL);
// Options: LOCAL (default), SESSION, NONE
```

---

## 3. Google Sign-In Integration

### Package Version Considerations

**CRITICAL DECISION**: Choose between google_sign_in 6.x or 7.x

#### google_sign_in 6.x (Recommended for Multi-Platform)
- ✅ **Unified API** across web and mobile
- ✅ `signIn()` method works everywhere
- ✅ `accessToken` available on all platforms
- ❌ Older version (but more stable cross-platform)

#### google_sign_in 7.x (Latest, Platform-Specific APIs)
- ✅ Latest features
- ❌ **Different APIs for web vs mobile**
- ❌ Web: Requires `renderButton()` widget approach
- ❌ Mobile: Uses `authenticate()` method
- ❌ No `accessToken` on web (expires after 1 hour, no refresh)

### Installation

**For Multi-Platform Apps (Recommended):**
```yaml
# pubspec.yaml
dependencies:
  google_sign_in: ^6.2.0  # Stable cross-platform
```

**For Latest Features (Platform-Specific Code Required):**
```yaml
# pubspec.yaml
dependencies:
  google_sign_in: ^7.2.0  # Latest, requires platform-specific handling
```

### Configuration

#### Android Setup

1. **Get SHA-1 Certificate Fingerprint**

```bash
# Debug certificate
keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey -storepass android -keypass android

# Release certificate (replace with your keystore path)
keytool -list -v -keystore /path/to/your/release.keystore -alias your-alias
```

2. **Add to Firebase Console**
   - Firebase Console → Project Settings → Your Android App
   - Scroll to "SHA certificate fingerprints"
   - Click "Add fingerprint" and paste SHA-1

3. **Download google-services.json**
   - Place in `android/app/` directory

#### iOS Setup

1. **Add GoogleService-Info.plist**
   - Download from Firebase Console
   - Add to `ios/Runner/` in Xcode (use Xcode, not file manager)

2. **Add URL Scheme**
   - Open `ios/Runner/Info.plist`
   - Add the reversed client ID from GoogleService-Info.plist

```xml
<key>CFBundleURLTypes</key>
<array>
  <dict>
    <key>CFBundleTypeRole</key>
    <string>Editor</string>
    <key>CFBundleURLSchemes</key>
    <array>
      <string>com.googleusercontent.apps.YOUR-CLIENT-ID</string>
    </array>
  </dict>
</array>
```

#### Web Setup

Add to `web/index.html` in `<head>`:

```html
<meta name="google-signin-client_id"
      content="YOUR-WEB-CLIENT-ID.apps.googleusercontent.com">
```

Get Web Client ID from Firebase Console → Authentication → Sign-in method → Google → Web SDK configuration

### Implementation (google_sign_in 6.x - Cross-Platform)

```dart
import 'package:google_sign_in/google_sign_in.dart';
import 'package:firebase_auth/firebase_auth.dart';

class AuthService {
  final GoogleSignIn _googleSignIn = GoogleSignIn();
  final FirebaseAuth _auth = FirebaseAuth.instance;

  Future<UserCredential?> signInWithGoogle() async {
    try {
      // Trigger Google Sign-In flow
      final GoogleSignInAccount? googleUser = await _googleSignIn.signIn();

      if (googleUser == null) {
        return null; // User cancelled
      }

      // Get authentication details
      final GoogleSignInAuthentication googleAuth =
        await googleUser.authentication;

      // Create Firebase credential
      final credential = GoogleAuthProvider.credential(
        idToken: googleAuth.idToken,
        accessToken: googleAuth.accessToken,
      );

      // Sign in to Firebase
      return await _auth.signInWithCredential(credential);

    } catch (e) {
      print('Error signing in with Google: $e');
      rethrow;
    }
  }

  Future<void> signOut() async {
    await _googleSignIn.signOut();
    await _auth.signOut();
  }
}
```

### Implementation (google_sign_in 7.x - Platform-Specific)

```dart
import 'package:google_sign_in/google_sign_in.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/foundation.dart' show kIsWeb;

class AuthService {
  final GoogleSignIn _googleSignIn = GoogleSignIn.instance;
  final FirebaseAuth _auth = FirebaseAuth.instance;

  Future<UserCredential?> signInWithGoogle() async {
    try {
      if (kIsWeb) {
        // Web: Use popup/redirect flow
        final GoogleAuthProvider googleProvider = GoogleAuthProvider();
        return await _auth.signInWithPopup(googleProvider);
        // Alternative: signInWithRedirect(googleProvider)
      } else {
        // Mobile: Use authenticate method
        final GoogleSignInAccount? googleUser =
          await _googleSignIn.authenticate();

        if (googleUser == null) return null;

        final GoogleSignInAuthentication googleAuth =
          await googleUser.authentication;

        final credential = GoogleAuthProvider.credential(
          idToken: googleAuth.idToken,
          // Note: accessToken not available on web in 7.x
        );

        return await _auth.signInWithCredential(credential);
      }
    } catch (e) {
      print('Error signing in with Google: $e');
      rethrow;
    }
  }
}
```

### Apple Sign-In

```bash
flutter pub add sign_in_with_apple
```

**Implementation (Cross-Platform):**

```dart
import 'package:sign_in_with_apple/sign_in_with_apple.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/foundation.dart' show kIsWeb;

Future<UserCredential> signInWithApple() async {
  if (kIsWeb) {
    // Web flow
    final provider = AppleAuthProvider();
    return await FirebaseAuth.instance.signInWithPopup(provider);
  } else {
    // Mobile flow
    final appleCredential = await SignInWithApple.getAppleIDCredential(
      scopes: [
        AppleIDAuthorizationScopes.email,
        AppleIDAuthorizationScopes.fullName,
      ],
    );

    final oauthCredential = OAuthProvider("apple.com").credential(
      idToken: appleCredential.identityToken,
      accessToken: appleCredential.authorizationCode,
    );

    return await FirebaseAuth.instance.signInWithCredential(oauthCredential);
  }
}
```

---

## 4. Cloud Firestore

### Installation

```bash
flutter pub add cloud_firestore
```

### Import

```dart
import 'package:cloud_firestore/cloud_firestore.dart';
```

### Initialize

```dart
final FirebaseFirestore firestore = FirebaseFirestore.instance;
```

### Create/Add Data

#### Add Document with Auto-Generated ID

```dart
Future<void> addUser(String name, String email) async {
  await firestore.collection('users').add({
    'name': name,
    'email': email,
    'createdAt': FieldValue.serverTimestamp(),
  });
}
```

#### Set Document with Specific ID

```dart
Future<void> createUser(String uid, Map<String, dynamic> data) async {
  await firestore.collection('users').doc(uid).set(data);
}
```

#### Merge Data (Update without Overwriting)

```dart
Future<void> updateUser(String uid, Map<String, dynamic> updates) async {
  await firestore.collection('users').doc(uid).set(
    updates,
    SetOptions(merge: true),
  );
}
```

### Read Data

#### Get Single Document

```dart
Future<Map<String, dynamic>?> getUser(String uid) async {
  final doc = await firestore.collection('users').doc(uid).get();

  if (doc.exists) {
    return doc.data();
  }
  return null;
}
```

#### Get All Documents in Collection

```dart
Future<List<Map<String, dynamic>>> getAllUsers() async {
  final snapshot = await firestore.collection('users').get();

  return snapshot.docs.map((doc) {
    return {
      'id': doc.id,
      ...doc.data(),
    };
  }).toList();
}
```

#### Query with Conditions

```dart
Future<List<Map<String, dynamic>>> getActiveUsers() async {
  final snapshot = await firestore
    .collection('users')
    .where('status', isEqualTo: 'active')
    .where('age', isGreaterThan: 18)
    .orderBy('age', descending: true)
    .limit(10)
    .get();

  return snapshot.docs.map((doc) => doc.data()).toList();
}
```

### Real-Time Listeners

#### Listen to Single Document

```dart
void listenToUser(String uid) {
  firestore.collection('users').doc(uid).snapshots().listen((snapshot) {
    if (snapshot.exists) {
      print('User data updated: ${snapshot.data()}');
    }
  });
}
```

#### Listen to Collection

```dart
StreamBuilder<QuerySnapshot> buildUserList() {
  return StreamBuilder<QuerySnapshot>(
    stream: firestore.collection('users').snapshots(),
    builder: (context, snapshot) {
      if (snapshot.hasError) {
        return Text('Error: ${snapshot.error}');
      }

      if (snapshot.connectionState == ConnectionState.waiting) {
        return CircularProgressIndicator();
      }

      final users = snapshot.data!.docs;

      return ListView.builder(
        itemCount: users.length,
        itemBuilder: (context, index) {
          final user = users[index].data() as Map<String, dynamic>;
          return ListTile(
            title: Text(user['name'] ?? 'Unknown'),
            subtitle: Text(user['email'] ?? ''),
          );
        },
      );
    },
  );
}
```

### Update Data

#### Update Specific Fields

```dart
Future<void> updateUserEmail(String uid, String newEmail) async {
  await firestore.collection('users').doc(uid).update({
    'email': newEmail,
    'updatedAt': FieldValue.serverTimestamp(),
  });
}
```

#### Increment/Decrement Values

```dart
Future<void> incrementUserScore(String uid, int points) async {
  await firestore.collection('users').doc(uid).update({
    'score': FieldValue.increment(points),
  });
}
```

### Delete Data

#### Delete Document

```dart
Future<void> deleteUser(String uid) async {
  await firestore.collection('users').doc(uid).delete();
}
```

#### Delete Field

```dart
Future<void> removeUserPhone(String uid) async {
  await firestore.collection('users').doc(uid).update({
    'phone': FieldValue.delete(),
  });
}
```

### Batch Operations

```dart
Future<void> batchUpdate(List<String> userIds) async {
  final batch = firestore.batch();

  for (final uid in userIds) {
    final ref = firestore.collection('users').doc(uid);
    batch.update(ref, {'status': 'inactive'});
  }

  await batch.commit();
}
```

### Transactions

```dart
Future<void> transferPoints(String fromUid, String toUid, int points) async {
  await firestore.runTransaction((transaction) async {
    final fromRef = firestore.collection('users').doc(fromUid);
    final toRef = firestore.collection('users').doc(toUid);

    final fromDoc = await transaction.get(fromRef);
    final fromPoints = fromDoc.data()!['points'] as int;

    if (fromPoints < points) {
      throw Exception('Insufficient points');
    }

    transaction.update(fromRef, {'points': fromPoints - points});
    transaction.update(toRef, {'points': FieldValue.increment(points)});
  });
}
```

### Security Rules Example

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Only authenticated users can read/write
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }

    // Public read, authenticated write
    match /posts/{postId} {
      allow read: if true;
      allow write: if request.auth != null;
    }
  }
}
```

---

## 5. Firebase Storage

### Installation

```bash
flutter pub add firebase_storage
```

### Import

```dart
import 'package:firebase_storage/firebase_storage.dart';
import 'dart:io';
```

### Upload File

```dart
Future<String> uploadFile(File file, String path) async {
  try {
    final ref = FirebaseStorage.instance.ref().child(path);
    final uploadTask = await ref.putFile(file);
    final downloadUrl = await uploadTask.ref.getDownloadURL();
    return downloadUrl;
  } catch (e) {
    print('Error uploading file: $e');
    rethrow;
  }
}
```

### Upload with Progress

```dart
Future<String> uploadFileWithProgress(
  File file,
  String path,
  Function(double) onProgress,
) async {
  final ref = FirebaseStorage.instance.ref().child(path);
  final uploadTask = ref.putFile(file);

  uploadTask.snapshotEvents.listen((TaskSnapshot snapshot) {
    final progress = snapshot.bytesTransferred / snapshot.totalBytes;
    onProgress(progress);
  });

  final snapshot = await uploadTask;
  return await snapshot.ref.getDownloadURL();
}
```

### Download File

```dart
Future<String> getDownloadUrl(String path) async {
  final ref = FirebaseStorage.instance.ref().child(path);
  return await ref.getDownloadURL();
}
```

### Delete File

```dart
Future<void> deleteFile(String path) async {
  final ref = FirebaseStorage.instance.ref().child(path);
  await ref.delete();
}
```

### List Files

```dart
Future<List<String>> listFiles(String folder) async {
  final ref = FirebaseStorage.instance.ref().child(folder);
  final result = await ref.listAll();

  return result.items.map((item) => item.fullPath).toList();
}
```

---

## 6. Multi-Platform Considerations

### Platform Detection

```dart
import 'package:flutter/foundation.dart' show kIsWeb;
import 'dart:io' show Platform;

bool get isWeb => kIsWeb;
bool get isAndroid => !kIsWeb && Platform.isAndroid;
bool get isIOS => !kIsWeb && Platform.isIOS;
bool get isMacOS => !kIsWeb && Platform.isMacOS;
```

### Platform-Specific Code

```dart
if (kIsWeb) {
  // Web-specific code
  await FirebaseAuth.instance.signInWithPopup(provider);
} else {
  // Mobile-specific code
  await GoogleSignIn().signIn();
}
```

### Web Configuration

**Important**: Web requires additional setup in `web/index.html`:

```html
<!DOCTYPE html>
<html>
<head>
  <!-- Firebase SDK -->
  <script src="https://www.gstatic.com/firebasejs/10.7.0/firebase-app-compat.js"></script>
  <script src="https://www.gstatic.com/firebasejs/10.7.0/firebase-auth-compat.js"></script>
  <script src="https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore-compat.js"></script>

  <!-- Google Sign-In Meta Tag -->
  <meta name="google-signin-client_id"
        content="YOUR-CLIENT-ID.apps.googleusercontent.com">
</head>
<body>
  <script src="main.dart.js" type="application/javascript"></script>
</body>
</html>
```

---

## 7. Best Practices & Patterns

### Service Layer Pattern

```dart
class AuthService {
  final FirebaseAuth _auth = FirebaseAuth.instance;

  Stream<User?> get authStateChanges => _auth.authStateChanges();
  User? get currentUser => _auth.currentUser;

  Future<UserCredential> signIn(String email, String password) async {
    return await _auth.signInWithEmailAndPassword(
      email: email,
      password: password,
    );
  }
}

class FirestoreService {
  final FirebaseFirestore _firestore = FirebaseFirestore.instance;

  Stream<List<Post>> getPosts() {
    return _firestore.collection('posts').snapshots().map((snapshot) {
      return snapshot.docs.map((doc) => Post.fromMap(doc.data())).toList();
    });
  }
}
```

### Error Handling

```dart
Future<UserCredential?> signIn(String email, String password) async {
  try {
    return await FirebaseAuth.instance.signInWithEmailAndPassword(
      email: email,
      password: password,
    );
  } on FirebaseAuthException catch (e) {
    switch (e.code) {
      case 'user-not-found':
        throw Exception('No user found for that email.');
      case 'wrong-password':
        throw Exception('Wrong password provided.');
      case 'invalid-email':
        throw Exception('Invalid email address.');
      case 'user-disabled':
        throw Exception('This account has been disabled.');
      default:
        throw Exception('Authentication error: ${e.message}');
    }
  } catch (e) {
    throw Exception('Unexpected error: $e');
  }
}
```

### Offline Persistence

Firestore offline persistence is enabled by default on mobile. For web:

```dart
FirebaseFirestore.instance.settings = const Settings(
  persistenceEnabled: true,
);
```

### Memory Management

```dart
class MyWidget extends StatefulWidget {
  @override
  _MyWidgetState createState() => _MyWidgetState();
}

class _MyWidgetState extends State<MyWidget> {
  late StreamSubscription<User?> _authSubscription;

  @override
  void initState() {
    super.initState();
    _authSubscription = FirebaseAuth.instance.authStateChanges().listen((user) {
      // Handle auth state changes
    });
  }

  @override
  void dispose() {
    _authSubscription.cancel(); // CRITICAL: Cancel subscription
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Container();
  }
}
```

---

## 8. Common Issues & Solutions

### Issue: Google Sign-In "authenticate() not supported on web"

**Problem**: Using google_sign_in 7.x `authenticate()` method on web platform.

**Solution**: Downgrade to google_sign_in 6.x or use platform-specific code:

```yaml
# Option 1: Downgrade (Recommended for multi-platform)
dependencies:
  google_sign_in: ^6.2.0

# Option 2: Use platform-specific code (see section 3)
```

### Issue: "MissingPluginException"

**Problem**: Platform not configured properly.

**Solution**:
1. Run `flutterfire configure` to regenerate config
2. Restart your IDE
3. Run `flutter clean && flutter pub get`
4. Rebuild the app

### Issue: Firebase not initializing

**Problem**: `WidgetsFlutterBinding.ensureInitialized()` not called.

**Solution**:

```dart
void main() async {
  WidgetsFlutterBinding.ensureInitialized(); // ADD THIS LINE
  await Firebase.initializeApp(
    options: DefaultFirebaseOptions.currentPlatform,
  );
  runApp(MyApp());
}
```

### Issue: Google Sign-In SHA-1 error on Android

**Problem**: "Developer error" or "10: " error when signing in.

**Solution**:
1. Get SHA-1 fingerprint (debug + release)
2. Add both to Firebase Console
3. Download new `google-services.json`
4. Rebuild the app

```bash
# Get debug SHA-1
keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey -storepass android -keypass android
```

### Issue: Firestore permissions denied

**Problem**: "PERMISSION_DENIED" when reading/writing data.

**Solution**: Update Firestore security rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      // Development only - allows all access
      allow read, write: if true;

      // Production - require authentication
      // allow read, write: if request.auth != null;
    }
  }
}
```

### Issue: Build time too long (iOS/macOS)

**Problem**: Firestore involves substantial C++ code compilation.

**Solution**: Use pre-compiled SDK:

```ruby
# ios/Podfile
target 'Runner' do
  use_frameworks!
  use_modular_headers!

  # Add this line
  pod 'FirebaseFirestore', :git => 'https://github.com/invertase/firestore-ios-sdk-frameworks.git', :tag => '10.7.0'

  flutter_install_all_ios_pods File.dirname(File.realpath(__FILE__))
end
```

---

## Package Versions Summary

### Recommended Stable Versions (Multi-Platform)

```yaml
dependencies:
  firebase_core: ^4.1.0
  firebase_auth: ^6.0.2
  cloud_firestore: ^6.0.1
  firebase_storage: ^13.0.1
  google_sign_in: ^6.2.0  # Stable cross-platform
  sign_in_with_apple: ^7.0.1
```

### Latest Versions (Platform-Specific Code Required)

```yaml
dependencies:
  firebase_core: ^4.1.0
  firebase_auth: ^6.0.2
  cloud_firestore: ^6.0.1
  firebase_storage: ^13.0.1
  google_sign_in: ^7.2.0  # Latest features, different web/mobile APIs
  sign_in_with_apple: ^7.0.1
```

---

## Quick Reference: Common Tasks

### Authentication
```dart
// Sign up
await FirebaseAuth.instance.createUserWithEmailAndPassword(email: email, password: password);

// Sign in
await FirebaseAuth.instance.signInWithEmailAndPassword(email: email, password: password);

// Sign out
await FirebaseAuth.instance.signOut();

// Get current user
User? user = FirebaseAuth.instance.currentUser;

// Listen to auth changes
FirebaseAuth.instance.authStateChanges().listen((user) {});
```

### Firestore
```dart
// Add document
await FirebaseFirestore.instance.collection('users').add(data);

// Get document
final doc = await FirebaseFirestore.instance.collection('users').doc(id).get();

// Listen to collection
FirebaseFirestore.instance.collection('users').snapshots().listen((snapshot) {});

// Query
await FirebaseFirestore.instance.collection('users').where('age', isGreaterThan: 18).get();

// Update
await FirebaseFirestore.instance.collection('users').doc(id).update(data);

// Delete
await FirebaseFirestore.instance.collection('users').doc(id).delete();
```

### Storage
```dart
// Upload
final ref = FirebaseStorage.instance.ref().child('path/to/file');
await ref.putFile(file);

// Get URL
final url = await ref.getDownloadURL();

// Delete
await ref.delete();
```

---

## Resources

- **Official Docs**: https://firebase.flutter.dev
- **Firebase Console**: https://console.firebase.google.com
- **FlutterFire GitHub**: https://github.com/firebase/flutterfire
- **Package Documentation**: https://pub.dev/publishers/firebase.google.com/packages

---

## 🌟 A Paul Phillips Manifestation

**Contact**: Paul@clearseassolutions.com
**Join The Exoditical Moral Architecture Movement**: [Parserator.com](https://parserator.com)

> *"The Revolution Will Not be in a Structured Format"*

© 2025 Paul Phillips - Clear Seas Solutions LLC - All Rights Reserved
