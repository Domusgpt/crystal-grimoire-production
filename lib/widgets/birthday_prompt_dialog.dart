import 'package:flutter/material.dart';
import '../services/guru_service.dart';
import '../theme/app_theme.dart';

/// 🌟 Birthday Prompt Dialog
/// Shows before first Guru use to optionally set birth date
class BirthdayPromptDialog extends StatefulWidget {
  const BirthdayPromptDialog({super.key});

  static Future<bool?> show(BuildContext context) {
    return showDialog<bool>(
      context: context,
      barrierDismissible: false,
      builder: (context) => const BirthdayPromptDialog(),
    );
  }

  @override
  State<BirthdayPromptDialog> createState() => _BirthdayPromptDialogState();
}

class _BirthdayPromptDialogState extends State<BirthdayPromptDialog> {
  DateTime? _selectedDate;
  bool _isLoading = false;

  Future<void> _selectDate() async {
    final date = await showDatePicker(
      context: context,
      initialDate: DateTime(1990, 1, 1),
      firstDate: DateTime(1900),
      lastDate: DateTime.now(),
      builder: (context, child) {
        return Theme(
          data: ThemeData.dark().copyWith(
            colorScheme: const ColorScheme.dark(
              primary: AppTheme.crystalGlow,
              onPrimary: Colors.black,
              surface: AppTheme.deepMystical,
              onSurface: Colors.white,
            ),
          ),
          child: child!,
        );
      },
    );

    if (date != null) {
      setState(() => _selectedDate = date);
    }
  }

  Future<void> _saveBirthDate() async {
    if (_selectedDate == null) return;

    setState(() => _isLoading = true);

    try {
      await GuruService().setBirthDate(_selectedDate!);
      if (mounted) {
        Navigator.of(context).pop(true);
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Error: $e'),
            backgroundColor: Colors.red,
          ),
        );
      }
      setState(() => _isLoading = false);
    }
  }

  Future<void> _skip() async {
    await GuruService().markBirthdayPromptSeen();
    if (mounted) {
      Navigator.of(context).pop(false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Dialog(
      backgroundColor: Colors.transparent,
      child: Container(
        padding: const EdgeInsets.all(24),
        decoration: BoxDecoration(
          gradient: const LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [
              AppTheme.deepMystical,
              AppTheme.darkViolet,
            ],
          ),
          borderRadius: BorderRadius.circular(24),
          border: Border.all(
            color: AppTheme.crystalGlow.withOpacity(0.3),
            width: 2,
          ),
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            // Icon
            Container(
              width: 80,
              height: 80,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                gradient: RadialGradient(
                  colors: [
                    AppTheme.crystalGlow.withOpacity(0.3),
                    Colors.transparent,
                  ],
                ),
              ),
              child: const Icon(
                Icons.stars,
                size: 48,
                color: AppTheme.crystalGlow,
              ),
            ),

            const SizedBox(height: 24),

            // Title
            const Text(
              'Enhance Your Guidance',
              style: TextStyle(
                fontSize: 24,
                fontWeight: FontWeight.bold,
                color: Colors.white,
              ),
              textAlign: TextAlign.center,
            ),

            const SizedBox(height: 16),

            // Description
            const Text(
              'The cosmos speaks more clearly when aligned with your star sign.\n\nShare your birth date for astrological insights.',
              style: TextStyle(
                fontSize: 16,
                color: Colors.white70,
                height: 1.5,
              ),
              textAlign: TextAlign.center,
            ),

            const SizedBox(height: 32),

            // Selected date display
            if (_selectedDate != null) ...[
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: AppTheme.crystalGlow.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(
                    color: AppTheme.crystalGlow.withOpacity(0.3),
                  ),
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    const Icon(Icons.calendar_today, color: AppTheme.crystalGlow, size: 20),
                    const SizedBox(width: 12),
                    Text(
                      '${_selectedDate!.month}/${_selectedDate!.day}/${_selectedDate!.year}',
                      style: const TextStyle(
                        color: AppTheme.crystalGlow,
                        fontSize: 18,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 16),
            ],

            // Set date button
            SizedBox(
              width: double.infinity,
              height: 56,
              child: ElevatedButton(
                onPressed: _selectedDate == null ? _selectDate : _saveBirthDate,
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppTheme.crystalGlow,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(28),
                  ),
                ),
                child: _isLoading
                    ? const SizedBox(
                        width: 24,
                        height: 24,
                        child: CircularProgressIndicator(
                          color: Colors.black,
                          strokeWidth: 2,
                        ),
                      )
                    : Text(
                        _selectedDate == null ? 'Set Birth Date' : 'Save & Continue',
                        style: const TextStyle(
                          color: Colors.black,
                          fontSize: 18,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
              ),
            ),

            const SizedBox(height: 12),

            // Skip button
            TextButton(
              onPressed: _isLoading ? null : _skip,
              child: const Text(
                'Skip for Now',
                style: TextStyle(
                  color: Colors.white60,
                  fontSize: 16,
                ),
              ),
            ),

            const SizedBox(height: 8),

            // Privacy note
            const Text(
              'Your birth date is optional and private',
              style: TextStyle(
                color: Colors.white38,
                fontSize: 12,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
