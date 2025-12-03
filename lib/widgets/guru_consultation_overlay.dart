import 'package:flutter/material.dart';
import 'package:flutter_markdown/flutter_markdown.dart';
import '../services/guru_service.dart';
import '../services/dream_service.dart';
import '../theme/app_theme.dart';
import 'birthday_prompt_dialog.dart';

/// 🔮 Crystal Healing Guru Consultation Overlay
/// Floating modal that can be shown from anywhere in the app
class GuruConsultationOverlay extends StatefulWidget {
  const GuruConsultationOverlay({super.key});

  /// Show the overlay from anywhere
  static Future<void> show(BuildContext context) async {
    // Check if should show birthday prompt first
    final shouldShowBirthday = await GuruService().shouldShowBirthdayPrompt();
    
    if (shouldShowBirthday && context.mounted) {
      await BirthdayPromptDialog.show(context);
    }

    if (context.mounted) {
      await showModalBottomSheet(
        context: context,
        isScrollControlled: true,
        backgroundColor: Colors.transparent,
        builder: (context) => const GuruConsultationOverlay(),
      );
    }
  }

  @override
  State<GuruConsultationOverlay> createState() => _GuruConsultationOverlayState();
}

class _GuruConsultationOverlayState extends State<GuruConsultationOverlay> {
  final _questionController = TextEditingController();
  final _guruService = GuruService();
  
  bool _isLoading = false;
  GuruResponse? _response;
  String? _error;
  GuruAvailability? _availability;

  @override
  void initState() {
    super.initState();
    _checkAvailability();
  }

  Future<void> _checkAvailability() async {
    try {
      final availability = await _guruService.checkAvailability();
      setState(() => _availability = availability);
    } catch (e) {
      print('Error checking availability: $e');
    }
  }

  Future<void> _consultGuru() async {
    if (_questionController.text.trim().isEmpty) {
      setState(() => _error = 'Please enter a question');
      return;
    }

    setState(() {
      _isLoading = true;
      _error = null;
      _response = null;
    });

    try {
      final response = await _guruService.consultGuru(_questionController.text);
      setState(() {
        _response = response;
        _isLoading = false;
      });
    } on GuruException catch (e) {
      setState(() {
        _error = e.message;
        _isLoading = false;
      });
    } catch (e) {
      setState(() {
        _error = 'An unexpected error occurred';
        _isLoading = false;
      });
    }
  }

  Future<void> _saveToJournal() async {
    if (_response == null) return;

    try {
      final dreamService = DreamService();
      await dreamService.createDreamEntry(
        '[COSMIC CONSULTATION]\n\nQ: ${_questionController.text}\n\nA: ${_response!.guidance}',
        _response!.guidance,
        [],
        'spiritual',
      );

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('✨ Saved to your journal'),
            backgroundColor: AppTheme.crystalGlow,
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Failed to save: $e'),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      height: MediaQuery.of(context).size.height * 0.9,
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topCenter,
          end: Alignment.bottomCenter,
          colors: [
            AppTheme.deepMystical,
            AppTheme.darkViolet,
            Colors.black,
          ],
        ),
        borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
      ),
      child: Column(
        children: [
          // Header
          Padding(
            padding: const EdgeInsets.all(16),
            child: Row(
              children: [
                const Text(
                  '🔮 The Universe Speaks',
                  style: TextStyle(
                    fontSize: 24,
                    fontWeight: FontWeight.bold,
                    color: Colors.white,
                  ),
                ),
                const Spacer(),
                IconButton(
                  icon: const Icon(Icons.close, color: Colors.white),
                  onPressed: () => Navigator.pop(context),
                ),
              ],
            ),
          ),

          const Divider(color: Colors.white24, height: 1),

          // Content
          Expanded(
            child: SingleChildScrollView(
              padding: const EdgeInsets.all(24),
              child: _response != null
                  ? _buildGuidanceDisplay()
                  : _buildQuestionForm(),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildQuestionForm() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          'What guidance do you seek, crystal seeker?',
          style: TextStyle(
            fontSize: 18,
            color: Colors.white70,
            fontStyle: FontStyle.italic,
          ),
        ),
        const SizedBox(height: 24),

        // Question input
        Container(
          decoration: BoxDecoration(
            color: Colors.white.withOpacity(0.1),
            borderRadius: BorderRadius.circular(16),
            border: Border.all(
              color: AppTheme.crystalGlow.withOpacity(0.3),
            ),
          ),
          child: TextField(
            controller: _questionController,
            maxLines: 5,
            style: const TextStyle(color: Colors.white),
            decoration: const InputDecoration(
              hintText: 'Ask your question...\n\nExamples:\n- I feel anxious, what crystals can help?\n- Guide me to design a meditation practice\n- What energies surround me today?',
              hintStyle: TextStyle(color: Colors.white38),
              border: InputBorder.none,
              contentPadding: EdgeInsets.all(20),
            ),
          ),
        ),

        if (_error != null) ...[
          const SizedBox(height: 16),
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: Colors.red.withOpacity(0.2),
              borderRadius: BorderRadius.circular(8),
              border: Border.all(color: Colors.red),
            ),
            child: Row(
              children: [
                const Icon(Icons.error_outline, color: Colors.red),
                const SizedBox(width: 12),
                Expanded(
                  child: Text(
                    _error!,
                    style: const TextStyle(color: Colors.red),
                  ),
                ),
              ],
            ),
          ),
        ],

        const SizedBox(height: 24),

        // Availability info
        if (_availability != null) ...[
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: AppTheme.crystalGlow.withOpacity(0.1),
              borderRadius: BorderRadius.circular(12),
              border: Border.all(
                color: AppTheme.crystalGlow.withOpacity(0.3),
              ),
            ),
            child: Column(
              children: [
                Row(
                  children: [
                    const Icon(Icons.star, color: AppTheme.crystalGlow, size: 20),
                    const SizedBox(width: 8),
                    Text(
                      'Free consultations today: ${_availability!.remainingToday}',
                      style: const TextStyle(
                        color: AppTheme.crystalGlow,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ],
                ),
                if (_availability!.tier == 'free') ...[
                  const SizedBox(height: 8),
                  const Text(
                    'Upgrade for unlimited daily consultations',
                    style: TextStyle(color: Colors.white60, fontSize: 12),
                  ),
                ],
              ],
            ),
          ),
          const SizedBox(height: 24),
        ],

        // Submit button
        SizedBox(
          width: double.infinity,
          height: 56,
          child: ElevatedButton(
            onPressed: _isLoading || (_availability?.canConsult == false)
                ? null
                : _consultGuru,
            style: ElevatedButton.styleFrom(
              backgroundColor: AppTheme.crystalGlow,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(28),
              ),
              elevation: 8,
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
                : const Text(
                    'Channel Cosmic Wisdom ✨',
                    style: TextStyle(
                      color: Colors.black,
                      fontSize: 18,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
          ),
        ),

        if (_isLoading) ...[
          const SizedBox(height: 24),
          const Center(
            child: Column(
              children: [
                Icon(
                  Icons.auto_awesome,
                  size: 48,
                  color: AppTheme.crystalGlow,
                ),
                SizedBox(height: 16),
                Text(
                  'The universe aligns to answer your call...',
                  style: TextStyle(
                    color: Colors.white70,
                    fontStyle: FontStyle.italic,
                  ),
                  textAlign: TextAlign.center,
                ),
              ],
            ),
          ),
        ],
      ],
    );
  }

