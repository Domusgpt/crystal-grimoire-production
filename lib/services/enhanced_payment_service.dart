import 'dart:async';
import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:firebase_auth/firebase_auth.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:cloud_functions/cloud_functions.dart';
import '../config/plan_entitlements.dart';
import 'environment_config.dart';
import 'storage_service.dart';

/// Web-only payment service using Stripe Checkout
/// RevenueCat support removed for web platform compatibility
class EnhancedPaymentService {
  // Use explicit region to ensure auth tokens are properly passed
  static final FirebaseFunctions _functions = FirebaseFunctions.instanceFor(region: 'us-central1');
  static EnvironmentConfig get _config => EnvironmentConfig.instance;
  static const String _entitlementIdPremium = 'premium';
  static const String _entitlementIdPro = 'pro';
  static const String _entitlementIdFounders = 'founders';

  static final FirebaseFirestore _firestore = FirebaseFirestore.instance;
  static bool _isInitialized = false;

  // Subscription products (Stripe price IDs)
  static String get premiumMonthlyId =>
      _config.stripePremiumPriceId.isNotEmpty
          ? _config.stripePremiumPriceId
          : 'crystal_premium_monthly';
  static String get proMonthlyId =>
      _config.stripeProPriceId.isNotEmpty
          ? _config.stripeProPriceId
          : 'crystal_pro_monthly';
  static String get foundersLifetimeId =>
      _config.stripeFoundersPriceId.isNotEmpty
          ? _config.stripeFoundersPriceId
          : 'crystal_founders_lifetime';

  // Subscription cache
  static SubscriptionStatus? _webSubscriptionStatus;

  // Initialize payment service
  static Future<void> initialize() async {
    if (_isInitialized) return;

    try {
      print('Web platform detected - enabling Stripe checkout flow');
      await _initializeWebStatus();
      _isInitialized = true;
    } catch (e) {
      print('Payment service initialization failed: $e');
      _isInitialized = true;
    }
  }

  static Future<void> _initializeWebStatus() async {
    // Initialize with free tier
    _webSubscriptionStatus = SubscriptionStatus(
      tier: 'free',
      isActive: false,
      expiresAt: null,
      willRenew: false,
    );

    // Check if user has a stored subscription
    final user = FirebaseAuth.instance.currentUser;
    if (user != null) {
      try {
        final doc = await _firestore.collection('users').doc(user.uid).get();
        if (doc.exists && doc.data() != null) {
          final data = doc.data()!;
          final tier = (data['subscriptionTier'] ?? 'free').toString();
          final status = (data['subscriptionStatus'] ?? 'inactive').toString();
          final expiresAt = _coerceExpiresAt(data['subscriptionExpiresAt']);
          _webSubscriptionStatus = SubscriptionStatus(
            tier: tier,
            isActive: status.toLowerCase() == 'active',
            expiresAt: expiresAt,
            willRenew: data['subscriptionWillRenew'] == true,
          );
        }
      } catch (e) {
        print('Failed to load subscription status: $e');
      }
    }
  }

  // Get current subscription status
  // Always fetches fresh data from Firestore to ensure accuracy
  static Future<SubscriptionStatus> getSubscriptionStatus({bool forceRefresh = false}) async {
    if (!_isInitialized) {
      await initialize();
    }

    // Always refresh from Firestore to ensure we have the latest data
    // This handles cases where webhook updated the user's subscription
    final user = FirebaseAuth.instance.currentUser;
    if (user != null) {
      try {
        final doc = await _firestore.collection('users').doc(user.uid).get();
        if (doc.exists && doc.data() != null) {
          final data = doc.data()!;
          final tier = (data['subscriptionTier'] ?? 'free').toString();
          final status = (data['subscriptionStatus'] ?? 'inactive').toString();
          final expiresAt = _coerceExpiresAt(data['subscriptionExpiresAt']);
          _webSubscriptionStatus = SubscriptionStatus(
            tier: tier,
            isActive: status.toLowerCase() == 'active',
            expiresAt: expiresAt,
            willRenew: data['subscriptionWillRenew'] == true,
          );
          print('🔮 Subscription status refreshed: tier=$tier, active=${status.toLowerCase() == 'active'}');
        }
      } catch (e) {
        print('Failed to refresh subscription status: $e');
      }
    }

    return _webSubscriptionStatus ?? SubscriptionStatus(
      tier: 'free',
      isActive: false,
      expiresAt: null,
      willRenew: false,
    );
  }

