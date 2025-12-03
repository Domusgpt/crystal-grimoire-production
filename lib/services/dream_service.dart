import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';

/// Simple Dream Journal Service
/// Used by Guru consultation overlay to save consultations as journal entries
class DreamService {
  final FirebaseFirestore _firestore = FirebaseFirestore.instance;
  final FirebaseAuth _auth = FirebaseAuth.instance;

  /// Create a dream/journal entry
  Future<void> createDreamEntry(
    String content,
    String analysis,
    List<String> tags,
    String mood,
  ) async {
    final user = _auth.currentUser;
    if (user == null) {
      throw Exception('User not authenticated');
    }

    await _firestore
        .collection('users')
        .doc(user.uid)
        .collection('dreams')
        .add({
      'content': content,
      'analysis': analysis,
      'tags': tags,
      'mood': mood,
      'timestamp': FieldValue.serverTimestamp(),
      'createdAt': FieldValue.serverTimestamp(),
    });
  }
}
