import 'package:cloud_functions/cloud_functions.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';

/// 🔮 Crystal Healing Guru Service
/// Provides access to the mystical AI consultant through Cloud Functions
class GuruService {
  static final GuruService _instance = GuruService._internal();
  factory GuruService() => _instance;
  GuruService._internal();

  final _functions = FirebaseFunctions.instance;
  final _firestore = FirebaseFirestore.instance;
  final _auth = FirebaseAuth.instance;

  /// Check if user can consult today (has remaining consultations)
  Future<GuruAvailability> checkAvailability() async {
    final userId = _auth.currentUser?.uid;
    if (userId == null) {
      throw Exception('User not authenticated');
    }

    final userDoc = await _firestore.collection('users').doc(userId).get();
    final userData = userDoc.data();
    
    if (userData == null) {
      throw Exception('User data not found');
    }

    final tier = userData['tier'] ?? 'free';
    final today = DateTime.now().toIso8601String().split('T')[0]; // YYYY-MM-DD
    final lastConsultDate = userData['metaphysical']?['lastConsultDate'];
    final dailyCount = userData['metaphysical']?['dailyConsultCount'] ?? 0;

    // Daily limits by tier
    final limits = {
      'free': 1,
      'premium': 5,
      'pro': 20,
      'founders': 999,
    };

    final userLimit = limits[tier] ?? 1;
    final isNewDay = lastConsultDate != today;
    final remaining = isNewDay ? userLimit : (userLimit - dailyCount);

    return GuruAvailability(
      canConsult: remaining > 0,
      remainingToday: remaining.clamp(0, userLimit).toInt(),
      tier: tier,
      limit: userLimit,
    );
  }

  /// Consult the Crystal Healing Guru
  Future<GuruResponse> consultGuru(String question) async {
    print('🔮 Consulting the Guru...');

    final callable = _functions.httpsCallable('consultCrystalGuru');
    
    try {
      final result = await callable.call({
        'question': question,
      });

      final data = result.data as Map<String, dynamic>;

      return GuruResponse(
        consultationId: data['consultationId'],
        guidance: data['guidance'],
        tokensUsed: data['tokensUsed'],
        remainingToday: data['remainingToday'],
        canConsultAgain: data['canConsultAgain'],
      );
    } on FirebaseFunctionsException catch (e) {
      print('❌ Guru error: ${e.code} - ${e.message}');
      
      if (e.code == 'resource-exhausted') {
        throw GuruException('Daily consultation limit reached. Try again tomorrow or upgrade your plan.');
      }
      
      throw GuruException(e.message ?? 'Failed to consult the Guru');
    } catch (e) {
      print('❌ Unexpected error: $e');
      throw GuruException('An unexpected error occurred. Please try again.');
    }
  }

  /// Get user's consultation history
  Stream<List<GuruConsultation>> getConsultationHistory() {
    final userId = _auth.currentUser?.uid;
    if (userId == null) {
      return Stream.value([]);
    }

    return _firestore
        .collection('users')
        .doc(userId)
        .collection('consultations')
        .orderBy('createdAt', descending: true)
        .limit(20)
        .snapshots()
        .map((snapshot) {
      return snapshot.docs.map((doc) {
        final data = doc.data();
        return GuruConsultation(
          id: doc.id,
          question: data['question'],
          guidance: data['guidance'],
          createdAt: (data['createdAt'] as Timestamp?)?.toDate() ?? DateTime.now(),
        );
      }).toList();
    });
  }

  /// Check if user has set birth date
  Future<bool> hasBirthDate() async {
    final userId = _auth.currentUser?.uid;
    if (userId == null) return false;

    final userDoc = await _firestore.collection('users').doc(userId).get();
    final userData = userDoc.data();
    
    return userData?['metaphysical']?['birthDate'] != null;
  }

  /// Set user's birth date
  Future<void> setBirthDate(DateTime birthDate) async {
    final userId = _auth.currentUser?.uid;
    if (userId == null) {
      throw Exception('User not authenticated');
    }

    await _firestore.collection('users').doc(userId).update({
      'metaphysical.birthDate': Timestamp.fromDate(birthDate),
      'metaphysical.hasSeenBirthdayPrompt': true,
    });

    print('✅ Birth date set successfully');
  }

  /// Mark that user has seen birthday prompt (they skipped)
  Future<void> markBirthdayPromptSeen() async {
    final userId = _auth.currentUser?.uid;
    if (userId == null) return;

    await _firestore.collection('users').doc(userId).update({
      'metaphysical.hasSeenBirthdayPrompt': true,
    });
  }

  /// Check if should show birthday prompt
  Future<bool> shouldShowBirthdayPrompt() async {
    final userId = _auth.currentUser?.uid;
    if (userId == null) return false;

    final userDoc = await _firestore.collection('users').doc(userId).get();
    final userData = userDoc.data();
    
    final hasSeenPrompt = userData?['metaphysical']?['hasSeenBirthdayPrompt'] ?? false;
    final hasBirthDate = userData?['metaphysical']?['birthDate'] != null;

    return !hasSeenPrompt && !hasBirthDate;
  }
}

/// Guru availability status
class GuruAvailability {
  final bool canConsult;
  final int remainingToday;
  final String tier;
  final int limit;

  GuruAvailability({
    required this.canConsult,
    required this.remainingToday,
    required this.tier,
    required this.limit,
  });
}

/// Guru response data
class GuruResponse {
  final String consultationId;
  final String guidance;
  final int tokensUsed;
  final int remainingToday;
  final bool canConsultAgain;

  GuruResponse({
    required this.consultationId,
    required this.guidance,
    required this.tokensUsed,
    required this.remainingToday,
    required this.canConsultAgain,
  });
}

/// Consultation history item
class GuruConsultation {
  final String id;
  final String question;
  final String guidance;
  final DateTime createdAt;

  GuruConsultation({
    required this.id,
    required this.question,
    required this.guidance,
    required this.createdAt,
  });
}

/// Custom exception for Guru errors
class GuruException implements Exception {
  final String message;
  GuruException(this.message);

  @override
  String toString() => message;
}
