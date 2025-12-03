import 'package:flutter/material.dart';
import '../theme/app_theme.dart';

/// 🚧 Coming Soon Card
/// Placeholder widget for future specialized AI guides
class ComingSoonCard extends StatelessWidget {
  final String title;
  final String icon;
  final String description;
  final List<String> features;

  const ComingSoonCard({
    super.key,
    required this.title,
    required this.icon,
    required this.description,
    this.features = const [],
  });

  /// Moon Ritual Expert preset
  static Widget moonRitual() {
    return const ComingSoonCard(
      title: 'Moon Ritual Expert Guide',
      icon: '🌙',
      description: 'Personalized moon phase rituals with your crystals and astrological chart.',
      features: [
        'Moon phase specific guidance',
        'Crystal recommendations for each phase',
        'Ritual design and timing',
        'Lunar calendar integration',
      ],
    );
  }

  /// Meditation Master preset
  static Widget meditation() {
    return const ComingSoonCard(
      title: 'Meditation Master',
      icon: '🧘',
      description: 'Guided crystal meditation practices and energy work.',
      features: [
        'Custom meditation scripts',
        'Crystal placement guidance',
        'Breathwork integration',
        'Chakra balancing practices',
      ],
    );
  }

  /// Sound Healer preset
  static Widget soundHealing() {
    return const ComingSoonCard(
      title: 'Sound Healing Expert',
      icon: '🔔',
      description: 'Crystal singing bowls, frequencies, and sound bath guidance.',
      features: [
        'Frequency recommendations',
        'Crystal singing bowl techniques',
        'Sound bath design',
        'Vibrational healing practices',
      ],
    );
  }

  /// Divination Oracle preset
  static Widget divination() {
    return const ComingSoonCard(
      title: 'Divination Master',
      icon: '🔮',
      description: 'I-Ching, Tarot, and crystal divination synthesis.',
      features: [
        'I-Ching readings',
        'Tarot card interpretations',
        'Crystal pendulum guidance',
        'Synchronicity analysis',
      ],
    );
  }

  /// Mandala Architect preset
  static Widget mandala() {
    return const ComingSoonCard(
      title: 'Mandala Architect',
      icon: '⭐',
      description: 'Sacred geometry and crystal grid design.',
      features: [
        'Crystal grid patterns',
        'Sacred geometry templates',
        'Intention setting rituals',
        'Energy amplification techniques',
      ],
    );
  }

  /// Crystal Sales Assistant preset
  static Widget crystalSales() {
    return const ComingSoonCard(
      title: 'Crystal Sales & Acquisition Assistant',
      icon: '💎',
      description: 'AI guidance for buying, selling, and valuing your crystals.',
      features: [
        'Crystal value estimation',
        'Buying recommendations',
        'Selling strategy advice',
        'Market insights',
      ],
    );
  }

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: () => _showDetailsDialog(context),
      child: Container(
        padding: const EdgeInsets.all(20),
        decoration: BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [
              AppTheme.crystalGlow.withOpacity(0.1),
              AppTheme.amethystPurple.withOpacity(0.1),
            ],
          ),
          borderRadius: BorderRadius.circular(16),
          border: Border.all(
            color: AppTheme.crystalGlow.withOpacity(0.3),
            width: 2,
          ),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Header
            Row(
              children: [
                Text(
                  icon,
                  style: const TextStyle(fontSize: 32),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Text(
                    title,
                    style: const TextStyle(
                      fontSize: 20,
                      fontWeight: FontWeight.bold,
                      color: Colors.white,
                    ),
                  ),
                ),
              ],
            ),

            const SizedBox(height: 16),

            // Coming Soon badge
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
              decoration: BoxDecoration(
                color: AppTheme.cosmicPurple.withOpacity(0.3),
                borderRadius: BorderRadius.circular(20),
                border: Border.all(
                  color: AppTheme.cosmicPurple,
                ),
              ),
              child: const Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(Icons.construction, size: 16, color: AppTheme.cosmicPurple),
                  SizedBox(width: 6),
                  Text(
                    'COMING SOON',
                    style: TextStyle(
                      color: AppTheme.cosmicPurple,
                      fontWeight: FontWeight.bold,
                      fontSize: 12,
                      letterSpacing: 1.2,
                    ),
                  ),
                ],
              ),
            ),

            const SizedBox(height: 16),

            // Description
            Text(
              description,
              style: const TextStyle(
                color: Colors.white70,
                fontSize: 16,
                height: 1.5,
              ),
            ),

            const SizedBox(height: 16),

            // Tap to learn more
            Row(
              children: [
                const Icon(Icons.info_outline, size: 16, color: AppTheme.crystalGlow),
                const SizedBox(width: 6),
                Text(
                  'Tap to learn more',
                  style: TextStyle(
                    color: AppTheme.crystalGlow.withOpacity(0.8),
                    fontSize: 14,
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  void _showDetailsDialog(BuildContext context) {
    showDialog(
      context: context,
      builder: (context) => Dialog(
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
              Text(icon, style: const TextStyle(fontSize: 64)),

              const SizedBox(height: 16),

              // Title
              Text(
                title,
                style: const TextStyle(
                  fontSize: 24,
                  fontWeight: FontWeight.bold,
                  color: Colors.white,
                ),
                textAlign: TextAlign.center,
              ),

              const SizedBox(height: 24),

              // Description
              Text(
                description,
                style: const TextStyle(
                  fontSize: 16,
                  color: Colors.white70,
                  height: 1.6,
                ),
                textAlign: TextAlign.center,
              ),

              if (features.isNotEmpty) ...[
                const SizedBox(height: 24),
                const Divider(color: Colors.white24),
                const SizedBox(height: 16),

                // Features
                const Text(
                  'Planned Features:',
                  style: TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.bold,
                    color: AppTheme.crystalGlow,
                  ),
                ),

                const SizedBox(height: 12),

                ...features.map((feature) => Padding(
                      padding: const EdgeInsets.symmetric(vertical: 4),
                      child: Row(
                        children: [
                          const Icon(Icons.check_circle, size: 20, color: AppTheme.crystalGlow),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Text(
                              feature,
                              style: const TextStyle(
                                color: Colors.white,
                                fontSize: 14,
                              ),
                            ),
                          ),
                        ],
                      ),
                    )),
              ],

              const SizedBox(height: 24),

              // Coming soon message
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: AppTheme.cosmicPurple.withOpacity(0.2),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(
                    color: AppTheme.cosmicPurple.withOpacity(0.5),
                  ),
                ),
                child: const Column(
                  children: [
                    Icon(Icons.access_time, color: AppTheme.cosmicPurple, size: 32),
                    SizedBox(height: 12),
                    Text(
                      'This specialized guide is currently in development.',
                      style: TextStyle(
                        color: Colors.white70,
                        fontSize: 14,
                      ),
                      textAlign: TextAlign.center,
                    ),
                    SizedBox(height: 8),
                    Text(
                      'Stay tuned for updates!',
                      style: TextStyle(
                        color: AppTheme.cosmicPurple,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 24),

              // Close button
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: () => Navigator.pop(context),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppTheme.crystalGlow,
                    padding: const EdgeInsets.symmetric(vertical: 16),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                  ),
                  child: const Text(
                    'Got It',
                    style: TextStyle(
                      color: Colors.black,
                      fontWeight: FontWeight.bold,
                      fontSize: 16,
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