  Widget _buildGuidanceDisplay() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Question
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: Colors.white.withOpacity(0.05),
            borderRadius: BorderRadius.circular(12),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text(
                'Your Question:',
                style: TextStyle(
                  color: AppTheme.crystalGlow,
                  fontWeight: FontWeight.bold,
                ),
              ),
              const SizedBox(height: 8),
              Text(
                _questionController.text,
                style: const TextStyle(
                  color: Colors.white70,
                  fontStyle: FontStyle.italic,
                ),
              ),
            ],
          ),
        ),

        const SizedBox(height: 24),
        const Divider(color: Colors.white24),
        const SizedBox(height: 24),

        // Guidance
        const Row(
          children: [
            Icon(Icons.auto_awesome, color: AppTheme.crystalGlow),
            SizedBox(width: 8),
            Text(
              'Cosmic Guidance',
              style: TextStyle(
                fontSize: 20,
                fontWeight: FontWeight.bold,
                color: Colors.white,
              ),
            ),
          ],
        ),

        const SizedBox(height: 16),

        // Render guidance as markdown
        Container(
          padding: const EdgeInsets.all(20),
          decoration: BoxDecoration(
            color: Colors.white.withOpacity(0.05),
            borderRadius: BorderRadius.circular(16),
            border: Border.all(
              color: AppTheme.crystalGlow.withOpacity(0.2),
            ),
          ),
          child: MarkdownBody(
            data: _response!.guidance,
            styleSheet: MarkdownStyleSheet(
              p: const TextStyle(color: Colors.white, fontSize: 16, height: 1.6),
              h1: const TextStyle(color: AppTheme.crystalGlow, fontSize: 24, fontWeight: FontWeight.bold),
              h2: const TextStyle(color: AppTheme.crystalGlow, fontSize: 20, fontWeight: FontWeight.bold),
              h3: const TextStyle(color: AppTheme.crystalGlow, fontSize: 18, fontWeight: FontWeight.bold),
              strong: const TextStyle(color: AppTheme.crystalGlow, fontWeight: FontWeight.bold),
              em: const TextStyle(color: Colors.white70, fontStyle: FontStyle.italic),
              listBullet: const TextStyle(color: AppTheme.crystalGlow),
            ),
          ),
        ),

        const SizedBox(height: 32),

        // Action buttons
        Row(
          children: [
            Expanded(
              child: OutlinedButton.icon(
                onPressed: _saveToJournal,
                icon: const Icon(Icons.book, color: AppTheme.crystalGlow),
                label: const Text(
                  'Save to Journal',
                  style: TextStyle(color: AppTheme.crystalGlow),
                ),
                style: OutlinedButton.styleFrom(
                  padding: const EdgeInsets.symmetric(vertical: 16),
                  side: const BorderSide(color: AppTheme.crystalGlow),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                ),
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: ElevatedButton.icon(
                onPressed: () {
                  setState(() {
                    _response = null;
                    _error = null;
                    _questionController.clear();
                  });
                  _checkAvailability();
                },
                icon: const Icon(Icons.refresh, color: Colors.black),
                label: const Text(
                  'Ask Again',
                  style: TextStyle(color: Colors.black, fontWeight: FontWeight.bold),
                ),
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppTheme.crystalGlow,
                  padding: const EdgeInsets.symmetric(vertical: 16),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                ),
              ),
            ),
          ],
        ),

        if (_response!.remainingToday > 0) ...[
          const SizedBox(height: 16),
          Center(
            child: Text(
              '${_response!.remainingToday} consultation${_response!.remainingToday == 1 ? '' : 's'} remaining today',
              style: const TextStyle(
                color: Colors.white60,
                fontSize: 12,
              ),
            ),
          ),
        ],
      ],
    );
  }

  @override
  void dispose() {
    _questionController.dispose();
    super.dispose();
  }
}