  // Get available packages
  static Future<List<MockPackage>> getOfferings() async {
    return [
      MockPackage(
        identifier: premiumMonthlyId,
        title: 'Crystal Premium',
        description: '5 IDs/day + Collection + Ad-free',
        price: '\$8.99',
        isLifetime: false,
      ),
      MockPackage(
        identifier: proMonthlyId,
        title: 'Crystal Pro',
        description: '20 IDs/day + AI Guidance + Premium features',
        price: '\$19.99',
        isLifetime: false,
      ),
      MockPackage(
        identifier: foundersLifetimeId,
        title: 'Founders Lifetime',
        description: 'Unlimited everything + Beta access',
        price: '\$499.00',
        isLifetime: true,
      ),
    ];
  }

  // Purchase premium subscription
  static Future<PurchaseResult> purchasePremium() async {
    print('🔥 purchasePremium called, productId: $premiumMonthlyId');
    return await _handleWebPurchase(premiumMonthlyId, 'premium');
  }

  // Purchase pro subscription
  static Future<PurchaseResult> purchasePro() async {
    return await _handleWebPurchase(proMonthlyId, 'pro');
  }

  // Purchase founders lifetime
  static Future<PurchaseResult> purchaseFounders() async {
    return await _handleWebPurchase(foundersLifetimeId, 'founders');
  }

  static Future<SubscriptionStatus> confirmWebCheckout(String sessionId) async {
    if (sessionId.isEmpty) {
      throw Exception('Missing checkout session identifier.');
    }

    final user = FirebaseAuth.instance.currentUser;
    if (user == null) {
      throw Exception('You must be signed in to verify subscriptions.');
    }

    try {
      final callable = _functions.httpsCallable('finalizeStripeCheckoutSession');
      final response = await callable.call({'sessionId': sessionId});
      final data = Map<String, dynamic>.from(response.data as Map);
      final resolvedTier = (data['plan'] as String? ?? data['tier'] as String? ?? 'free').toLowerCase();
      final status = SubscriptionStatus(
        tier: resolvedTier,
        isActive: data['isActive'] == true,
        expiresAt: _coerceExpiresAt(data['expiresAt']),
        willRenew: data['willRenew'] == true,
      );

      _webSubscriptionStatus = status;
      await StorageService.saveSubscriptionTier(status.tier);
      return status;
    } catch (e) {
      throw Exception('Failed to verify checkout status: $e');
    }
  }

  // Restore purchases
  static Future<bool> restorePurchases() async {
    final user = FirebaseAuth.instance.currentUser;
    if (user == null) return false;

    try {
      final doc = await _firestore.collection('users').doc(user.uid).get();
      if (doc.exists && doc.data() != null) {
        final data = doc.data()!;
        final tier = (data['subscriptionTier'] ?? 'free').toString();

        if (tier != 'free') {
          _webSubscriptionStatus = SubscriptionStatus(
            tier: tier,
            isActive: (data['subscriptionStatus'] ?? 'inactive') == 'active',
            expiresAt: _coerceExpiresAt(data['subscriptionExpiresAt']),
            willRenew: data['subscriptionWillRenew'] == true,
          );

          await StorageService.saveSubscriptionTier(tier);
          return true;
        }
      }
    } catch (e) {
      print('Error restoring purchases: $e');
    }

    return false;
  }

  // Cancel subscription
  static Future<void> cancelSubscription() async {
    throw Exception('Web subscriptions are managed through the Stripe customer portal');
  }

  // Enable founders account (for development/testing)
  static Future<void> enableFoundersAccountForTesting() async {
    final user = FirebaseAuth.instance.currentUser;
    if (user == null) return;

    _webSubscriptionStatus = SubscriptionStatus(
      tier: 'founders',
      isActive: true,
      expiresAt: null,
      willRenew: false,
    );

    await StorageService.saveSubscriptionTier('founders');

    // Update Firebase
    await _firestore.collection('users').doc(user.uid).set({
      'subscriptionTier': 'founders',
      'subscriptionStatus': 'active',
      'subscriptionProvider': 'manual',
      'subscriptionExpiresAt': null,
      'subscriptionWillRenew': false,
      'subscriptionUpdatedAt': FieldValue.serverTimestamp(),
      'isDevelopmentAccount': true,
    }, SetOptions(merge: true));

    await _firestore
        .collection('users')
        .doc(user.uid)
        .collection('plan')
        .doc('active')
        .set({
      'plan': 'founders',
      'billingTier': 'founders',
      'provider': 'manual',
      'effectiveLimits': PlanEntitlements.effectiveLimits('founders'),
      'flags': PlanEntitlements.flags('founders'),
      'willRenew': false,
      'lifetime': true,
      'updatedAt': FieldValue.serverTimestamp(),
    }, SetOptions(merge: true));
  }

