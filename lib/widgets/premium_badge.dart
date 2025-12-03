import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

/// A beautiful animated premium badge that glows and pulses
class PremiumBadge extends StatefulWidget {
  final String tier;
  final bool mini;
  final bool showLabel;

  const PremiumBadge({
    super.key,
    required this.tier,
    this.mini = false,
    this.showLabel = true,
  });

  @override
  State<PremiumBadge> createState() => _PremiumBadgeState();
}

class _PremiumBadgeState extends State<PremiumBadge>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  late Animation<double> _glowAnimation;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      duration: const Duration(milliseconds: 2000),
      vsync: this,
    )..repeat(reverse: true);

    _glowAnimation = Tween<double>(begin: 0.5, end: 1.0).animate(
      CurvedAnimation(parent: _controller, curve: Curves.easeInOut),
    );
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  Color get _tierColor {
    switch (widget.tier.toLowerCase()) {
      case 'premium':
        return Colors.amber;
      case 'pro':
        return Colors.purple;
      case 'founders':
        return const Color(0xFFFFD700); // Gold
      default:
        return Colors.grey;
    }
  }

  IconData get _tierIcon {
    switch (widget.tier.toLowerCase()) {
      case 'premium':
        return Icons.diamond_outlined;
      case 'pro':
        return Icons.auto_awesome;
      case 'founders':
        return Icons.stars;
      default:
        return Icons.workspace_premium;
    }
  }

  String get _tierLabel {
    switch (widget.tier.toLowerCase()) {
      case 'premium':
        return 'PREMIUM';
      case 'pro':
        return 'PRO';
      case 'founders':
        return 'FOUNDERS';
      default:
        return widget.tier.toUpperCase();
    }
  }

  @override
  Widget build(BuildContext context) {
    if (widget.tier.toLowerCase() == 'free') {
      return const SizedBox.shrink();
    }

    return AnimatedBuilder(
      animation: _glowAnimation,
      builder: (context, child) {
        final glowValue = _glowAnimation.value;

        if (widget.mini) {
          return Container(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
            decoration: BoxDecoration(
              gradient: LinearGradient(
                colors: [
                  _tierColor.withOpacity(0.3 * glowValue),
                  _tierColor.withOpacity(0.5 * glowValue),
                ],
              ),
              borderRadius: BorderRadius.circular(12),
              border: Border.all(
                color: _tierColor.withOpacity(0.6 * glowValue),
                width: 1,
              ),
              boxShadow: [
                BoxShadow(
                  color: _tierColor.withOpacity(0.3 * glowValue),
                  blurRadius: 8,
                  spreadRadius: 1,
                ),
              ],
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(
                  _tierIcon,
                  size: 14,
                  color: _tierColor,
                ),
                if (widget.showLabel) ...[
                  const SizedBox(width: 4),
                  Text(
                    _tierLabel,
                    style: GoogleFonts.cinzel(
                      fontSize: 10,
                      fontWeight: FontWeight.bold,
                      color: _tierColor,
                      letterSpacing: 1,
                    ),
                  ),
                ],
              ],
            ),
          );
        }

        return Container(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
          decoration: BoxDecoration(
            gradient: LinearGradient(
              colors: [
                _tierColor.withOpacity(0.2 * glowValue),
                _tierColor.withOpacity(0.4 * glowValue),
              ],
            ),
            borderRadius: BorderRadius.circular(20),
            border: Border.all(
              color: _tierColor.withOpacity(0.7 * glowValue),
              width: 1.5,
            ),
            boxShadow: [
              BoxShadow(
                color: _tierColor.withOpacity(0.4 * glowValue),
                blurRadius: 15,
                spreadRadius: 2,
              ),
            ],
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(
                _tierIcon,
                size: 20,
                color: _tierColor,
              ),
              if (widget.showLabel) ...[
                const SizedBox(width: 8),
                Text(
                  _tierLabel,
                  style: GoogleFonts.cinzel(
                    fontSize: 14,
                    fontWeight: FontWeight.bold,
                    color: _tierColor,
                    letterSpacing: 1.5,
                    shadows: [
                      Shadow(
                        color: _tierColor.withOpacity(0.5),
                        blurRadius: 5,
                      ),
                    ],
                  ),
                ),
              ],
            ],
          ),
        );
      },
    );
  }
}

