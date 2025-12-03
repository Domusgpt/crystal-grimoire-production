import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:audioplayers/audioplayers.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';

/// Audio service for UI sound effects that respects user settings
class AudioService {
  static final AudioPlayer _player = AudioPlayer();
  static bool _soundEnabled = true;
  static bool _initialized = false;

  /// Initialize audio service with user settings
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
        _soundEnabled = settings['sound'] ?? true;
      }

      // Set low volume for UI sounds
      await _player.setVolume(0.3);
      _initialized = true;
    } catch (e) {
      // Default to enabled if we can't load settings
      _soundEnabled = true;
      _initialized = true;
    }
  }

  /// Update sound setting (call when settings change)
  static void setEnabled(bool enabled) {
    _soundEnabled = enabled;
  }

  /// Play a tap/click sound for button presses
  static Future<void> playTap() async {
    if (!_soundEnabled) return;
    await _playTone(frequency: 800, duration: 50);
  }

  /// Play a success sound (ascending tone)
  static Future<void> playSuccess() async {
    if (!_soundEnabled) return;
    await _playTone(frequency: 600, duration: 80);
    await Future.delayed(const Duration(milliseconds: 80));
    await _playTone(frequency: 900, duration: 100);
  }

  /// Play an error sound (descending tone)
  static Future<void> playError() async {
    if (!_soundEnabled) return;
    await _playTone(frequency: 400, duration: 150);
  }

  /// Play a toggle on sound
  static Future<void> playToggleOn() async {
    if (!_soundEnabled) return;
    await _playTone(frequency: 700, duration: 60);
  }

  /// Play a toggle off sound
  static Future<void> playToggleOff() async {
    if (!_soundEnabled) return;
    await _playTone(frequency: 500, duration: 60);
  }

  /// Play a notification/alert sound
  static Future<void> playNotification() async {
    if (!_soundEnabled) return;
    await _playTone(frequency: 880, duration: 100);
    await Future.delayed(const Duration(milliseconds: 100));
    await _playTone(frequency: 880, duration: 100);
  }

  /// Play a crystal identification success sound (mystical chime)
  static Future<void> playCrystalIdentified() async {
    if (!_soundEnabled) return;
    await _playTone(frequency: 523, duration: 100); // C5
    await Future.delayed(const Duration(milliseconds: 100));
    await _playTone(frequency: 659, duration: 100); // E5
    await Future.delayed(const Duration(milliseconds: 100));
    await _playTone(frequency: 784, duration: 150); // G5
  }

  /// Internal method to play a simple tone
  /// Uses a basic approach since we don't have custom audio assets
  static Future<void> _playTone({required int frequency, required int duration}) async {
    try {
      // On web, we could use Web Audio API but for simplicity we'll skip
      // On mobile, audioplayers doesn't support tone generation directly
      // For now, this is a placeholder - in production you'd use audio asset files
      // or the flutter_beep package for system sounds

      // Fallback: Use system click sound on mobile if available
      if (!kIsWeb) {
        // Most apps use pre-recorded audio assets for UI sounds
        // For MVP, we'll rely on haptics for feedback
        // Audio assets can be added later: assets/sounds/tap.mp3, success.mp3, etc.
      }
    } catch (e) {
      // Silently fail - audio is non-critical
    }
  }

  /// Dispose of the audio player
  static Future<void> dispose() async {
    await _player.dispose();
  }
}