  static Future<PurchaseResult> _handleWebPurchase(String productId, String tier) async {
    print('🔥 _handleWebPurchase called: productId=$productId, tier=$tier');
    final user = FirebaseAuth.instance.currentUser;
    print('🔥 Current user: ${user?.uid ?? "NULL"}');
    if (user == null) {
      print('🔥 No user, returning error');
      return PurchaseResult(
        success: false,
        error: 'You must be signed in to start a subscription.',
        isWebPlatform: true,
      );
    }

    // CRITICAL: Force refresh the ID token before making callable function request
    // This ensures the auth token is fresh and properly included in the request
    try {
      final idToken = await user.getIdToken(true); // true = force refresh
      print('🔥 ID token refreshed: ${idToken != null ? "SUCCESS (${idToken.length} chars)" : "NULL"}');
    } catch (e) {
      print('🔥 Token refresh failed: $e');
      return PurchaseResult(
        success: false,
        error: 'Authentication expired. Please sign in again.',
        isWebPlatform: true,
      );
    }

    try {
      final urls = _buildWebCheckoutUrls();
      print('🔥 URLs: $urls');
      print('🔥 Calling createStripeCheckoutSession...');
      final callable = _functions.httpsCallable('createStripeCheckoutSession');
      final response = await callable.call({
        'priceId': productId,
        'tier': tier,
        'successUrl': urls['success'],
        'cancelUrl': urls['cancel'],
      });

      final data = Map<String, dynamic>.from(response.data as Map);
      final checkoutUrl = data['checkoutUrl'] as String?;
      final sessionId = data['sessionId'] as String?;

      if (checkoutUrl == null || sessionId == null) {
        return PurchaseResult(
          success: false,
          error: 'Checkout session could not be created. Please try again.',
          isWebPlatform: true,
        );
      }

      return PurchaseResult(
        success: true,
        isWebPlatform: true,
        redirectUrl: checkoutUrl,
        webSessionId: sessionId,
      );
    } catch (e) {
      print('🔥 Checkout error: $e');
      return PurchaseResult(
        success: false,
        error: 'Failed to start checkout: $e',
        isWebPlatform: true,
      );
    }
  }

  static Map<String, String> _buildWebCheckoutUrls() {
    final baseUri = Uri.base;
    final origin = baseUri.hasAuthority
        ? baseUri.origin
        : _config.websiteUrl;
    final successUrl = '$origin/#/subscription?session_id={CHECKOUT_SESSION_ID}';
    final cancelUrl = '$origin/#/subscription?cancelled=true';
    return {'success': successUrl, 'cancel': cancelUrl};
  }

  static String? _coerceExpiresAt(dynamic value) {
    if (value == null) return null;
    if (value is Timestamp) {
      return value.toDate().toIso8601String();
    }
    if (value is DateTime) {
      return value.toIso8601String();
    }
    if (value is num) {
      // Assume seconds since epoch
      return DateTime.fromMillisecondsSinceEpoch(value.toInt() * 1000, isUtc: true)
          .toIso8601String();
    }
    final parsed = DateTime.tryParse(value.toString());
    return parsed?.toIso8601String() ?? value.toString();
  }
}

class SubscriptionStatus {
  final String tier;
  final bool isActive;
  final String? expiresAt;
  final bool willRenew;

  SubscriptionStatus({
    required this.tier,
    required this.isActive,
    this.expiresAt,
    required this.willRenew,
  });

  @override
  String toString() {
    return 'SubscriptionStatus(tier: $tier, active: $isActive, expires: $expiresAt)';
  }
}

class PurchaseResult {
  final bool success;
  final String? error;
  final bool isWebPlatform;
  final String? redirectUrl;
  final String? webSessionId;

  PurchaseResult({
    required this.success,
    this.error,
    this.isWebPlatform = false,
    this.redirectUrl,
    this.webSessionId,
  });
}

class MockPackage {
  final String identifier;
  final String title;
  final String description;
  final String price;
  final bool isLifetime;

  MockPackage({
    required this.identifier,
    required this.title,
    required this.description,
    required this.price,
    required this.isLifetime,
  });
}