/// A premium glow effect that wraps any widget
class PremiumGlowWrapper extends StatefulWidget {
  final Widget child;
  final String tier;
  final bool enabled;

  const PremiumGlowWrapper({
    super.key,
    required this.child,
    required this.tier,
    this.enabled = true,
  });

  @override
  State<PremiumGlowWrapper> createState() => _PremiumGlowWrapperState();
}

class _PremiumGlowWrapperState extends State<PremiumGlowWrapper>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      duration: const Duration(milliseconds: 3000),
      vsync: this,
    )..repeat(reverse: true);
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  Color get _glowColor {
    switch (widget.tier.toLowerCase()) {
      case 'premium':
        return Colors.amber;
      case 'pro':
        return Colors.purple;
      case 'founders':
        return const Color(0xFFFFD700);
      default:
        return Colors.transparent;
    }
  }

  @override
  Widget build(BuildContext context) {
    if (!widget.enabled || widget.tier.toLowerCase() == 'free') {
      return widget.child;
    }

    return AnimatedBuilder(
      animation: _controller,
      builder: (context, child) {
        return Container(
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(16),
            boxShadow: [
              BoxShadow(
                color: _glowColor.withOpacity(0.15 + 0.1 * _controller.value),
                blurRadius: 15 + 5 * _controller.value,
                spreadRadius: 2,
              ),
            ],
          ),
          child: widget.child,
        );
      },
    );
  }
}

/// Header banner showing user's premium status
class PremiumStatusBanner extends StatelessWidget {
  final String tier;
  final VoidCallback? onUpgrade;

  const PremiumStatusBanner({
    super.key,
    required this.tier,
    this.onUpgrade,
  });

  @override
  Widget build(BuildContext context) {
    final isPremium = tier.toLowerCase() != 'free';

    if (isPremium) {
      return Container(
        margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          gradient: LinearGradient(
            colors: [
              Colors.purple.withOpacity(0.2),
              Colors.amber.withOpacity(0.2),
            ],
          ),
          borderRadius: BorderRadius.circular(16),
          border: Border.all(
            color: Colors.amber.withOpacity(0.3),
          ),
        ),
        child: Row(
          children: [
            PremiumBadge(tier: tier, showLabel: false),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Ascended Status Active',
                    style: GoogleFonts.cinzel(
                      color: Colors.white,
                      fontSize: 14,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    'Unlimited access to all mystical features',
                    style: GoogleFonts.crimsonText(
                      color: Colors.white70,
                      fontSize: 12,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      );
    }

    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white.withOpacity(0.05),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: Colors.purple.withOpacity(0.3),
        ),
      ),
      child: Row(
        children: [
          const Icon(
            Icons.lock_outline,
            color: Colors.amber,
            size: 28,
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Unlock Premium Features',
                  style: GoogleFonts.cinzel(
                    color: Colors.white,
                    fontSize: 14,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  'Unlimited identifications & AI guidance',
                  style: GoogleFonts.crimsonText(
                    color: Colors.white70,
                    fontSize: 12,
                  ),
                ),
              ],
            ),
          ),
          if (onUpgrade != null)
            TextButton(
              onPressed: onUpgrade,
              style: TextButton.styleFrom(
                backgroundColor: Colors.amber.withOpacity(0.2),
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              ),
              child: Text(
                'Upgrade',
                style: GoogleFonts.cinzel(
                  color: Colors.amber,
                  fontWeight: FontWeight.bold,
                  fontSize: 12,
                ),
              ),
            ),
        ],
      ),
    );
  }
}
