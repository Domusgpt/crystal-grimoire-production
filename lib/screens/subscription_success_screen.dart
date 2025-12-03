import 'dart:math';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

/// Beautiful animated success screen shown after successful subscription purchase
class SubscriptionSuccessScreen extends StatefulWidget {
  final String tierName;
  final String? customMessage;

  const SubscriptionSuccessScreen({
    super.key,
    required this.tierName,
    this.customMessage,
  });

  @override
  State<SubscriptionSuccessScreen> createState() => _SubscriptionSuccessScreenState();
}

class _SubscriptionSuccessScreenState extends State<SubscriptionSuccessScreen>
    with TickerProviderStateMixin {
  late AnimationController _crystalController;
  late AnimationController _glowController;
  late AnimationController _textController;
  late AnimationController _particleController;

  late Animation<double> _crystalScale;
  late Animation<double> _crystalRotation;
  late Animation<double> _glowOpacity;
  late Animation<double> _textOpacity;
  late Animation<Offset> _textSlide;

  final List<_Particle> _particles = [];
  final Random _random = Random();

  @override
  void initState() {
    super.initState();
    _initAnimations();
    _generateParticles();
  }

  void _initAnimations() {
    // Crystal entrance animation
    _crystalController = AnimationController(
      duration: const Duration(milliseconds: 1500),
      vsync: this,
    );

    _crystalScale = Tween<double>(begin: 0.0, end: 1.0).animate(
      CurvedAnimation(
        parent: _crystalController,
        curve: Curves.elasticOut,
      ),
    );

    _crystalRotation = Tween<double>(begin: 0, end: 2 * pi).animate(
      CurvedAnimation(
        parent: _crystalController,
        curve: Curves.easeOutQuart,
      ),
    );

    // Continuous glow pulsing
    _glowController = AnimationController(
      duration: const Duration(milliseconds: 2000),
      vsync: this,
    )..repeat(reverse: true);

    _glowOpacity = Tween<double>(begin: 0.4, end: 1.0).animate(
      CurvedAnimation(
        parent: _glowController,
        curve: Curves.easeInOut,
      ),
    );

    // Text entrance animation
    _textController = AnimationController(
      duration: const Duration(milliseconds: 800),
      vsync: this,
    );

    _textOpacity = Tween<double>(begin: 0.0, end: 1.0).animate(
      CurvedAnimation(
        parent: _textController,
        curve: const Interval(0.0, 0.6, curve: Curves.easeOut),
      ),
    );

    _textSlide = Tween<Offset>(
      begin: const Offset(0, 0.3),
      end: Offset.zero,
    ).animate(
      CurvedAnimation(
        parent: _textController,
        curve: Curves.easeOutQuart,
      ),
    );

    // Particle animation
    _particleController = AnimationController(
      duration: const Duration(seconds: 10),
      vsync: this,
    )..repeat();

    // Start animations in sequence
    _crystalController.forward().then((_) {
      _textController.forward();
    });
  }

  void _generateParticles() {
    for (int i = 0; i < 50; i++) {
      _particles.add(_Particle(
        x: _random.nextDouble(),
        y: _random.nextDouble(),
        size: _random.nextDouble() * 4 + 2,
        speed: _random.nextDouble() * 0.5 + 0.2,
        opacity: _random.nextDouble() * 0.5 + 0.3,
        hue: _random.nextDouble() * 60 + 30, // Golden to amber hues
      ));
    }
  }

  @override
  void dispose() {
    _crystalController.dispose();
    _glowController.dispose();
    _textController.dispose();
    _particleController.dispose();
    super.dispose();
  }

  String get _tierDisplayName {
    switch (widget.tierName.toLowerCase()) {
      case 'premium':
        return 'Crystal Premium';
      case 'pro':
        return 'Crystal Pro';
      case 'founders':
        return 'Founders Circle';
      default:
        return widget.tierName;
    }
  }

  String get _thankYouMessage {
    if (widget.customMessage != null) return widget.customMessage!;

    switch (widget.tierName.toLowerCase()) {
      case 'premium':
        return 'Your spiritual journey has evolved. Unlimited crystal wisdom now flows through you.';
      case 'pro':
        return 'Welcome to the inner sanctum. Advanced spiritual guidance is now yours.';
      case 'founders':
        return 'You are now part of an exclusive circle. Lifetime access to all mysteries has been granted.';
      default:
        return 'Your subscription is now active. Thank you for your support!';
    }
  }

  IconData get _tierIcon {
    switch (widget.tierName.toLowerCase()) {
      case 'premium':
        return Icons.diamond_outlined;
      case 'pro':
        return Icons.auto_awesome;
      case 'founders':
        return Icons.stars;
      default:
        return Icons.check_circle_outline;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Container(
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
            colors: [
              Color(0xFF0F0F23),
              Color(0xFF1A1A3E),
              Color(0xFF0F0F23),
            ],
          ),
        ),
        child: Stack(
          children: [
            // Animated particle field
            AnimatedBuilder(
              animation: _particleController,
              builder: (context, child) {
                return CustomPaint(
                  painter: _ParticlePainter(
                    particles: _particles,
                    progress: _particleController.value,
                  ),
                  size: Size.infinite,
                );
              },
            ),

            // Main content
            SafeArea(
              child: Center(
                child: Padding(
                  padding: const EdgeInsets.all(32.0),
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      // Animated crystal/icon
                      AnimatedBuilder(
                        animation: Listenable.merge([_crystalController, _glowController]),
                        builder: (context, child) {
                          return Transform.scale(
                            scale: _crystalScale.value,
                            child: Transform.rotate(
                              angle: _crystalRotation.value * 0.1,
                              child: Container(
                                width: 140,
                                height: 140,
                                decoration: BoxDecoration(
                                  shape: BoxShape.circle,
                                  gradient: RadialGradient(
                                    colors: [
                                      Colors.amber.withOpacity(0.3 * _glowOpacity.value),
                                      Colors.purple.withOpacity(0.2 * _glowOpacity.value),
                                      Colors.transparent,
                                    ],
                                  ),
                                  boxShadow: [
                                    BoxShadow(
                                      color: Colors.amber.withOpacity(0.3 * _glowOpacity.value),
                                      blurRadius: 40,
                                      spreadRadius: 20,
                                    ),
                                    BoxShadow(
                                      color: Colors.purple.withOpacity(0.2 * _glowOpacity.value),
                                      blurRadius: 60,
                                      spreadRadius: 30,
                                    ),
                                  ],
                                ),
                                child: Icon(
                                  _tierIcon,
                                  size: 80,
                                  color: Colors.amber,
                                ),
                              ),
                            ),
                          );
                        },
                      ),

                      const SizedBox(height: 48),

                      // Animated text content
                      SlideTransition(
                        position: _textSlide,
                        child: FadeTransition(
                          opacity: _textOpacity,
                          child: Column(
                            children: [
                              // Welcome text
                              Text(
                                'Welcome, Ascended One',
                                textAlign: TextAlign.center,
                                style: GoogleFonts.cinzel(
                                  fontSize: 28,
                                  fontWeight: FontWeight.bold,
                                  color: Colors.amber,
                                  letterSpacing: 2,
                                  shadows: [
                                    Shadow(
                                      color: Colors.amber.withOpacity(0.5),
                                      blurRadius: 10,
                                    ),
                                  ],
                                ),
                              ),

                              const SizedBox(height: 16),

                              // Tier name
                              Container(
                                padding: const EdgeInsets.symmetric(
                                  horizontal: 24,
                                  vertical: 8,
                                ),
                                decoration: BoxDecoration(
                                  gradient: LinearGradient(
                                    colors: [
                                      Colors.purple.withOpacity(0.3),
                                      Colors.amber.withOpacity(0.3),
                                    ],
                                  ),
                                  borderRadius: BorderRadius.circular(30),
                                  border: Border.all(
                                    color: Colors.amber.withOpacity(0.5),
                                    width: 1,
                                  ),
                                ),
                                child: Text(
                                  _tierDisplayName,
                                  style: GoogleFonts.cinzel(
                                    fontSize: 20,
                                    fontWeight: FontWeight.w600,
                                    color: Colors.white,
                                    letterSpacing: 1,
                                  ),
                                ),
                              ),

                              const SizedBox(height: 32),

                              // Thank you message
                              Container(
                                padding: const EdgeInsets.all(24),
                                decoration: BoxDecoration(
                                  color: Colors.white.withOpacity(0.05),
                                  borderRadius: BorderRadius.circular(20),
                                  border: Border.all(
                                    color: Colors.purple.withOpacity(0.3),
                                  ),
                                ),
                                child: Text(
                                  _thankYouMessage,
                                  textAlign: TextAlign.center,
                                  style: GoogleFonts.crimsonText(
                                    fontSize: 18,
                                    color: Colors.white.withOpacity(0.9),
                                    height: 1.6,
                                  ),
                                ),
                              ),

                              const SizedBox(height: 48),

                              // Continue button
                              ElevatedButton(
                                onPressed: () {
                                  Navigator.of(context).popUntil((route) => route.isFirst);
                                },
                                style: ElevatedButton.styleFrom(
                                  backgroundColor: Colors.amber,
                                  foregroundColor: Colors.black,
                                  padding: const EdgeInsets.symmetric(
                                    horizontal: 48,
                                    vertical: 16,
                                  ),
                                  shape: RoundedRectangleBorder(
                                    borderRadius: BorderRadius.circular(30),
                                  ),
                                  elevation: 8,
                                  shadowColor: Colors.amber.withOpacity(0.5),
                                ),
                                child: Row(
                                  mainAxisSize: MainAxisSize.min,
                                  children: [
                                    Text(
                                      'Begin Your Journey',
                                      style: GoogleFonts.cinzel(
                                        fontSize: 16,
                                        fontWeight: FontWeight.bold,
                                        letterSpacing: 1,
                                      ),
                                    ),
                                    const SizedBox(width: 8),
                                    const Icon(Icons.arrow_forward_rounded),
                                  ],
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _Particle {
  double x;
  double y;
  final double size;
  final double speed;
  final double opacity;
  final double hue;

  _Particle({
    required this.x,
    required this.y,
    required this.size,
    required this.speed,
    required this.opacity,
    required this.hue,
  });
}

class _ParticlePainter extends CustomPainter {
  final List<_Particle> particles;
  final double progress;

  _ParticlePainter({required this.particles, required this.progress});

  @override
  void paint(Canvas canvas, Size size) {
    for (final particle in particles) {
      // Update particle position (floating upward)
      final yOffset = (progress * particle.speed * 2) % 1.0;
      final adjustedY = (particle.y - yOffset) % 1.0;

      final paint = Paint()
        ..color = HSLColor.fromAHSL(
          particle.opacity,
          particle.hue,
          0.8,
          0.6,
        ).toColor()
        ..maskFilter = const MaskFilter.blur(BlurStyle.normal, 2);

      canvas.drawCircle(
        Offset(particle.x * size.width, adjustedY * size.height),
        particle.size,
        paint,
      );
    }
  }

  @override
  bool shouldRepaint(covariant _ParticlePainter oldDelegate) {
    return oldDelegate.progress != progress;
  }
}
