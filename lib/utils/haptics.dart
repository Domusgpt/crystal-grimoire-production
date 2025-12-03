import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:flutter/services.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';

/// Haptic feedback utility that respects user settings
class Haptics {
  static bool _vibrationEnabled = true;
  static bool _initialized = false;

  /// Initialize haptics with user settings
  static Future<void> init() async {
    if (_initialized) return;

    try {
      final user = FirebaseAuth.instance.currentUser;
      if (user != null) {
        final doc = await FirebaseFirestore.instance
            .collection('users')
            .doc(user.uid)
            .get();
        final settings = doc.data()?['settings'] ?? {};
        _vibrationEnabled = settings['vibration'] ?? true;
      }
      _initialized = true;
    } catch (e) {
      // Default to enabled if we can't load settings
      _vibrationEnabled = true;
      _initialized = true;
    }
  }

  /// Update vibration setting (call when settings change)
  static void setEnabled(bool enabled) {
    _vibrationEnabled = enabled;
  }

  /// Light haptic feedback - for toggles and small interactions
  static Future<void> light() async {
    if (!_vibrationEnabled || kIsWeb) return;
    try {
      await HapticFeedback.lightImpact();
    } catch (_) {}
  }

  /// Medium haptic feedback - for button presses
  static Future<void> medium() async {
    if (!_vibrationEnabled || kIsWeb) return;
    try {
      await HapticFeedback.mediumImpact();
    } catch (_) {}
  }

  /// Heavy haptic feedback - for important actions
  static Future<void> heavy() async {
    if (!_vibrationEnabled || kIsWeb) return;
    try {
      await HapticFeedback.heavyImpact();
    } catch (_) {}
  }

  /// Selection haptic - for picker/scroll selection
  static Future<void> selection() async {
    if (!_vibrationEnabled || kIsWeb) return;
    try {
      await HapticFeedback.selectionClick();
    } catch (_) {}
  }

  /// Vibrate pattern - for success/error feedback
  static Future<void> vibrate() async {
    if (!_vibrationEnabled || kIsWeb) return;
    try {
      await HapticFeedback.vibrate();
    } catch (_) {}
  }

  /// Success feedback - double tap pattern
  static Future<void> success() async {
    if (!_vibrationEnabled || kIsWeb) return;
    try {
      await HapticFeedback.lightImpact();
      await Future.delayed(const Duration(milliseconds: 100));
      await HapticFeedback.mediumImpact();
    } catch (_) {}
  }

  /// Error feedback - heavy single tap
  static Future<void> error() async {
    if (!_vibrationEnabled || kIsWeb) return;
    try {
      await HapticFeedback.heavyImpact();
    } catch (_) {}
  }
}
