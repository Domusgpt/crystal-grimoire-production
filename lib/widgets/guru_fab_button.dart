import 'package:flutter/material.dart';
import '../services/guru_service.dart';
import '../theme/app_theme.dart';
import 'guru_consultation_overlay.dart';

/// 🔮 Guru FAB Button
/// Always-visible floating action button to access the Crystal Healing Guru
class GuruFABButton extends StatefulWidget {
  const GuruFABButton({super.key});

  @override
  State<GuruFABButton> createState() => _GuruFABButtonState();
}

class _GuruFABButtonState extends State<GuruFABButton> with SingleTickerProviderStateMixin {
  late AnimationController _pulseController;
  late Animation<double> _pulseAnimation;
  GuruAvailability? _availability;

  @override
  void initState() {
    super.initState();
    
    // Pulse animation
    _pulseController = AnimationController(
      duration: const Duration(seconds: 2),
      vsync: this,
    )..repeat(reverse: true);

    _pulseAnimation = Tween<double>(begin: 1.0, end: 1.15).animate(
      CurvedAnimation(parent: _pulseController, curve: Curves.easeInOut),
    );

    _checkAvailability();
  }

  Future<void> _checkAvailability() async {
    try {
      final availability = await GuruService().checkAvailability();
      if (mounted) {
        setState(() => _availability = availability);
      }
    } catch (e) {
      print('Error checking availability: $e');
    }
  }

  @override
  Widget build(BuildContext context) {
    final canConsult = _availability?.canConsult ?? true;
    final remaining = _availability?.remainingToday ?? 1;

    return Stack(
      children: [
        // Main FAB
        ScaleTransition(
          scale: canConsult ? _pulseAnimation : const AlwaysStoppedAnimation(1.0),
          child: FloatingActionButton(
            onPressed: () async {
              await GuruConsultationOverlay.show(context);
              // Refresh availability after consultation
              _checkAvailability();
            },
            backgroundColor: canConsult ? AppTheme.crystalGlow : Colors.grey,
            elevation: 8,
            child: Icon(
              Icons.auto_awesome,
              color: canConsult ? Colors.black : Colors.white54,
              size: 28,
            ),
          ),
        ),

        // Badge showing remaining consultations
        if (remaining > 0)
          Positioned(
            right: 0,
            top: 0,
            child: Container(
              padding: const EdgeInsets.all(6),
              decoration: const BoxDecoration(
                color: AppTheme.cosmicPurple,
                shape: BoxShape.circle,
              ),
              child: Text(
                '$remaining',
                style: const TextStyle(
                  color: Colors.white,
                  fontSize: 12,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ),
          ),
      ],
    );
  }

  @override
  void dispose() {
    _pulseController.dispose();
    super.dispose();
  }
}
